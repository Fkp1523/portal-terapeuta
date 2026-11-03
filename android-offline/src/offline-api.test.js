import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineApi, createEmptyState, validateSnapshot } from './offline-api.js';

const PASSWORD = 'uma senha de teste longa 2026';
let cleanAccount;
const copy = value => structuredClone(value);
function storage(initial = null) {
  let saved = initial && copy(initial); let failed = false;
  return { async load() { return copy(saved); }, async save(state) { if (failed) throw new Error('disk full'); saved = copy(state); }, get value() { return copy(saved); }, set fail(value) { failed = value; } };
}
async function send(api, path, method = 'GET', body, token) { const res = await api.request(path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: res.status, data: await res.json() }; }
async function setup(initial = cleanAccount) { const store = storage(initial); const api = createOfflineApi({ store }); const login = await send(api, '/login', 'POST', { usuario: 'terapeuta', senha: PASSWORD }); assert.equal(login.status, 200); return { store, api, token: login.data.token, call: (path, method = 'GET', body) => send(api, path, method, body, login.data.token) }; }
async function patient(f, name = 'Paciente de teste') { const r = await f.call('/pacientes', 'POST', { nome: name, data_nascimento: '2018-10-20' }); assert.equal(r.status, 201); return r.data.id; }
before(async () => { const store = storage(); const api = createOfflineApi({ store }); const created = await send(api, '/terapeutas', 'POST', { nome: 'Terapeuta de teste', usuario: 'terapeuta', crefito: 'TESTE', senha: PASSWORD }); assert.equal(created.status, 201); cleanAccount = store.value; });

test('first account uses a derived password, no default admin alias or second account', async () => {
  assert.match(cleanAccount.terapeutas[0].senha, /^pbkdf2\$600000\$/); assert.ok(!JSON.stringify(cleanAccount).includes(PASSWORD));
  const f = await setup(); assert.equal((await send(f.api, '/login', 'POST', { usuario: 'admin', senha: 'admin' })).status, 401);
  assert.equal((await f.call('/terapeutas', 'POST', { nome: 'Outra', usuario: 'outra', senha: PASSWORD })).status, 409);
  assert.equal((await send(f.api, '/pacientes')).status, 401);
});

test('failed durable save never appears as success or changes memory; retry remains safe', async () => {
  const f = await setup(); f.store.fail = true;
  assert.equal((await f.call('/pacientes', 'POST', { nome: 'Não deve persistir' })).status, 500);
  assert.deepEqual((await f.call('/pacientes')).data, []); assert.deepEqual(f.store.value.pacientes, []);
  f.store.fail = false; assert.equal(await patient(f), 1);
});

test('patient ownership and invalid IDs are enforced on every collection', async () => {
  const f = await setup(); await patient(f);
  assert.equal((await f.call('/agenda', 'POST', { paciente_id: 999, data_hora: '2026-11-01T10:00' })).status, 404);
  assert.equal((await f.call('/copm/lote', 'POST', { paciente_id: 999, data_avaliacao: '2026-11-01', itens: [{ atividade_problema: 'A', nivel_importancia: 5, desempenho_inicial: 3, satisfacao_inicial: 4 }] })).status, 404);
  assert.equal((await f.call('/pacientes/999', 'PUT', { nome: 'Outro' })).status, 404);
  assert.equal((await f.call('/agenda?paciente_id=999')).data.length, 0);
});

