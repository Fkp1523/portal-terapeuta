import { createOfflineApi, createEmptyState } from '../android-offline/src/offline-api.js';

const DEMO_USER = 'demo';
const DEMO_PASSWORD = 'Portfolio@2026';
let memoryState = createEmptyState();
const store = {
    async load() { return memoryState; },
    async save(next) { memoryState = JSON.parse(JSON.stringify(next)); }
};
const api = createOfflineApi({ store });

const asJson = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const isoDate = offset => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

async function read(response) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || data.mensagem || 'Falha ao preparar demonstração.');
    return data;
}

async function seed() {
    await read(await api.request('/terapeutas', asJson({ nome: 'Dra. Ana Demonstração', usuario: DEMO_USER, senha: DEMO_PASSWORD, crefito: 'CREFITO-DEMO' })));
    const login = await read(await api.request('/login', asJson({ usuario: DEMO_USER, senha: DEMO_PASSWORD })));
    const auth = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };
    const post = async (path, body) => read(await api.request(path, { method: 'POST', headers: auth, body: JSON.stringify(body) }));

    const marina = (await post('/pacientes', { nome: 'Marina Alves (fictício)', data_nascimento: '2017-05-12', diagnostico: 'Caso demonstrativo — dificuldades no desempenho ocupacional', responsavel: 'Responsável fictício', telefone: '(00) 00000-0000' })).id;
    const lucas = (await post('/pacientes', { nome: 'Lucas Ferreira (fictício)', data_nascimento: '2019-09-03', diagnostico: 'Caso demonstrativo — acompanhamento do desenvolvimento', responsavel: 'Responsável fictício', telefone: '(00) 00000-0000' })).id;
    await post('/pacientes', { nome: 'Sofia Martins (fictício)', data_nascimento: '2015-02-21', diagnostico: 'Caso demonstrativo — autonomia nas atividades diárias', responsavel: 'Responsável fictício', telefone: '(00) 00000-0000' });

    await post('/agenda', { paciente_id: marina, data_hora: `${isoDate(0)} 09:00`, status: 'Agendado', observacoes: 'Avaliação inicial — dados fictícios' });
    await post('/agenda', { paciente_id: lucas, data_hora: `${isoDate(0)} 14:00`, status: 'Confirmado', observacoes: 'Sessão demonstrativa' });
    await post('/agenda', { paciente_id: marina, data_hora: `${isoDate(2)} 10:30`, status: 'Agendado', observacoes: 'Retorno demonstrativo' });
    await post('/anamnese', { paciente_id: marina, data_avaliacao: isoDate(-20), historico_medico_desenvolvimento: 'Conteúdo fictício para demonstração do histórico clínico.', historico_educacional: 'Frequenta escola regular. Informação apenas demonstrativa.', historico_terapeutico: 'Acompanhamento simulado para apresentação do sistema.' });
    await post('/perfil_ocupacional', { paciente_id: marina, data_avaliacao: isoDate(-20), ambiental: 'Ambiente familiar e escolar — exemplo fictício.', pessoal: 'Interesses e preferências demonstrativas.', ocupacoes: 'Autocuidado, brincar e participação escolar.', padroes_desempenho: 'Rotina diária simulada.', habilidade_interacao: 'Participação com apoio.', fatores_cliente: 'Dados fictícios.', desafios_participacao: 'Organização e autonomia.', observacoes_finais: 'Registro criado exclusivamente para o portfólio.', coisas_irritam: 'Ruídos intensos.', coisas_gosto: 'Desenho e música.', como_comunico: 'Comunicação verbal.' });
    await post('/copm/lote', { paciente_id: marina, data_avaliacao: isoDate(-18), itens: [
        { atividade_problema: 'Organizar materiais escolares', nivel_importancia: 9, desempenho_inicial: 4, satisfacao_inicial: 3 },
        { atividade_problema: 'Vestir-se com autonomia', nivel_importancia: 8, desempenho_inicial: 5, satisfacao_inicial: 4 },
        { atividade_problema: 'Participar de brincadeiras em grupo', nivel_importancia: 7, desempenho_inicial: 5, satisfacao_inicial: 5 }
    ] });
    await post('/programacao/lote', { paciente_id: marina, terapeuta_responsavel: 'Dra. Ana Demonstração', supervisora: '', itens: [
        { programa: 'Treino de rotina visual', objetivos: 'Aumentar independência e organização', data_registro: isoDate(-14), tentativas: 4, alcancado: 2 },
        { programa: 'Atividades de autocuidado', objetivos: 'Ampliar autonomia no vestir', data_registro: isoDate(-7), tentativas: 5, alcancado: 3 }
    ] });
    await post('/evolucao_terapeutica', { paciente_id: marina, data_registro: isoDate(-5), profissional: 'Dra. Ana Demonstração', especialidade: 'Terapia Ocupacional', duracao: '50 minutos', horario: '09:00', programa_terapeutico: 'Rotina visual e autocuidado', objetivo: 'Estimular planejamento e independência', evolucao: 'Participou das propostas com apoio verbal reduzido.', desempenho: 'Evolução demonstrativa satisfatória.', reforcadores: 'Escolha de atividade lúdica', intercorrencias: 'Sem intercorrências', conduta: 'Manter progressão das tarefas', devolutiva: 'Orientações demonstrativas ao responsável' });
    await post('/roda_vida', { paciente_id: marina, data_avaliacao: isoDate(-10), vida_social: 7, contribuicao: 6, familia: 8, recursos_financeiros: 6, profissional: 7, amoroso: 7, criatividade_hobbies: 8, plenitude_realizacao: 6, equilibrio_emocional: 7, espiritualidade: 6, saude_disposicao: 8, desenvolvimento_pessoal: 7, observacoes: 'Pontuações fictícias para visualizar o gráfico.' });
    await post('/plano_intervencao', { paciente_id: marina, data_registro: isoDate(-15), profissional_responsavel: 'Dra. Ana Demonstração', itens: [{ objetivo: 'Ampliar autonomia', estrategia: 'Rotina visual e treino graduado', frequencia: 'Semanal' }] });
    await post('/relatorios_convenio', { paciente_id: marina, periodo_inicio: isoDate(-30), periodo_fim: isoDate(0), conteudo: 'Relatório demonstrativo com identificação fictícia, objetivos terapêuticos, procedimentos realizados e evolução observada. Nenhum dado deste documento pertence a um paciente real.', criado_em: `${isoDate(0)} 12:00:00` });
    api.lock();
}

const demoReady = seed();
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    if (url.origin === window.location.origin) {
        await demoReady;
        return api.request(`${url.pathname}${url.search}`, options);
    }
    return originalFetch(input, options);
};

window.DEMO_CREDENTIALS = { user: DEMO_USER, password: DEMO_PASSWORD };
