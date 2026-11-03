import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { createNativeStore } from './native-store.js';
import { createOfflineApi, validateSnapshot } from './offline-api.js';
import { encryptBackup, decryptBackup } from './backup-crypto.js';

const PortalPrint = registerPlugin('PortalPrint');
const MAX_FILE = 57 * 1024 * 1024;
const IDLE_MS = 15 * 60 * 1000;
let api;
let startupError;
let accountExists = false;
let lastActivity = Date.now();
let hiddenAt = 0;
let modal;
let transientNativeTask = false;
let currentUsername = '';
sessionStorage.removeItem('token_sessao');

function metaGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function metaSet(key, value) { try { localStorage.setItem(key, value); } catch { /* Optional reminder metadata never changes a successful clinical commit. */ } }
function metaDelete(key) { try { localStorage.removeItem(key); } catch { /* Optional metadata. */ } }
async function digest(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

const ready = (async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') throw new Error('Esta versão precisa ser instalada no Android. Os prontuários não são salvos no navegador.');
    const store = await createNativeStore();
    api = createOfflineApi({ store });
    accountExists = await api.hasAccount();
    return api;
})().catch(error => { startupError = error; return null; });

function message(text) {
    if (typeof window.mostrarAviso === 'function') window.mostrarAviso(text);
    else alert(text);
}
function closeModal() {
    modal?.querySelectorAll('input').forEach(input => { input.value = ''; });
    modal?.close(); modal?.remove(); modal = null;
}
function lock() {
    api?.lock();
    sessionStorage.removeItem('token_sessao');
    closeModal();
}
function lockScreen() {
    if (document.querySelector('.tablet-unlock')) return;
    if (!sessionStorage.getItem('token_sessao')) { closeModal(); return; }
    lock();
    document.body.classList.add('tablet-locked');
    const cover = document.createElement('section'); cover.className = 'tablet-unlock';
    const form = document.createElement('form'); form.className = 'tablet-backup-form login-card';
    const heading = document.createElement('h2'); heading.textContent = 'Sessão bloqueada';
    const help = document.createElement('p'); help.textContent = 'Entre novamente para continuar. Os campos que ainda não foram salvos foram mantidos nesta tela enquanto o aplicativo permanecer aberto.';
    form.append(heading, help);
    const username = field(form, 'Usuário', 'text'); username.value = currentUsername;
    const password = field(form, 'Senha de acesso'); password.autocomplete = 'current-password';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const button = document.createElement('button'); button.type = 'submit'; button.className = 'btn-salvar'; button.textContent = 'Desbloquear';
    form.append(status, button); cover.append(form); document.body.append(cover);
    form.addEventListener('submit', async event => {
        event.preventDefault(); button.disabled = true;
        try {
            const response = await api.request('/login', { method: 'POST', body: JSON.stringify({ usuario: username.value.trim(), senha: password.value }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || result.mensagem || 'Não foi possível desbloquear.');
            sessionStorage.setItem('token_sessao', result.token); currentUsername = result.terapeuta.usuario;
            password.value = ''; cover.remove(); document.body.classList.remove('tablet-locked'); lastActivity = Date.now();
        } catch (error) { password.value = ''; status.textContent = error.message; }
        finally { button.disabled = false; }
    });
}
function updateReminder() {
    const host = document.getElementById('tablet-backup-reminder');
    if (!host) return;
    const shared = Number(metaGet('tablet-backup-exported') || 0);
    const checked = metaGet('tablet-backup-checked-digest');
    const changed = Number(metaGet('tablet-last-change') || 0);
    if (!shared) host.textContent = 'Backup pendente: crie uma cópia protegida e guarde fora deste tablet após os atendimentos.';
    else if (changed > shared) host.textContent = 'Há alterações após a última exportação. Faça um novo backup ao terminar os atendimentos.';
    else host.textContent = `Última exportação: ${new Date(shared).toLocaleString('pt-BR')}. Confirme que guardou a cópia fora do tablet.${checked && checked === metaGet('tablet-backup-exported-digest') ? ' Arquivo desta exportação conferido com sucesso.' : ' Use “Conferir backup” para testar a leitura da cópia.'}`;
}
function refreshSetup() {
    const firstRestore = document.getElementById('tablet-first-restore');
    if (firstRestore) firstRestore.hidden = accountExists;
    const link = document.querySelector('#card-login-principal p');
    if (link) {
        link.hidden = accountExists;
        const anchor = link.querySelector('a');
        if (anchor) anchor.textContent = 'Criar conta neste tablet';
    }
    document.getElementById('reg_codigo_convite')?.closest('.form-grupo')?.setAttribute('hidden', '');
    const heading = document.querySelector('#card-registo-terapeuta h2');
    if (heading) heading.textContent = 'Configurar a conta da terapeuta';
}
async function shareFile(data, filename) {
    const file = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    transientNativeTask = true;
    try {
        await Share.share({ title: 'Salvar arquivo do portal', url: file.uri, dialogTitle: 'Escolha onde guardar a cópia' });
    } finally { transientNativeTask = false; }
}
window.TabletApi = {
    async request(path, options = {}) {
        await ready;
        if (startupError) return new Response(JSON.stringify({ erro: startupError.message }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        const response = await api.request(path, options);
        if (response.ok && path === '/login') {
            try { currentUsername = (await response.clone().json()).terapeuta.usuario; } catch { /* Optional label. */ }
        }
        const method = (options.method || 'GET').toUpperCase();
        if (response.ok && ['POST', 'PUT', 'DELETE'].includes(method) && path !== '/login') {
            metaSet('tablet-last-change', String(Date.now()));
            if (path === '/terapeutas') { accountExists = await api.hasAccount(); refreshSetup(); }
            updateReminder();
        }
        return response;
    },
    lock,
    sessionExpired: lockScreen,
    async print(html, title) {
        transientNativeTask = true;
        try { await PortalPrint.print({ html, title: title || 'Documento terapêutico' }); }
        finally { transientNativeTask = false; lastActivity = Date.now(); }
    },
    async shareText(text) {
        transientNativeTask = true;
        try {
            await Share.share({
                title: 'Relatório terapêutico',
                text,
                dialogTitle: 'Escolha onde enviar o relatório'
            });
        } finally { transientNativeTask = false; lastActivity = Date.now(); }
    }
};

// The existing portal builds print documents with DOM/textContent. Keep those
// documents isolated and pass them to Android PrintManager, rather than a popup.
window.open = url => {
    if (url && url !== 'about:blank') { message('Este aplicativo trabalha localmente. Abra links externos no navegador.'); return null; }
    const doc = document.implementation.createHTMLDocument('Documento terapêutico');
    doc.documentElement.lang = 'pt-BR';
    return { document: doc, focus() {}, close() {}, print() {
        window.TabletApi.print(doc.documentElement.outerHTML, doc.title).catch(() => message('Não foi possível abrir a impressão do Android. Tente novamente.'));
    } };
};

function field(form, labelText, type = 'password') {
    const label = document.createElement('label'); label.textContent = labelText;
    const input = document.createElement('input'); input.type = type; input.required = true;
    if (type === 'password') { input.minLength = 12; input.maxLength = 256; input.autocomplete = 'off'; }
    label.append(input); form.append(label); return input;
}
function openBackupDialog(mode) {
    closeModal();
    modal = document.createElement('dialog'); modal.className = 'tablet-dialog';
    modal.addEventListener('cancel', event => { event.preventDefault(); if (!modal?.dataset.busy) closeModal(); });
    const heading = document.createElement('h2');
    heading.textContent = mode === 'export' ? 'Criar backup protegido' : mode === 'check' ? 'Conferir arquivo de backup' : 'Restaurar backup';
    const help = document.createElement('p');
    help.textContent = mode === 'export'
        ? 'Escolha uma senha para proteger esta cópia e guarde-a em local seguro. Sem ela, o backup não pode ser aberto. Guarde o arquivo fora deste tablet: em seu computador, pendrive ou destino privado escolhido por você.'
        : mode === 'check' ? 'Selecione a cópia que você guardou e informe a senha do backup. Esta conferência não altera nenhum prontuário.'
            : 'A restauração substitui todos os registros deste aplicativo pelos registros da cópia escolhida. Se já houver dados, entre na conta e exporte um backup atual antes de continuar.';
    const form = document.createElement('form'); form.className = 'tablet-backup-form';
    let file;
    if (mode !== 'export') { file = field(form, 'Arquivo de backup', 'file'); file.accept = '.ptobackup,application/json'; }
    const password = field(form, 'Senha do backup');
    const confirmation = mode === 'export' ? field(form, 'Repita a senha do backup') : null;
    const accessPassword = mode === 'restore' ? field(form, 'Senha de acesso da terapeuta que está no backup') : null;
    const replacement = mode === 'restore' ? field(form, 'Digite RESTAURAR para confirmar a substituição', 'text') : null;
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const actions = document.createElement('div'); actions.className = 'acoes-formulario';
    const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'btn-salvar'; submit.textContent = mode === 'export' ? 'Criar e escolher destino' : mode === 'check' ? 'Conferir arquivo' : 'Restaurar registros';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn-acao'; cancel.textContent = 'Fechar'; cancel.onclick = closeModal;
    actions.append(submit, cancel); form.append(status, actions); modal.append(heading, help, form); document.body.append(modal); modal.showModal();
    form.addEventListener('submit', async event => {
        event.preventDefault(); submit.disabled = true; cancel.disabled = true; modal.dataset.busy = 'true';
        try {
            await ready; if (startupError) throw startupError;
            if (mode === 'export') {
                if (password.value !== confirmation.value) throw new Error('As senhas do backup não conferem.');
                status.textContent = 'Protegendo a cópia…';
                const snapshot = await api.exportSnapshot();
                const encrypted = await encryptBackup(snapshot, password.value);
                await shareFile(encrypted, `backup-portal-${new Date().toISOString().replace(/[:.]/g, '-')}.ptobackup`);
                metaSet('tablet-backup-exported', String(Date.now()));
                metaSet('tablet-backup-exported-digest', await digest(encrypted));
                status.textContent = 'Arquivo preparado e enviado ao seletor de destino. Confira se concluiu o salvamento fora do tablet; depois use “Conferir backup”.';
                password.value = ''; confirmation.value = '';
            } else {
                const chosen = file.files?.[0];
                if (!chosen || chosen.size > MAX_FILE) throw new Error('Selecione um backup válido com até 57 MB.');
                status.textContent = 'Conferindo senha e integridade do arquivo…';
                const encrypted = await chosen.text();
                const snapshot = await decryptBackup(encrypted, password.value);
                validateSnapshot(snapshot);
                if (mode === 'check') {
                    metaSet('tablet-backup-checked-digest', await digest(encrypted));
                    status.textContent = 'Backup íntegro e legível. A conferência não substitui uma restauração de teste em outro aparelho.';
                } else {
                    if (replacement.value !== 'RESTAURAR') throw new Error('Digite RESTAURAR para confirmar a substituição dos registros.');
                    await api.restoreSnapshot(snapshot, { password: accessPassword.value });
                    metaSet('tablet-last-change', String(Date.now()));
                    for (const key of ['tablet-backup-exported', 'tablet-backup-exported-digest', 'tablet-backup-checked-digest']) metaDelete(key);
                    lock(); window.location.reload(); return;
                }
                password.value = ''; if (accessPassword) accessPassword.value = '';
            }
            updateReminder();
        } catch (error) { status.textContent = error.message || 'Não foi possível concluir. Os dados locais foram preservados.'; }
        finally { submit.disabled = false; cancel.disabled = false; if (modal) delete modal.dataset.busy; }
    });
}

function setupBackupUi() {
    const profile = document.getElementById('sec-perfil');
    const panel = document.createElement('section'); panel.className = 'card';
    const heading = document.createElement('h2'); heading.textContent = 'Backup e proteção dos prontuários';
    const reminder = document.createElement('p'); reminder.id = 'tablet-backup-reminder'; reminder.setAttribute('role', 'status');
    const help = document.createElement('p'); help.textContent = 'Sair da conta mantém os registros. Desinstalar, limpar os dados do aplicativo ou perder o tablet pode apagar a base local. Faça backup após os atendimentos e guarde uma cópia fora deste aparelho. Esta versão não sincroniza pela internet.';
    const actions = document.createElement('div'); actions.className = 'acoes-formulario';
    for (const [label, mode] of [['Criar backup', 'export'], ['Conferir backup', 'check'], ['Restaurar backup', 'restore']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-acao'; button.textContent = label; button.onclick = () => openBackupDialog(mode); actions.append(button);
    }
    const block = document.createElement('button'); block.type = 'button'; block.className = 'btn-acao'; block.textContent = 'Bloquear aplicativo'; block.onclick = lockScreen; actions.append(block);
    panel.append(heading, reminder, help, actions); profile?.prepend(panel);
    const login = document.getElementById('card-login-principal');
    const restore = document.createElement('button'); restore.id = 'tablet-first-restore'; restore.type = 'button'; restore.className = 'btn-acao'; restore.textContent = 'Restaurar backup em tablet novo'; restore.onclick = () => openBackupDialog('restore'); login?.append(restore);
    const badge = document.createElement('button'); badge.type = 'button'; badge.className = 'tablet-local-badge'; badge.textContent = 'Neste tablet · Backup'; badge.onclick = () => { window.mudarTela?.('sec-perfil'); updateReminder(); };
    document.querySelector('.top-bar')?.append(badge);
    updateReminder();
}
window.addEventListener('DOMContentLoaded', async () => {
    setupBackupUi();
    await ready;
    refreshSetup();
    if (startupError) {
        const error = document.createElement('p'); error.className = 'tablet-startup-error'; error.setAttribute('role', 'alert'); error.textContent = startupError.message;
        document.getElementById('tela-login')?.prepend(error);
        document.querySelectorAll('#tela-login button[type=submit]').forEach(button => { button.disabled = true; });
        return;
    }
    await App.addListener('appStateChange', ({ isActive }) => {
        document.body.classList.toggle('tablet-private', !isActive);
        if (!isActive) hiddenAt = Date.now();
        else {
            if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000 && !transientNativeTask) lockScreen();
            hiddenAt = 0; lastActivity = Date.now();
        }
    });
    for (const event of ['pointerdown', 'keydown', 'input', 'scroll']) document.addEventListener(event, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
    setInterval(() => { if (!transientNativeTask && !document.hidden && Date.now() - lastActivity >= IDLE_MS) lockScreen(); }, 15000);
});
