// Local-only API compatibility layer. No fetch, sockets or remote data transfer.
const SENSORIAL = 'contato_visual comunicacao_alternativa expressiva_linguagem receptiva_linguagem atencao_conjunta comportamento_exploratorio combinacoes uso_lapis higiene_pessoal vestuario uso_banheiro alimentacao motor_global motor_fino interacao_objetos interacao_bola resposta_emocional imitacoes tolerancia brincar'.split(' ');
const RODA = 'vida_social contribuicao familia recursos_financeiros profissional amoroso criatividade_hobbies plenitude_realizacao equilibrio_emocional espiritualidade saude_disposicao desenvolvimento_pessoal'.split(' ');
const COLLECTIONS = {
  agenda: { fields: 'data_hora status observacoes', date: 'data_hora' },
  anamnese: { fields: 'data_avaliacao historico_medico_desenvolvimento historico_educacional historico_terapeutico', date: 'data_avaliacao' },
  perfil_ocupacional: { fields: 'data_avaliacao ambiental pessoal ocupacoes padroes_desempenho habilidade_interacao fatores_cliente desafios_participacao observacoes_finais coisas_irritam coisas_gosto como_comunico', date: 'data_avaliacao' },
  pedi_autocuidado: { fields: 'data_avaliacao respostas escore_total', date: 'data_avaliacao', json: ['respostas'] },
  avaliacao_sensorial: { fields: ['data_avaliacao', ...SENSORIAL].join(' '), date: 'data_avaliacao' },
  copm_metas: { fields: 'data_avaliacao atividade_problema nivel_importancia desempenho_inicial satisfacao_inicial desempenho_reavaliacao satisfacao_reavaliacao', date: 'data_avaliacao' },
  programacao_terapeutica: { fields: 'terapeuta_responsavel supervisora programa objetivos data_registro tentativas alcancado', date: 'data_registro' },
  plano_intervencao: { fields: 'data_registro profissional_responsavel itens', date: 'data_registro', json: ['itens'] },
  evolucao_terapeutica: { fields: 'data_registro profissional especialidade duracao horario programa_terapeutico objetivo evolucao desempenho reforcadores intercorrencias conduta devolutiva', date: 'data_registro' },
  roda_vida: { fields: ['data_avaliacao', ...RODA, 'observacoes'].join(' '), date: 'data_avaliacao' },
  ficha_observacao: { fields: 'data_atendimento atendimento_num idade duracao terapeuta checkboxes obs_1 obs_2 obs_3 obs_4 obs_5 obs_6 obs_7 orientacoes_cuidador sintese_desempenho sintese_faixa_etaria sintese_acompanhar sintese_conduta sintese_encaminhamento', date: 'data_atendimento', json: ['checkboxes'] },
  relatorios_convenio: { fields: 'periodo_inicio periodo_fim conteudo criado_em' },
};
const ROUTES = { ...Object.fromEntries(Object.keys(COLLECTIONS).map(k => [k, k])), copm: 'copm_metas', programacao: 'programacao_terapeutica' };
delete ROUTES.copm_metas; delete ROUTES.programacao_terapeutica;
const TABLES = ['terapeutas', 'pacientes', ...Object.keys(COLLECTIONS), 'copm_reavaliacao_sessoes', 'copm_reavaliacao_itens'];
const SCHEMA = {
  terapeutas: 'id nome usuario senha crefito foto_perfil',
  pacientes: 'id terapeuta_id nome data_nascimento diagnostico responsavel telefone',
  ...Object.fromEntries(Object.entries(COLLECTIONS).map(([k, d]) => [k, 'id paciente_id ' + d.fields])),
  copm_reavaliacao_sessoes: 'id paciente_id data_avaliacao_base data_reavaliacao observacoes legado criado_em',
  copm_reavaliacao_itens: 'id sessao_id copm_meta_id atividade_problema nivel_importancia desempenho_inicial satisfacao_inicial reavaliacao_desempenho reavaliacao_satisfacao observacao_item',
};
const clone = value => JSON.parse(JSON.stringify(value));
const positiveId = value => Number.isSafeInteger(value) && value > 0;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isoTime = () => { const d = new Date(); return `${localDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; };
const publicTherapist = row => { const { senha, ...publicRow } = row; return clone(publicRow); };
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
function requireDate(value, label = 'Data') { if (!validDate(value)) fail(`${label} inválida.`); }
function validDateTime(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value) && validDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && (!value.slice(17) || Number(value.slice(17)) < 60); }
function score(value, label) { const n = Number(value); if (!['string', 'number'].includes(typeof value) || !Number.isInteger(n) || n < 1 || n > 10) fail(`${label}: informe uma nota inteira de 1 a 10.`); return n; }
function text(value, max, label, required = false) { if (value === null || value === undefined) { if (required) fail(`${label} é obrigatório.`); return null; } if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`${label} inválido.`); return required ? value.trim() : value; }
function jsonField(value) { if (value === null || value === undefined) return null; if (typeof value === 'string') { try { JSON.parse(value); } catch { fail('Conteúdo estruturado inválido.'); } return value; } return JSON.stringify(value); }
function validateClinical(table, data) {
  const def = COLLECTIONS[table];
  if (def?.date) {
    if (def.date === 'data_hora') { if (!validDateTime(data[def.date])) fail('Data e hora inválidas.'); }
    else requireDate(data[def.date]);
  }
  if (table === 'avaliacao_sensorial') SENSORIAL.forEach(k => { data[k] = score(data[k], 'Habilidade sensorial'); });
  if (table === 'roda_vida') RODA.forEach(k => { data[k] = score(data[k], 'Área da Roda da Vida'); });
  if (table === 'copm_metas') {
    data.atividade_problema = text(data.atividade_problema, 255, 'Problema ocupacional', true);
    for (const k of ['nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial']) data[k] = score(data[k], 'COPM');
    for (const k of ['desempenho_reavaliacao', 'satisfacao_reavaliacao']) data[k] = data[k] === '' || data[k] === null || data[k] === undefined ? null : score(data[k], 'COPM');
  }
  if (table === 'pedi_autocuidado') {
    const respostas = typeof data.respostas === 'string' ? JSON.parse(data.respostas) : data.respostas;
    if (!Array.isArray(respostas?.itens) || respostas.itens.length !== 73 || respostas.itens.some(item => ![0, 1, '0', '1'].includes(item?.resposta))) fail('A avaliação PEDI precisa conter os 73 itens preenchidos como 0 ou 1.');
    data.escore_total = respostas.itens.reduce((sum, item) => sum + Number(item.resposta), 0);
  }
  if (table === 'relatorios_convenio') {
    text(data.conteudo, 700 * 1024, 'Conteúdo do relatório', true);
    if (data.periodo_inicio) requireDate(data.periodo_inicio);
    if (data.periodo_fim) requireDate(data.periodo_fim);
    if (data.periodo_inicio && data.periodo_fim && data.periodo_inicio > data.periodo_fim) fail('O período do relatório está invertido.');
  }
}

export function createEmptyState() { return { version: 1, sequences: Object.fromEntries(TABLES.map(k => [k, 0])), ...Object.fromEntries(TABLES.map(k => [k, []])) }; }

/** Validate before replacing any data; reject unknown versions, fields and broken relations. */
export function validateSnapshot(snapshot) {
  if (!snapshot || Array.isArray(snapshot) || snapshot.version !== 1 || Object.keys(snapshot).some(k => !['version', 'sequences', ...TABLES].includes(k))) fail('Formato de backup não reconhecido.');
  if (JSON.stringify(snapshot).length > 100 * 1024 * 1024) fail('Backup excede o limite de 100 MB.');
  for (const table of TABLES) {
    const rows = snapshot[table];
    if (!Array.isArray(rows) || rows.length > 100000) fail(`Coleção inválida no backup: ${table}.`);
    const ids = new Set(); const allowed = new Set(SCHEMA[table].split(' '));
    for (const row of rows) {
      if (!row || Array.isArray(row) || typeof row !== 'object' || !positiveId(row.id) || ids.has(row.id)) fail(`Registro inválido no backup: ${table}.`);
      ids.add(row.id);
      for (const [key, value] of Object.entries(row)) {
        if (!allowed.has(key) || (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > 1024 * 1024)) fail(`Campo inválido no backup: ${table}.`);
      }
    }
  }
  if (snapshot.terapeutas.length > 1 || (snapshot.terapeutas.length === 0 && TABLES.some(k => snapshot[k].length))) fail('Este aplicativo aceita uma conta profissional por tablet.');
  const therapist = snapshot.terapeutas[0];
  if (therapist) {
    text(therapist.nome, 150, 'Nome', true); text(therapist.usuario, 50, 'Usuário', true);
    text(therapist.crefito, 50, 'CREFITO');
    if (!/^pbkdf2\$(600000|[6-9]\d{5}|1\d{6}|2000000)\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(therapist.senha || '')) fail('Credencial do backup inválida.');
    validatePhoto(therapist.foto_perfil ?? null);
  }
  const patients = new Map(snapshot.pacientes.map(p => [p.id, p]));
  for (const p of patients.values()) {
    if (p.terapeuta_id !== therapist?.id) fail('Paciente sem profissional responsável no backup.');
    text(p.nome, 150, 'Nome do paciente', true);
    if (p.data_nascimento) requireDate(p.data_nascimento, 'Nascimento');
  }
  for (const table of [...Object.keys(COLLECTIONS), 'copm_reavaliacao_sessoes']) {
    for (const row of snapshot[table]) {
      if (!positiveId(row.paciente_id) || !patients.has(row.paciente_id)) fail('Registro clínico sem paciente no backup.');
      if (COLLECTIONS[table]) validateClinical(table, clone(row));
      else { requireDate(row.data_avaliacao_base); requireDate(row.data_reavaliacao); if (row.data_reavaliacao < row.data_avaliacao_base) fail('Reavaliação com datas inválidas.'); }
    }
  }
  const sessions = new Map(snapshot.copm_reavaliacao_sessoes.map(s => [s.id, s]));
  for (const item of snapshot.copm_reavaliacao_itens) {
    if (!positiveId(item.sessao_id) || !sessions.has(item.sessao_id)) fail('Item de reavaliação sem sessão no backup.');
    for (const key of ['nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial', 'reavaliacao_desempenho', 'reavaliacao_satisfacao']) score(item[key], 'Reavaliação');
    text(item.atividade_problema, 255, 'Problema ocupacional', true);
    if (item.copm_meta_id !== null && !positiveId(item.copm_meta_id)) fail('Referência COPM inválida.');
    const base = snapshot.copm_metas.find(m => m.id === item.copm_meta_id);
    const session = sessions.get(item.sessao_id);
    if (base && base.paciente_id !== session.paciente_id) fail('Referência COPM aponta para outro paciente.');
  }
  for (const session of sessions.values()) {
    const items = snapshot.copm_reavaliacao_itens.filter(i => i.sessao_id === session.id);
    if (!items.length || items.length > 5 || new Set(items.map(i => i.copm_meta_id)).size !== items.length) fail('Itens de reavaliação inválidos no backup.');
  }
  const normalized = clone(snapshot);
  if (normalized.sequences !== undefined && (!normalized.sequences || Array.isArray(normalized.sequences) || typeof normalized.sequences !== 'object' || Object.keys(normalized.sequences).some(k => !TABLES.includes(k)))) fail('Sequências inválidas no backup.');
  normalized.sequences ||= {};
  for (const table of TABLES) {
    let largest = snapshot[table].reduce((max, r) => Math.max(max, r.id), 0);
    if (table === 'copm_metas') largest = snapshot.copm_reavaliacao_itens.reduce((max, r) => Math.max(max, r.copm_meta_id || 0), largest);
    const sequence = normalized.sequences[table];
    if (sequence !== undefined && (!Number.isSafeInteger(sequence) || sequence < largest || sequence < 0 || sequence >= Number.MAX_SAFE_INTEGER)) fail('Sequência de registros inválida no backup.');
    normalized.sequences[table] = sequence ?? largest;
  }
  return normalized;
}

function validatePhoto(photo) { if (photo !== null && (typeof photo !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo) || photo.length > 820000)) fail('Foto de perfil inválida ou muito grande.'); }
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => Uint8Array.from(s.match(/../g) || [], b => parseInt(b, 16));
const PASSWORD_ITERATIONS = 600000;
async function hashPassword(password, cryptoProvider, suppliedSalt, iterations = PASSWORD_ITERATIONS) {
  const salt = suppliedSalt || cryptoProvider.getRandomValues(new Uint8Array(16));
  const key = await cryptoProvider.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await cryptoProvider.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(bits)}`;
}
async function verifyPassword(password, hash, cryptoProvider) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const parts = hash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const computed = await hashPassword(password, cryptoProvider, unhex(parts[2]), Number(parts[1]));
  let diff = computed.length ^ hash.length; for (let i = 0; i < hash.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
function validateNewPassword(password) { if (typeof password !== 'string' || password.length < 12 || password.length > 256) fail('A senha deve ter entre 12 e 256 caracteres.'); }

export function createOfflineApi({ store, cryptoProvider = globalThis.crypto }) {
  if (!store?.load || !store?.save || !cryptoProvider?.subtle) throw new Error('Armazenamento seguro indisponível.');
  let state; let activeToken = null; let activeUser = null; let queue = Promise.resolve(); let failures = 0; let blockedUntil = 0; let sessionEpoch = 0;
  const serialized = task => { const next = queue.then(task); queue = next.catch(() => {}); return next; };
  const load = async () => { if (!state) { const saved = await store.load(); state = saved === null || saved === undefined ? createEmptyState() : validateSnapshot(saved); } return state; };
  const save = async (next, expectedEpoch) => { const valid = validateSnapshot(next); if (expectedEpoch !== undefined && expectedEpoch !== sessionEpoch) fail('Sessão bloqueada. Entre novamente.', 401); await store.save(clone(valid)); state = valid; };
  const lock = () => { sessionEpoch++; activeToken = null; activeUser = null; };
  const account = () => state.terapeutas.find(t => t.id === activeUser);
  const requireAuth = headers => { const supplied = new Headers(headers || {}).get('Authorization'); if (!activeToken || supplied !== `Bearer ${activeToken}` || !account()) fail('Sessão bloqueada. Entre novamente.', 401); };
  const requireActive = () => { if (!activeToken || !account()) fail('Entre no aplicativo antes de continuar.', 401); };
  const patient = (s, id) => { const p = s.pacientes.find(p => p.id === Number(id) && p.terapeuta_id === activeUser); if (!p) fail('Paciente não encontrado nesta conta.', 404); return p; };
  const nextId = (s, table) => { const id = s.sequences[table] + 1; if (!positiveId(id)) fail('Limite de registros atingido.'); s.sequences[table] = id; return id; };
  const insert = (s, table, data) => { const row = { ...data, id: nextId(s, table) }; s[table].push(row); return row; };
  const withName = (s, row) => ({ ...row, paciente_nome: patient(s, row.paciente_id).nome });
  const visible = (s, table, query) => s[table].filter(row => s.pacientes.some(p => p.id === row.paciente_id && p.terapeuta_id === activeUser) && (!query.get('paciente_id') || row.paciente_id === Number(query.get('paciente_id'))));
  async function dispatch(path, opts = {}) {
    await load();
    const expectedEpoch = sessionEpoch;
    const url = new URL(path, 'https://tablet.local'); const method = String(opts.method || 'GET').toUpperCase();
    if (!path.startsWith('/') || url.origin !== 'https://tablet.local') fail('Endereço não permitido.', 400);
    let body = {}; if (opts.body) { try { body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body; } catch { fail('Dados inválidos.'); } }
    if (!body || Array.isArray(body) || typeof body !== 'object') fail('Dados inválidos.');
    const segments = url.pathname.split('/').filter(Boolean); const route = segments[0]; const id = Number(segments[1]);
    if (method === 'POST' && route === 'terapeutas' && segments.length === 1) {
      if (state.terapeutas.length) fail('Já existe uma conta neste tablet. Entre com ela ou restaure um backup.', 409);
      validateNewPassword(body.senha);
      const row = { id: 1, nome: text(body.nome, 150, 'Nome', true), usuario: text(body.usuario, 50, 'Usuário', true), crefito: text(body.crefito, 50, 'CREFITO'), foto_perfil: null, senha: await hashPassword(body.senha, cryptoProvider) };
      const next = clone(state); next.terapeutas.push(row); next.sequences.terapeutas = 1; await save(next, expectedEpoch); return { id: row.id };
    }
    if (method === 'POST' && route === 'login' && segments.length === 1) {
      if (Date.now() < blockedUntil) fail('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429);
      const user = state.terapeutas.find(t => t.usuario === body.usuario);
      if (!user || !(await verifyPassword(body.senha, user.senha, cryptoProvider))) { failures++; if (failures >= 10) { blockedUntil = Date.now() + 15 * 60 * 1000; failures = 0; } fail('Credenciais inválidas.', 401); }
      if (expectedEpoch !== sessionEpoch) fail('Sessão bloqueada. Entre novamente.', 401);
      failures = 0; activeUser = user.id; activeToken = hex(cryptoProvider.getRandomValues(new Uint8Array(32))); return { sucesso: true, token: activeToken, terapeuta: publicTherapist(user) };
    }
    requireAuth(opts.headers);
    if (route === 'sessao') {
      if (method === 'GET' && segments.length === 1) return { terapeuta: publicTherapist(account()) };
      if (method === 'PUT' && segments[1] === 'foto' && segments.length === 2) { validatePhoto(body.foto_perfil); const next = clone(state); next.terapeutas[0].foto_perfil = body.foto_perfil; await save(next, expectedEpoch); return { foto_perfil: body.foto_perfil }; }
      if (method === 'PUT' && segments[1] === 'senha' && segments.length === 2) { validateNewPassword(body.senha_nova); if (body.senha_atual === body.senha_nova) fail('A nova senha precisa ser diferente da atual.'); if (!(await verifyPassword(body.senha_atual, account().senha, cryptoProvider))) fail('A senha atual está incorreta.', 401); const next = clone(state); next.terapeutas[0].senha = await hashPassword(body.senha_nova, cryptoProvider); await save(next, expectedEpoch); lock(); return { sucesso: true, mensagem: 'Senha alterada. Entre novamente.' }; }
    }
    if (route === 'dashboard-resumo' && method === 'GET' && segments.length === 1) return { total_pacientes: state.pacientes.filter(p => p.terapeuta_id === activeUser).length, consultas_hoje: visible(state, 'agenda', new URLSearchParams()).filter(r => r.data_hora.slice(0, 10) === localDate()).map(r => withName(state, r)).sort((a,b) => a.data_hora.localeCompare(b.data_hora)) };
    if (route === 'pacientes') {
      if (method === 'GET' && segments.length === 1) return clone(state.pacientes.filter(p => p.terapeuta_id === activeUser).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      if ((method === 'POST' && segments.length === 1) || (method === 'PUT' && segments.length === 2)) {
        if (method === 'PUT') patient(state, id);
        const data = { terapeuta_id: activeUser, nome: text(body.nome, 150, 'Nome do paciente', true), data_nascimento: body.data_nascimento || null, diagnostico: text(body.diagnostico, 65000, 'Diagnóstico'), responsavel: text(body.responsavel, 255, 'Responsável'), telefone: text(body.telefone, 100, 'Telefone') };
        if (data.data_nascimento) requireDate(data.data_nascimento, 'Nascimento');
        const next = clone(state); if (method === 'PUT') Object.assign(patient(next, id), data); else insert(next, 'pacientes', data); await save(next, expectedEpoch); return method === 'PUT' ? { atualizado: true } : { id: next.pacientes.at(-1).id };
      }
      if (method === 'DELETE' && segments.length === 2) { patient(state, id); if ([...Object.keys(COLLECTIONS), 'copm_reavaliacao_sessoes'].some(k => state[k].some(r => r.paciente_id === id))) fail('Este paciente possui registros clínicos. A exclusão está bloqueada para preservar o prontuário.', 409); const next = clone(state); next.pacientes = next.pacientes.filter(p => p.id !== id); await save(next, expectedEpoch); return { removido: 1 }; }
    }
    if (route === 'copm' && segments[1] === 'reavaliacoes' && segments.length === 2) {
      if (method === 'GET') return visible(state, 'copm_reavaliacao_sessoes', url.searchParams).sort((a,b) => b.data_reavaliacao.localeCompare(a.data_reavaliacao) || b.id - a.id).flatMap(s => state.copm_reavaliacao_itens.filter(i => i.sessao_id === s.id).map(i => ({ ...withName(state, s), id: undefined, sessao_id: s.id, observacoes_sessao: s.observacoes, ...i, item_id: i.id })));
      if (method === 'POST') {
        patient(state, body.paciente_id); requireDate(body.data_avaliacao_base); requireDate(body.data_reavaliacao);
        if (body.data_reavaliacao < body.data_avaliacao_base) fail('A reavaliação não pode ser anterior à avaliação inicial.');
        if (!Array.isArray(body.itens) || !body.itens.length || body.itens.length > 5 || new Set(body.itens.map(i => Number(i.copm_meta_id))).size !== body.itens.length) fail('Reavalie de 1 a 5 problemas diferentes.');
        const metas = body.itens.map(item => { const meta = state.copm_metas.find(m => m.id === Number(item.copm_meta_id) && m.paciente_id === Number(body.paciente_id) && m.data_avaliacao === body.data_avaliacao_base); if (!meta) fail('Um problema não pertence à avaliação inicial selecionada.'); return { meta, item }; });
        const next = clone(state); const session = insert(next, 'copm_reavaliacao_sessoes', { paciente_id: Number(body.paciente_id), data_avaliacao_base: body.data_avaliacao_base, data_reavaliacao: body.data_reavaliacao, observacoes: null, legado: null, criado_em: isoTime() });
        for (const { meta, item } of metas) insert(next, 'copm_reavaliacao_itens', { sessao_id: session.id, copm_meta_id: meta.id, atividade_problema: meta.atividade_problema, nivel_importancia: meta.nivel_importancia, desempenho_inicial: meta.desempenho_inicial, satisfacao_inicial: meta.satisfacao_inicial, reavaliacao_desempenho: score(item.desempenho, 'Desempenho'), reavaliacao_satisfacao: score(item.satisfacao, 'Satisfação'), observacao_item: text(item.observacao, 65000, 'Observação') });
        await save(next, expectedEpoch); return { id: session.id, quantidade: metas.length };
      }
    }
    if (['copm', 'programacao'].includes(route) && segments[1] === 'lote' && method === 'POST') {
      patient(state, body.paciente_id); if (!Array.isArray(body.itens)) fail('Linhas inválidas.');
      const isCopm = route === 'copm'; const table = ROUTES[route]; const rows = body.itens.filter(r => isCopm ? String(r.atividade_problema || '').trim() : String(r.programa || '').trim() || String(r.objetivos || '').trim());
      if (!rows.length || (isCopm && rows.length > 5) || rows.length > 1000) fail('Quantidade de linhas inválida.');
      if (isCopm) requireDate(body.data_avaliacao);
      if (isCopm && new Set(rows.filter(r => r.id).map(r => Number(r.id))).size !== rows.filter(r => r.id).length) fail('Há linhas COPM duplicadas.');
      const next = clone(state); const ids = [];
      for (const row of rows) {
        const data = isCopm ? { ...row, paciente_id: body.paciente_id, data_avaliacao: body.data_avaliacao } : { ...row, paciente_id: body.paciente_id, terapeuta_responsavel: body.terapeuta_responsavel || null, supervisora: body.supervisora || null };
        const normalized = normalizeClinical(table, data);
        if (isCopm && row.id) { const found = next[table].find(r => r.id === Number(row.id) && r.paciente_id === Number(body.paciente_id)); if (!found) fail('Uma linha COPM não pertence a este paciente.', 404); Object.assign(found, normalized); ids.push(found.id); }
        else ids.push(insert(next, table, normalized).id);
      }
      await save(next, expectedEpoch); return { ids };
    }
    const table = ROUTES[route];
    if (table) {
      if (method === 'GET' && segments.length === 1) return visible(state, table, url.searchParams).map(row => withName(state, row)).sort((a,b) => table === 'agenda' ? b.data_hora.localeCompare(a.data_hora) : b.id - a.id);
      if (table === 'relatorios_convenio' && method === 'GET' && segments.length === 2) { const row = visible(state, table, url.searchParams).find(r => r.id === id); if (!row) fail('Relatório não encontrado.', 404); return withName(state, row); }
      if (method === 'POST' && segments.length === 1) { patient(state, body.paciente_id); const data = normalizeClinical(table, body); if (table === 'relatorios_convenio') data.criado_em = isoTime(); const next = clone(state); const row = insert(next, table, data); await save(next, expectedEpoch); return { id: row.id }; }
      if (method === 'PUT' && table === 'agenda' && segments[2] === 'status' && segments.length === 3) { const next = clone(state); const row = visible(next, table, url.searchParams).find(r => r.id === id); if (!row) fail('Consulta não encontrada.', 404); row.status = text(body.status, 50, 'Status', true); await save(next, expectedEpoch); return { atualizado: 1 }; }
      if (method === 'PUT' && table === 'copm_metas' && segments.length === 2) { const next = clone(state); const row = visible(next, table, url.searchParams).find(r => r.id === id); if (!row) fail('Registro COPM não encontrado.', 404); Object.assign(row, normalizeClinical(table, { ...body, paciente_id: row.paciente_id })); await save(next, expectedEpoch); return { atualizado: true }; }
      if (method === 'DELETE' && segments.length === 2 && table !== 'relatorios_convenio') { const row = visible(state, table, url.searchParams).find(r => r.id === id); if (!row) fail('Registro não encontrado nesta conta.', 404); const next = clone(state); next[table] = next[table].filter(r => r.id !== id); await save(next, expectedEpoch); return { removido: 1 }; }
    }
    fail('Esta operação não está disponível no aplicativo.', 404);
  }
  function normalizeClinical(table, body) {
    const def = COLLECTIONS[table]; const data = { paciente_id: Number(body.paciente_id) };
    for (const field of def.fields.split(' ')) { let value = body[field] ?? null; if (value !== null && !['string', 'number', 'boolean'].includes(typeof value) && !(def.json || []).includes(field)) fail('Valor inválido no formulário.'); data[field] = (def.json || []).includes(field) ? jsonField(value) : value; }
    if (table === 'agenda') { data.data_hora = String(data.data_hora || '').replace('T', ' '); data.status ||= 'Agendado'; }
    validateClinical(table, data); return data;
  }
  return {
    request: (path, opts = {}) => serialized(async () => { try { const data = await dispatch(path, opts); return Response.json(data, { status: String(opts.method || 'GET').toUpperCase() === 'POST' && !path.startsWith('/login') ? 201 : 200 }); } catch (error) { const status = error.status || 500; return Response.json({ erro: status === 500 ? 'Não foi possível salvar ou carregar os dados locais. Nenhuma alteração foi confirmada.' : error.message }, { status }); } }),
    lock,
    hasAccount: () => serialized(async () => { await load(); return state.terapeutas.length > 0; }),
    exportSnapshot: () => serialized(async () => { await load(); requireActive(); return validateSnapshot(state); }),
    restoreSnapshot: (snapshot, { password } = {}) => serialized(async () => { await load(); const expectedEpoch = sessionEpoch; if (state.terapeutas.length) requireActive(); const valid = validateSnapshot(snapshot); if (valid.terapeutas.length !== 1 || !(await verifyPassword(password, valid.terapeutas[0].senha, cryptoProvider))) fail('A senha da conta presente no backup está incorreta.', 401); await save(valid, expectedEpoch); lock(); return { restored: true }; }),
  };
}