test('all clinical forms persist locally, JSON fields roundtrip, dashboard today is an array', async () => {
  const f = await setup(); const id = await patient(f);
  const today = new Date(); const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const cases = [
    ['/agenda', { data_hora: `${date}T10:00`, observacoes: 'Consulta' }],
    ['/anamnese', { data_avaliacao: date, historico_medico_desenvolvimento: 'História' }],
    ['/perfil_ocupacional', { data_avaliacao: date, ocupacoes: 'Atividades' }],
    ['/evolucao_terapeutica', { data_registro: date, evolucao: 'Evolução clínica' }],
    ['/ficha_observacao', { data_atendimento: date, checkboxes: { brincar: true }, obs_1: 'Observação' }],
    ['/plano_intervencao', { data_registro: date, itens: [{ objetivo: 'Vestir' }] }],
    ['/pedi_autocuidado', { data_avaliacao: date, respostas: { itens: Array.from({length:73}, (_,i) => ({resposta:i%2})) } }],
    ['/avaliacao_sensorial', { data_avaliacao: date, ...Object.fromEntries('contato_visual comunicacao_alternativa expressiva_linguagem receptiva_linguagem atencao_conjunta comportamento_exploratorio combinacoes uso_lapis higiene_pessoal vestuario uso_banheiro alimentacao motor_global motor_fino interacao_objetos interacao_bola resposta_emocional imitacoes tolerancia brincar'.split(' ').map(k=>[k,5])) }],
    ['/roda_vida', { data_avaliacao: date, ...Object.fromEntries('vida_social contribuicao familia recursos_financeiros profissional amoroso criatividade_hobbies plenitude_realizacao equilibrio_emocional espiritualidade saude_disposicao desenvolvimento_pessoal'.split(' ').map(k=>[k,5])) }],
    ['/relatorios_convenio', { periodo_inicio: date, periodo_fim: date, conteudo: 'Relatório' }],
  ];
  for (const [path, data] of cases) { const r = await f.call(path, 'POST', { paciente_id: id, ...data }); assert.equal(r.status, 201, `${path}: ${JSON.stringify(r.data)}`); const listed = await f.call(path); assert.equal(listed.data[0].paciente_nome, 'Paciente de teste'); }
  const pedi = (await f.call('/pedi_autocuidado')).data[0]; assert.equal(pedi.escore_total, 36); assert.equal(JSON.parse(pedi.respostas).itens.length, 73);
  const dashboard = (await f.call('/dashboard-resumo')).data; assert.equal(dashboard.total_pacientes, 1); assert.equal(dashboard.consultas_hoje.length, 1);
  assert.equal((await f.call('/pacientes/1', 'DELETE')).status, 409);
  assert.equal((await f.call('/agenda/1/status', 'PUT', {status:'Realizado'})).status, 200);
  assert.equal((await f.call('/agenda')).data[0].status, 'Realizado');
  assert.equal((await f.call('/ficha_observacao/1', 'DELETE')).status, 200);
});

test('COPM snapshots survive edits, deletes, new assessment, app reload and backup restore; IDs never reused', async () => {
  const f = await setup(); const id = await patient(f);
  const base = { paciente_id: id, data_avaliacao: '2026-11-01', itens: [{ atividade_problema: 'Vestir', nivel_importancia: 9, desempenho_inicial: 3, satisfacao_inicial: 2 }] };
  const saved = await f.call('/copm/lote', 'POST', base); assert.deepEqual(saved.data.ids, [1]);
  const evalData = { paciente_id: id, data_avaliacao_base: '2026-11-01', data_reavaliacao: '2026-11-02', itens: [{ copm_meta_id: 1, desempenho: 5, satisfacao: 6, observacao: 'Primeira' }] };
  assert.equal((await f.call('/copm/reavaliacoes', 'POST', evalData)).status, 201);
  assert.equal((await f.call('/copm/reavaliacoes', 'POST', {...evalData, data_reavaliacao:'2026-11-03'})).status, 201);
  assert.equal((await f.call('/copm/1', 'PUT', { ...base.itens[0], data_avaliacao:'2026-11-04', atividade_problema:'Alterada', desempenho_inicial:7, satisfacao_inicial:8 })).status, 200);
  const history = (await f.call('/copm/reavaliacoes?paciente_id=1')).data;
  assert.equal(history.length, 2); assert.equal(history[0].atividade_problema, 'Vestir'); assert.equal(history[0].desempenho_inicial, 3); assert.equal(history[0].reavaliacao_desempenho, 5); assert.equal(history[0].data_avaliacao_base, '2026-11-01');
  assert.equal((await f.call('/copm/1', 'DELETE')).status, 200);
  const reloaded = await setup(f.store.value); const next = await reloaded.call('/copm/lote', 'POST', base); assert.deepEqual(next.data.ids, [2]);
  assert.equal((await reloaded.call('/copm/reavaliacoes')).data[0].copm_meta_id, 1);
  const backup = await reloaded.api.exportSnapshot(); const restoredStore = storage(); const restoredApi = createOfflineApi({store:restoredStore});
  await restoredApi.restoreSnapshot(backup, {password:PASSWORD}); const restored = await setup(restoredStore.value);
  await restored.call('/copm/2','DELETE'); const third = await restored.call('/copm/lote','POST',base); assert.deepEqual(third.data.ids,[3]);
  assert.equal((await restored.call('/copm/reavaliacoes')).data.length,2);
});

test('COPM batch rejects cross-patient updates and fails all-or-nothing', async () => {
  const f = await setup(); const first = await patient(f); const second = await patient(f, 'Outro');
  const item = { atividade_problema:'A', nivel_importancia:5, desempenho_inicial:3, satisfacao_inicial:4 };
  await f.call('/copm/lote','POST',{paciente_id:first,data_avaliacao:'2026-11-01',itens:[item]});
  const r = await f.call('/copm/lote','POST',{paciente_id:second,data_avaliacao:'2026-11-01',itens:[item,{...item,id:1}]});
  assert.equal(r.status,404); assert.equal((await f.call('/copm')).data.length,1);
  const wrongDate = await f.call('/copm/reavaliacoes','POST',{paciente_id:first,data_avaliacao_base:'2026-10-31',data_reavaliacao:'2026-11-02',itens:[{copm_meta_id:1,desempenho:5,satisfacao:5}]}); assert.equal(wrongDate.status,400);
});

test('programacao batch writes all rows and preserves entered local dates', async () => {
  const f = await setup(); const id = await patient(f);
  const r = await f.call('/programacao/lote','POST',{paciente_id:id,terapeuta_responsavel:'Profissional',supervisora:'Supervisora',itens:[{programa:'Motor',objetivos:'Objetivo 1',data_registro:'2026-11-01'},{programa:'Social',objetivos:'Objetivo 2',data_registro:'2026-11-02'}]});
  assert.equal(r.status,201); assert.deepEqual(r.data.ids,[1,2]); assert.equal((await f.call('/programacao')).data[0].data_registro,'2026-11-02');
});

test('malformed backup and wrong password leave current dataset untouched', async () => {
  const f = await setup(); await patient(f); const original = f.store.value;
  const broken = copy(original); broken.agenda.push({id:1,paciente_id:999,data_hora:'2026-11-01 10:00',status:'Agendado'});
  await assert.rejects(f.api.restoreSnapshot(broken,{password:PASSWORD})); assert.deepEqual(f.store.value,original);
  await assert.rejects(f.api.restoreSnapshot(original,{password:'errada'})); assert.deepEqual(f.store.value,original);
  const invalidSequence = copy(original); invalidSequence.sequences.pacientes=0; assert.throws(()=>validateSnapshot(invalidSequence));
  const alien = copy(original); alien.pacientes[0].terapeuta_id=2; assert.throws(()=>validateSnapshot(alien));
  f.api.lock(); await assert.rejects(f.api.exportSnapshot()); await assert.rejects(f.api.restoreSnapshot(original,{password:PASSWORD}));
});

test('lock invalidates queued writes and tokens on reload; unknown routes do not silently succeed', async () => {
  const f = await setup(); let finish; let start;
  const saveStarted = new Promise(resolve=>{start=resolve;}); const gate = new Promise(resolve=>{finish=resolve;});
  const heldStore = {load:()=>f.store.load(),save:async state=>{start();await gate;await f.store.save(state);}};
  const api = createOfflineApi({store:heldStore}); const login = await send(api,'/login','POST',{usuario:'terapeuta',senha:PASSWORD}); const token=login.data.token;
  const executing=send(api,'/pacientes','POST',{nome:'Primeira'},token); await saveStarted;
  const queued=send(api,'/pacientes','POST',{nome:'Segunda'},token); api.lock(); finish();
  assert.equal((await executing).status,201); assert.equal((await queued).status,401); assert.equal(f.store.value.pacientes.length,1);
  const fresh=createOfflineApi({store:f.store}); assert.equal((await send(fresh,'/pacientes','GET',undefined,token)).status,401);
  assert.equal((await f.call('/nao-existe')).status,404);
});

test('password change invalidates previous session and persists only the new credential', async()=>{
  const f=await setup(); const nextPassword='outra senha muito longa 2026';
  assert.equal((await f.call('/sessao/senha','PUT',{senha_atual:PASSWORD,senha_nova:nextPassword})).status,200);
  assert.equal((await f.call('/sessao')).status,401);
  assert.equal((await send(f.api,'/login','POST',{usuario:'terapeuta',senha:PASSWORD})).status,401);
  assert.equal((await send(f.api,'/login','POST',{usuario:'terapeuta',senha:nextPassword})).status,200);
});

test('empty initial state is versioned and corruption fails closed', async()=>{
  assert.deepEqual(validateSnapshot(createEmptyState()),createEmptyState());
  assert.throws(()=>validateSnapshot({...createEmptyState(),version:999}));
  const api=createOfflineApi({store:storage({version:1})}); assert.equal((await send(api,'/login','POST',{usuario:'x',senha:PASSWORD})).status,400);
});
