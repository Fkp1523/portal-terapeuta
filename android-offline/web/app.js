'use strict';

let pacientes = [];
let terapeutaAtual = null;
let pacienteSelecionadoNaPaginaClinica = '';
let agendaRegistros = [];
let agendaMesExibido = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const modulos = {
    ficha: {
        container: 'conteudo-ficha-observacao', route: '/ficha_observacao',
        title: 'Ficha de Observação Infantil', dateField: 'data_atendimento',
        columns: ['data_atendimento', 'atendimento_num', 'paciente_nome', 'sintese_conduta'],
        labels: { data_atendimento: 'Data', atendimento_num: 'Atendimento nº', paciente_nome: 'Paciente', sintese_conduta: 'Conduta' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_atendimento', label: 'Data do atendimento', type: 'date', required: true },
            { name: 'atendimento_num', label: 'Número do atendimento', placeholder: 'Ex.: 2º atendimento' },
            { name: 'idade', label: 'Idade' }, { name: 'duracao', label: 'Duração' },
            { name: 'terapeuta', label: 'Terapeuta responsável' },
            { name: 'checkboxes', label: 'Itens observados', type: 'checklist', wide: true },
            ...['obs_1', 'obs_2', 'obs_3', 'obs_4', 'obs_5', 'obs_6', 'obs_7'].map((name, i) => ({ name, label: `Observações — etapa ${i + 1}`, type: 'textarea', wide: true })),
            { name: 'orientacoes_cuidador', label: 'Dúvidas e relatos do cuidador', type: 'textarea', wide: true },
            { name: 'sintese_desempenho', label: 'Desempenho observado', type: 'textarea', wide: true },
            { name: 'sintese_faixa_etaria', label: 'Aspectos compatíveis com a faixa etária', type: 'textarea', wide: true },
            { name: 'sintese_acompanhar', label: 'Aspectos a acompanhar', type: 'textarea', wide: true },
            { name: 'sintese_conduta', label: 'Conduta para os próximos atendimentos', type: 'textarea', wide: true },
            { name: 'sintese_encaminhamento', label: 'Necessidade de encaminhamento / avaliação complementar', type: 'text', wide: true }
        ]
    },
    anamnese: {
        container: 'conteudo-copm', route: '/anamnese', title: 'Anamnese', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'historico_medico_desenvolvimento'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', historico_medico_desenvolvimento: 'Histórico médico e desenvolvimento' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date' },
            { name: 'historico_medico_desenvolvimento', label: 'Histórico médico e desenvolvimento', type: 'textarea', wide: true },
            { name: 'historico_educacional', label: 'Histórico educacional', type: 'textarea', wide: true },
            { name: 'historico_terapeutico', label: 'Histórico terapêutico', type: 'textarea', wide: true }
        ]
    },
    perfilOcupacional: {
        container: 'conteudo-copm', route: '/perfil_ocupacional', title: 'Perfil Ocupacional', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'ocupacoes'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', ocupacoes: 'Ocupações' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date' },
            ...[
                ['ambiental', 'Fatores ambientais'], ['pessoal', 'Fatores pessoais'], ['ocupacoes', 'Ocupações'],
                ['padroes_desempenho', 'Padrões de desempenho'], ['habilidade_interacao', 'Habilidades de interação'],
                ['fatores_cliente', 'Oportunidades e pontos fortes'], ['desafios_participacao', 'Desafios de participação'],
                ['observacoes_finais', 'Observações finais'],
                ['coisas_irritam', 'O que irrita ou incomoda'], ['coisas_gosto', 'Preferências e interesses'],
                ['como_comunico', 'Como se comunica']
            ].map(([name, label]) => ({ name, label, type: 'textarea', wide: true }))
        ]
    },
    copm: {
        container: 'conteudo-copm', route: '/copm', title: 'COPM — Medida Canadense de Desempenho Ocupacional', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'atividade_problema', 'nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', atividade_problema: 'Atividade/problema', nivel_importancia: 'Importância', desempenho_inicial: 'Desempenho inicial', satisfacao_inicial: 'Satisfação inicial' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
            { name: 'atividade_problema', label: 'Atividade ou problema ocupacional', type: 'textarea', required: true, wide: true },
            ...[
                ['nivel_importancia', 'Importância'], ['desempenho_inicial', 'Desempenho inicial'], ['satisfacao_inicial', 'Satisfação inicial']
            ].map(([name, label]) => ({ name, label, type: 'number', min: 1, max: 10 })),
        ]
    },
    sensorial: {
        container: 'conteudo-sensorial', route: '/avaliacao_sensorial', title: 'Avaliação Sensorial e Funcional', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'contato_visual', 'motor_global', 'brincar'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', contato_visual: 'Contato visual', motor_global: 'Motor global', brincar: 'Brincar' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
            ...[
                ['contato_visual', 'Contato visual'], ['comunicacao_alternativa', 'Comunicação alternativa'],
                ['expressiva_linguagem', 'Linguagem expressiva'], ['receptiva_linguagem', 'Linguagem receptiva'],
                ['atencao_conjunta', 'Atenção conjunta'], ['comportamento_exploratorio', 'Comportamento exploratório'],
                ['combinacoes', 'Combinações'], ['uso_lapis', 'Uso do lápis'], ['higiene_pessoal', 'Higiene pessoal'],
                ['vestuario', 'Vestuário'], ['uso_banheiro', 'Uso do banheiro'], ['alimentacao', 'Alimentação'],
                ['motor_global', 'Motricidade global'], ['motor_fino', 'Motricidade fina'], ['interacao_objetos', 'Interação com objetos'],
                ['interacao_bola', 'Interação com bola'], ['resposta_emocional', 'Resposta emocional'],
                ['imitacoes', 'Imitações'], ['tolerancia', 'Tolerância'], ['brincar', 'Brincar']
            ].map(([name, label]) => ({ name, label, type: 'number', min: 1, max: 10 }))
        ]
    },
    evolucao: {
        container: 'conteudo-evolucao', route: '/evolucao_terapeutica', title: 'Evolução Terapêutica', dateField: 'data_registro',
        columns: ['data_registro', 'paciente_nome', 'programa_terapeutico', 'evolucao'],
        labels: { data_registro: 'Data', paciente_nome: 'Paciente', programa_terapeutico: 'Programa', evolucao: 'Evolução' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_registro', label: 'Data do atendimento', type: 'date', required: true },
            { name: 'profissional', label: 'Profissional' }, { name: 'especialidade', label: 'Especialidade' },
            { name: 'duracao', label: 'Duração' }, { name: 'horario', label: 'Horário' },
            { name: 'programa_terapeutico', label: 'Programa terapêutico', type: 'textarea', wide: true },
            { name: 'objetivo', label: 'Objetivo', type: 'textarea', wide: true },
            { name: 'evolucao', label: 'Evolução da sessão', type: 'textarea', required: true, wide: true },
            { name: 'desempenho', label: 'Desempenho observado', type: 'textarea', wide: true },
            { name: 'reforcadores', label: 'Reforçadores', type: 'textarea', wide: true },
            { name: 'intercorrencias', label: 'Intercorrências', type: 'textarea', wide: true },
            { name: 'conduta', label: 'Conduta', type: 'textarea', wide: true },
            { name: 'devolutiva', label: 'Devolutiva à família/paciente', type: 'textarea', wide: true }
        ]
    },
    pedi: {
        container: 'conteudo-pedi', route: '/pedi_autocuidado', title: 'PEDI — Autocuidado', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'escore_total'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', escore_total: 'Escore total' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
            { name: 'escore_total', label: 'Escore total', type: 'number' },
            { name: 'respostas', label: 'Domínios e respostas', type: 'keyValue', keys: [['dominio', 'Domínio/atividade'], ['resposta', 'Resposta/observação']], wide: true }
        ]
    },
    plano: {
        container: 'conteudo-plano-intervencao', route: '/plano_intervencao', title: 'Plano de Intervenção', dateField: 'data_registro',
        columns: ['data_registro', 'paciente_nome', 'profissional_responsavel'],
        labels: { data_registro: 'Data', paciente_nome: 'Paciente', profissional_responsavel: 'Responsável' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_registro', label: 'Data do plano', type: 'date', required: true },
            { name: 'profissional_responsavel', label: 'Profissional responsável' },
            { name: 'itens', label: 'Programas e metas por prazo', type: 'repeatArray', keys: [['programa', 'Programa'], ['curto', 'Curto prazo'], ['medio', 'Médio prazo'], ['longo', 'Longo prazo']], wide: true }
        ]
    },
    programacao: {
        container: 'conteudo-programacao', route: '/programacao', title: 'Programação Terapêutica', dateField: 'data_registro',
        columns: ['data_registro', 'paciente_nome', 'programa', 'objetivos', 'alcancado'],
        labels: { data_registro: 'Data', paciente_nome: 'Paciente', programa: 'Programa', objetivos: 'Objetivos', alcancado: 'Alcançado' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_registro', label: 'Data do registro', type: 'date', required: true },
            { name: 'terapeuta_responsavel', label: 'Terapeuta responsável' }, { name: 'supervisora', label: 'Supervisora' },
            { name: 'programa', label: 'Programa' }, { name: 'tentativas', label: 'Tentativas' },
            { name: 'alcancado', label: 'Objetivo alcançado?', type: 'select', options: [['', 'Selecione...'], ['Sim', 'Sim'], ['Parcial', 'Parcialmente'], ['Não', 'Não']] },
            { name: 'objetivos', label: 'Objetivos e observações', type: 'textarea', wide: true }
        ]
    },
    rodaVida: {
        container: 'conteudo-rodavida', route: '/roda_vida', title: 'Roda da Vida', dateField: 'data_avaliacao',
        columns: ['data_avaliacao', 'paciente_nome', 'saude_disposicao', 'familia', 'equilibrio_emocional'],
        labels: { data_avaliacao: 'Data', paciente_nome: 'Paciente', saude_disposicao: 'Saúde', familia: 'Família', equilibrio_emocional: 'Equilíbrio emocional' },
        fields: [
            { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
            { name: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
            ...[
                ['saude_disposicao', 'Saúde e disposição'], ['desenvolvimento_pessoal', 'Desenvolvimento intelectual'],
                ['equilibrio_emocional', 'Equilíbrio emocional'], ['profissional', 'Realização profissional'],
                ['recursos_financeiros', 'Recursos financeiros'], ['contribuicao', 'Contribuição social'],
                ['familia', 'Família'], ['amoroso', 'Desenvolvimento amoroso'], ['vida_social', 'Vida social'],
                ['criatividade_hobbies', 'Criatividade, hobbies e diversão'],
                ['plenitude_realizacao', 'Plenitude e felicidade'], ['espiritualidade', 'Espiritualidade']
            ].map(([name, label]) => ({ name, label, type: 'number', min: 1, max: 10 })),
            { name: 'observacoes', label: 'Observações', type: 'textarea', wide: true }
        ]
    }
};

const fichaObservacaoBlocos = [
    { titulo: '1. Observação inicial (0 a 5 min)', grupos: [
        ['Estado comportamental', ['Alerta e tranquila', 'Alerta e ativa', 'Sonolenta', 'Irritada/choro', 'Necessitou de pausa/regulação']],
        ['Movimentação espontânea', ['Presente', 'Reduzida', 'Ampla/variada', 'Predominantemente simétrica', 'Assimetria observada']],
        ['Cabeça', ['Mantém-se alinhada', 'Rotaciona para ambos os lados', 'Preferência por um lado', 'Necessita de suporte']]
    ] },
    { titulo: '2. Estimulação visual e auditiva (5 a 10 min)', grupos: [
        ['Resposta visual', ['Fixa o olhar no estímulo', 'Acompanha lentamente', 'Acompanha para direita', 'Acompanha para esquerda', 'Busca visualmente o estímulo', 'Resposta inconsistente']],
        ['Resposta auditiva', ['Orienta-se à voz', 'Demonstra atenção ao som', 'Modifica expressão/comportamento', 'Resposta inconsistente', 'Não observada no momento']],
        ['Tipo de estímulo utilizado', ['Face do terapeuta', 'Alto contraste', 'Brinquedo', 'Voz', 'Outro (descrever nas observações)']]
    ] },
    { titulo: '3. Movimentação espontânea (10 a 15 min)', grupos: [
        ['Membros superiores', ['Movimenta espontaneamente', 'Movimentos bilaterais', 'Movimenta ambos os lados de forma semelhante', 'Mãos próximas à linha média', 'Assimetria observada']],
        ['Membros inferiores', ['Movimenta espontaneamente', 'Movimentos variados', 'Movimentos bilaterais', 'Assimetria observada']],
        ['Movimento global', ['Variado', 'Fluido', 'Pouco variado', 'Rigidez aparente', 'Redução de movimentação', 'Outro (descrever nas observações)']]
    ] },
    { titulo: '4. Tummy time (15 a 25 min)', grupos: [
        ['Tolerância ao prono', ['Boa', 'Moderada', 'Baixa', 'Necessitou de pausas', 'Interrompido por desconforto/choro']],
        ['Controle cervical', ['Tenta elevar a cabeça', 'Eleva brevemente', 'Mantém a cabeça por alguns segundos', 'Rotaciona para direita', 'Rotaciona para esquerda', 'Movimenta para ambos os lados', 'Necessitou de facilitação']],
        ['Membros superiores', ['Apoio espontâneo', 'Tentativa de apoio', 'Membros superiores em posição adequada', 'Necessitou de ajuste postural']],
        ['Simetria', ['Adequada', 'Pequena assimetria', 'Assimetria persistente']],
        ['Resposta ao estímulo visual', ['Orienta-se ao estímulo', 'Eleva a cabeça em direção ao estímulo', 'Acompanha o estímulo', 'Resposta inconsistente']],
        ['Sinais observados', ['Boa organização', 'Fadiga', 'Irritação', 'Choro', 'Necessidade de pausa']]
    ] },
    { titulo: '5. Controle cervical no colo (25 a 30 min)', grupos: [
        ['Durante o manejo', ['Mantém cabeça alinhada com suporte', 'Realiza tentativas de controle', 'Orienta a cabeça ao estímulo', 'Rotaciona para ambos os lados', 'Apresenta preferência lateral', 'Necessita de suporte contínuo']],
        ['Resposta ao movimento', ['Adequada', 'Organiza-se com facilidade', 'Necessita de tempo para reorganização', 'Demonstra desconforto']]
    ] },
    { titulo: '6. Integração e encerramento (30 a 35 min)', grupos: [
        ['Estado ao final das atividades', ['Tranquila', 'Alerta', 'Organizada', 'Sonolenta', 'Irritada', 'Cansada']],
        ['Interação', ['Mantém contato visual', 'Responde à voz', 'Demonstra interesse pelo ambiente', 'Busca interação', 'Resposta reduzida']]
    ] },
    { titulo: '7. Orientação ao cuidador (35 a 40 min)', grupos: [
        ['Orientações realizadas', ['Tummy time supervisionado durante períodos de vigília', 'Estímulo visual em diferentes direções', 'Interação por meio de voz e contato visual', 'Oportunidades de movimentação livre', 'Alternância dos estímulos entre os lados', 'Respeito aos sinais de cansaço/desconforto', 'Outras (descrever nas observações)']]
    ] }
];

const habilidadesSensoriais = [
    { grupo: 'Habilidades Comunicativas', itens: [
        ['contato_visual', 'Contato visual'], ['comunicacao_alternativa', 'Comunicação alternativa'],
        ['expressiva_linguagem', 'Linguagem expressiva'], ['receptiva_linguagem', 'Linguagem receptiva'],
        ['atencao_conjunta', 'Atenção conjunta']
    ] },
    { grupo: 'Habilidades Cognitivas', itens: [
        ['comportamento_exploratorio', 'Comportamento exploratório'], ['combinacoes', 'Combinações'], ['uso_lapis', 'Uso do lápis']
    ] },
    { grupo: 'Habilidades Funcionais', itens: [
        ['higiene_pessoal', 'Higiene pessoal'], ['vestuario', 'Vestuário'], ['uso_banheiro', 'Uso do banheiro'],
        ['alimentacao', 'Alimentação'], ['motor_global', 'Motor global']
    ] },
    { grupo: 'Habilidades Motoras', itens: [
        ['motor_fino', 'Motor fino'], ['interacao_objetos', 'Interação com objetos'], ['interacao_bola', 'Interação com bola']
    ] },
    { grupo: 'Habilidades Sociais', itens: [
        ['resposta_emocional', 'Resposta emocional'], ['imitacoes', 'Imitações'], ['tolerancia', 'Tolerância'], ['brincar', 'Brincar']
    ] }
];

const pediCategorias = [
    ['A: Textura dos alimentos', [
        'Come alimento batido/amassado/coado', 'Come alimento moído/granulado', 'Come alimento picado/em pedaços', 'Come comidas de texturas variadas'
    ]],
    ['B: Utilização de utensílios', [
        'Alimenta-se com os dedos', 'Pega comida com colher e leva até a boca', 'Usa bem a colher', 'Usa bem o garfo',
        'Usa faca para passar manteiga no pão e cortar alimentos macios'
    ]],
    ['C: Utilização de recipientes para beber', [
        'Segura mamadeira ou copo com bico ou canudo', 'Levanta copo para beber, mas pode derramar',
        'Levanta com firmeza copo sem tampa, usando ambas as mãos', 'Levanta com firmeza copo sem tampa, usando uma das mãos',
        'Serve-se de líquidos de uma jarra ou embalagem'
    ]],
    ['D: Higiene oral', [
        'Abre a boca para limpeza dos dentes', 'Segura escova de dente', 'Escova os dentes, porém sem escovação completa',
        'Escova os dentes completamente', 'Coloca creme dental na escova'
    ]],
    ['E: Cuidados com os cabelos', [
        'Mantém a cabeça estável enquanto o cabelo é penteado', 'Leva pente ou escova até o cabelo', 'Escova ou penteia o cabelo',
        'É capaz de desembaraçar e partir o cabelo'
    ]],
    ['F: Cuidados com o nariz', [
        'Permite que o nariz seja limpo', 'Assoa o nariz com lenço', 'Limpa o nariz usando lenço ou papel quando solicitado',
        'Limpa o nariz usando lenço ou papel sem ser solicitado', 'Limpa e assoa o nariz sem ser solicitado'
    ]],
    ['G: Lavar as mãos', [
        'Mantém as mãos elevadas para que sejam lavadas', 'Esfrega as mãos uma na outra para limpá-las', 'Abre e fecha torneira e utiliza sabão',
        'Lava as mãos completamente', 'Seca as mãos completamente'
    ]],
    ['H: Lavar o corpo e a face', [
        'Tenta lavar partes do corpo', 'Lava o corpo completamente, não incluindo a face', 'Utiliza sabonete e esponja, se for costume',
        'Seca o corpo completamente', 'Lava e seca a face completamente'
    ]],
    ['I: Agasalho e vestimentas abertas na frente', [
        'Auxilia empurrando os braços para vestir a manga da camisa', 'Retira camisas, vestido ou agasalho sem fecho',
        'Coloca camiseta, vestido ou agasalho sem fecho', 'Coloca e retira camisas abertas na frente, porém sem fechar',
        'Coloca e retira camisas abertas na frente, fechando-as'
    ]],
    ['J: Fechos', [
        'Tenta participar no fechamento de vestimentas', 'Abre e fecha fecho de correr, sem separá-lo', 'Abre e fecha colchete de pressão',
        'Abotoa e desabotoa', 'Abre e fecha fecho de correr (zíper), separando e fechando-o'
    ]],
    ['K: Calças', [
        'Auxilia colocando as pernas dentro da calça para vestir', 'Retira calças com elástico na cintura', 'Veste calças com elástico na cintura',
        'Retira calças, incluindo abrir fechos', 'Veste calças, incluindo fechar fechos'
    ]],
    ['L: Sapatos e meias', [
        'Retira meias e abre os sapatos', 'Calça sapatos/sandálias', 'Calça meias',
        'Coloca o sapato no pé correto e maneja fechos de velcro', 'Amarra sapatos (prepara para cadarço)'
    ]],
    ['M: Tarefas de toalete', [
        'Auxilia no manejo de roupas', 'Tenta limpar-se depois de utilizar o banheiro',
        'Utiliza vaso sanitário, papel higiênico e dá descarga', 'Lida com roupas antes e depois de utilizar o banheiro',
        'Limpa-se completamente depois de evacuar'
    ]],
    ['N: Controle urinário', [
        'Indica quando molhou fralda ou calça', 'Ocasionalmente indica necessidade de urinar durante o dia',
        'Indica consistentemente necessidade de urinar e tem tempo de utilizar o banheiro durante o dia',
        'Vai ao banheiro sozinho para urinar durante o dia', 'Mantém-se constantemente seco durante o dia e à noite'
    ]],
    ['O: Controle intestinal', [
        'Indica necessidade de evacuar', 'Ocasionalmente manifesta vontade de ir ao banheiro durante o dia',
        'Indica consistentemente necessidade de evacuar e tem tempo de utilizar o banheiro',
        'Faz distinção entre urinar e evacuar', 'Vai ao banheiro sozinho para evacuar e não tem acidentes intestinais'
    ]]
];

const rodaAreas = [
    ['saude_disposicao', 'Saúde e disposição'], ['desenvolvimento_pessoal', 'Desenvolvimento intelectual'],
    ['equilibrio_emocional', 'Equilíbrio emocional'], ['profissional', 'Realização profissional'],
    ['recursos_financeiros', 'Recursos financeiros'], ['contribuicao', 'Contribuição social'], ['familia', 'Família'],
    ['amoroso', 'Desenvolvimento amoroso'], ['vida_social', 'Vida social'],
    ['criatividade_hobbies', 'Criatividade, hobbies e diversão'], ['plenitude_realizacao', 'Plenitude e felicidade'],
    ['espiritualidade', 'Espiritualidade']
];

const titulosSecoes = {
    'sec-dashboard': 'Painel Inicial', 'sec-pacientes': 'Gestão de Pacientes', 'sec-agenda': 'Agenda',
    'sec-copm': 'Anamnese, Perfil Ocupacional e COPM', 'sec-ficha-observacao': 'Ficha de Observação Infantil',
    'sec-sensorial': 'Avaliação Sensorial', 'sec-evolucao': 'Evolução Terapêutica', 'sec-pedi': 'PEDI — Autocuidado',
    'sec-plano-intervencao': 'Plano de Intervenção', 'sec-programacao': 'Programação Terapêutica',
    'sec-rodavida': 'Roda da Vida', 'sec-prontuario': 'Prontuário Central', 'sec-relatorio': 'Relatório para Convênio',
    'sec-perfil': 'Perfil da Terapeuta'
};

function dataLocal(tipo = 'date') {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString();
    return tipo === 'datetime-local' ? local.slice(0, 16) : local.slice(0, 10);
}

function montarCampoPontuacao(nome, rotulo) {
    const grupo = document.createElement('div'); grupo.className = 'form-grupo pontuacao-campo';
    const label = document.createElement('label'); label.htmlFor = nome; label.textContent = rotulo;
    const select = document.createElement('select'); select.id = nome; select.name = nome; select.required = true;
    select.add(new Option('Escolha uma nota (1–10)', ''));
    for (let nota = 1; nota <= 10; nota++) select.add(new Option(String(nota), String(nota)));
    grupo.append(label, select); return grupo;
}

function desenharRadar(container, itens, valores, opcoes = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const tamanho = opcoes.tamanho || 440, centro = tamanho / 2, raio = opcoes.raio || 165;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${tamanho} ${tamanho}`);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Gráfico radial das notas');
    if (opcoes.gradiente) {
        const defs = document.createElementNS(ns, 'defs');
        const gradiente = document.createElementNS(ns, 'linearGradient');
        gradiente.id = 'roda-area-gradient'; gradiente.setAttribute('x1', '0%'); gradiente.setAttribute('y1', '100%');
        gradiente.setAttribute('x2', '100%'); gradiente.setAttribute('y2', '0%');
        [['0%', '#2dd4bf', '.44'], ['100%', '#6366f1', '.22']].forEach(([offset, cor, opacidade]) => {
            const stop = document.createElementNS(ns, 'stop'); stop.setAttribute('offset', offset);
            stop.setAttribute('stop-color', cor); stop.setAttribute('stop-opacity', opacidade); gradiente.append(stop);
        });
        defs.append(gradiente); svg.append(defs);
    }
    for (let nivel = 1; nivel <= 10; nivel++) {
        const circulo = document.createElementNS(ns, 'circle');
        circulo.setAttribute('cx', centro); circulo.setAttribute('cy', centro);
        circulo.setAttribute('r', String(raio * nivel / 10)); circulo.setAttribute('class', `radar-anel${opcoes.gradiente && nivel % 2 === 0 ? ' radar-anel-guia' : ''}`); svg.append(circulo);
        if (nivel % 2 === 0) {
            const marca = document.createElementNS(ns, 'text');
            marca.setAttribute('x', String(centro + 4)); marca.setAttribute('y', String(centro - raio * nivel / 10 - 3));
            marca.setAttribute('class', 'radar-rotulo-escala'); marca.textContent = String(nivel); svg.append(marca);
        }
    }
    const pontos = [], marcadores = [], etiquetas = [];
    itens.forEach(([nome, rotulo], indice) => {
        const angulo = -Math.PI / 2 + (2 * Math.PI * indice / itens.length);
        const xFinal = centro + raio * Math.cos(angulo), yFinal = centro + raio * Math.sin(angulo);
        const eixo = document.createElementNS(ns, 'line');
        eixo.setAttribute('x1', centro); eixo.setAttribute('y1', centro); eixo.setAttribute('x2', xFinal); eixo.setAttribute('y2', yFinal);
        eixo.setAttribute('class', 'radar-eixo'); svg.append(eixo);
        if (opcoes.gradiente) eixo.style.stroke = opcoes.cores?.[indice] || '#14b8a6';
        const descricaoEixo = document.createElementNS(ns, 'title'); descricaoEixo.textContent = rotulo; eixo.append(descricaoEixo);
        const valor = Math.max(0, Math.min(10, Number(valores[nome] || 0)));
        const ponto = [centro + raio * valor / 10 * Math.cos(angulo), centro + raio * valor / 10 * Math.sin(angulo)];
        pontos.push(ponto);
        const marcador = document.createElementNS(ns, 'circle');
        marcador.setAttribute('cx', ponto[0]); marcador.setAttribute('cy', ponto[1]); marcador.setAttribute('r', opcoes.gradiente ? '5.5' : '3.5');
        marcador.setAttribute('class', 'radar-ponto');
        if (opcoes.gradiente) marcador.style.fill = opcoes.cores?.[indice] || '#0d9488';
        const dica = document.createElementNS(ns, 'title'); dica.textContent = `${rotulo}: ${valor || 'sem nota'}`; marcador.append(dica); marcadores.push(marcador);
        if (opcoes.numerarEixos) {
            const distanciaRotulo = opcoes.distanciaRotulo || raio + 34;
            const xRotulo = centro + distanciaRotulo * Math.cos(angulo), yRotulo = centro + distanciaRotulo * Math.sin(angulo);
            const selo = document.createElementNS(ns, 'circle'); selo.setAttribute('cx', String(xRotulo)); selo.setAttribute('cy', String(yRotulo));
            selo.setAttribute('r', '11'); selo.setAttribute('class', 'radar-indice-fundo'); etiquetas.push(selo);
            const indiceEixo = document.createElementNS(ns, 'text'); indiceEixo.setAttribute('x', String(xRotulo)); indiceEixo.setAttribute('y', String(yRotulo));
            indiceEixo.setAttribute('text-anchor', 'middle'); indiceEixo.setAttribute('dominant-baseline', 'central');
            indiceEixo.setAttribute('class', 'radar-indice-eixo'); indiceEixo.textContent = String(indice + 1);
            const tituloEixo = document.createElementNS(ns, 'title'); tituloEixo.textContent = rotulo; indiceEixo.append(tituloEixo); etiquetas.push(indiceEixo);
        }
    });
    const poligono = document.createElementNS(ns, 'polygon');
    poligono.setAttribute('points', pontos.map(p => p.join(',')).join(' ')); poligono.setAttribute('class', `radar-poligono${opcoes.gradiente ? ' radar-poligono-roda' : ''}`);
    if (opcoes.gradiente) poligono.setAttribute('fill', 'url(#roda-area-gradient)');
    svg.append(poligono);
    marcadores.forEach(marcador => svg.append(marcador));
    etiquetas.forEach(etiqueta => svg.append(etiqueta));
    container.replaceChildren(svg);
}

function adicionarLegendaRadar(container, itens) {
    const legenda = document.createElement('ol'); legenda.className = 'radar-legenda';
    itens.forEach(([, rotulo], indice) => {
        const item = document.createElement('li');
        const numero = document.createElement('span'); numero.className = 'radar-legenda-numero'; numero.textContent = String(indice + 1);
        item.append(numero, document.createTextNode(rotulo)); legenda.append(item);
    });
    container.append(legenda);
}

async function apiFetch(caminho, opcoes = {}) {
    const cabecalhos = new Headers(opcoes.headers || {});
    const token = sessionStorage.getItem('token_sessao');
    if (token) cabecalhos.set('Authorization', `Bearer ${token}`);
    const resposta = await window.TabletApi.request(caminho, { ...opcoes, headers: cabecalhos });
    if (resposta.status === 401 && token && caminho !== '/login') {
        window.TabletApi.sessionExpired();
    }
    return resposta;
}

async function requestJSON(caminho, opcoes) {
    const resposta = await apiFetch(caminho, opcoes);
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || dados.mensagem || 'Não foi possível concluir a operação.');
    return dados;
}

function card(titulo, descricao) {
    const elemento = document.createElement('section');
    elemento.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = titulo;
    elemento.append(h2);
    if (descricao) {
        const p = document.createElement('p');
        p.className = 'texto-ajuda';
        p.textContent = descricao;
        elemento.append(p);
    }
    return elemento;
}

function grupoCampo(campo, prefixo = '') {
    const grupo = document.createElement('div');
    grupo.className = `form-grupo${campo.wide ? ' campo-largo' : ''}`;
    const id = `${prefixo}${campo.name}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = campo.label;
    grupo.append(label);

    let input;
    if (['checklist', 'keyValue', 'repeatArray'].includes(campo.type)) {
        input = criarRepetidor(campo);
        grupo.dataset.jsonField = campo.name;
    } else if (campo.type === 'textarea' || campo.type === 'json') {
        input = document.createElement('textarea');
        input.rows = campo.type === 'json' ? 5 : 3;
        if (campo.type === 'json') input.value = campo.name === 'itens' || campo.name === 'checkboxes' ? '[]' : '{}';
        if (campo.placeholder) input.placeholder = campo.placeholder;
    } else if (campo.type === 'select' || campo.type === 'patient') {
        input = document.createElement('select');
        if (campo.type === 'patient') {
            input.dataset.patientSelect = 'true';
            input.add(new Option('Selecione o paciente...', ''));
        } else {
            for (const [value, text] of campo.options) input.add(new Option(text, value));
        }
    } else {
        input = document.createElement('input');
        input.type = campo.type || 'text';
        if (campo.type === 'number') input.step = '1';
        if (campo.min !== undefined) input.min = String(campo.min);
        if (campo.max !== undefined) input.max = String(campo.max);
        if (campo.placeholder) input.placeholder = campo.placeholder;
    }
    input.id = id;
    input.name = campo.name;
    input.required = Boolean(campo.required);
    grupo.append(input);
    return grupo;
}

function criarRepetidor(campo) {
    const repetidor = document.createElement('div');
    repetidor.className = 'repetidor';
    repetidor.dataset.repeater = campo.type;
    const linhas = document.createElement('div');
    linhas.className = 'repetidor-linhas';
    repetidor.append(linhas);
    const adicionar = document.createElement('button');
    adicionar.type = 'button'; adicionar.className = 'btn-acao'; adicionar.textContent = '+ Adicionar item';
    adicionar.addEventListener('click', () => adicionarLinhaRepetidor(linhas, campo));
    repetidor.append(adicionar);
    adicionarLinhaRepetidor(linhas, campo);
    return repetidor;
}

function adicionarLinhaRepetidor(linhas, campo) {
    const linha = document.createElement('div'); linha.className = 'repetidor-linha';
    if (campo.type === 'checklist') {
        const texto = document.createElement('input'); texto.type = 'text'; texto.dataset.jsonKey = 'item'; texto.placeholder = 'Descreva o item observado';
        const marcado = document.createElement('label'); marcado.className = 'repetidor-check';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.jsonKey = 'marcado';
        marcado.append(checkbox, document.createTextNode(' Observado'));
        linha.append(texto, marcado);
    } else {
        for (const [chave, rotulo] of campo.keys) {
            const input = document.createElement('input'); input.type = 'text'; input.dataset.jsonKey = chave; input.placeholder = rotulo;
            linha.append(input);
        }
    }
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-remover-item'; remover.textContent = 'Remover';
    remover.addEventListener('click', () => {
        if (linhas.children.length === 1) {
            linha.querySelectorAll('input[type="text"]').forEach(input => { input.value = ''; });
            const checkbox = linha.querySelector('input[type="checkbox"]'); if (checkbox) checkbox.checked = false;
        } else linha.remove();
    });
    linha.append(remover); linhas.append(linha);
}

function valorRepetidor(form, campo) {
    const repetidor = form.querySelector(`[data-json-field="${campo.name}"] .repetidor`);
    const registros = [...repetidor.querySelectorAll('.repetidor-linha')].map(linha => {
        if (campo.type === 'checklist') {
            const item = linha.querySelector('[data-json-key="item"]').value.trim();
            const marcado = linha.querySelector('[data-json-key="marcado"]').checked;
            return item ? { item, marcado } : null;
        }
        const objeto = {};
        for (const [chave] of campo.keys) objeto[chave] = linha.querySelector(`[data-json-key="${chave}"]`).value.trim();
        return Object.values(objeto).some(Boolean) ? objeto : null;
    }).filter(Boolean);
    if (campo.type === 'keyValue') {
        return Object.fromEntries(registros.filter(item => item.dominio).map(item => [item.dominio, item.resposta]));
    }
    return registros;
}

function resetarRepetidores(form, campos) {
    for (const campo of campos.filter(item => ['checklist', 'keyValue', 'repeatArray'].includes(item.type))) {
        const repetidor = form.querySelector(`[data-json-field="${campo.name}"] .repetidor`);
        const linhas = repetidor.querySelector('.repetidor-linhas');
        linhas.replaceChildren(); adicionarLinhaRepetidor(linhas, campo);
    }
}

function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (typeof valor === 'object') return JSON.stringify(valor);
    const texto = String(valor);
    const data = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2})?)?/);
    if (data) return `${data[3]}/${data[2]}/${data[1]}${data[4] ? ` ${data[4]}` : ''}`;
    return texto.replace('T', ' ');
}

function desenharTabela(container, registros, colunas, rotulos, vazio = 'Nenhum registro encontrado.', criarAcao = null) {
    container.replaceChildren();
    const envoltorio = document.createElement('div');
    envoltorio.className = 'table-container';
    const tabela = document.createElement('table');
    const cabecalho = document.createElement('thead');
    const linhaCabecalho = document.createElement('tr');
    for (const coluna of colunas) {
        const th = document.createElement('th');
        th.textContent = rotulos[coluna] || coluna;
        linhaCabecalho.append(th);
    }
    if (criarAcao) {
        const th = document.createElement('th'); th.textContent = 'Ações'; linhaCabecalho.append(th);
    }
    cabecalho.append(linhaCabecalho);
    tabela.append(cabecalho);
    const corpo = document.createElement('tbody');
    if (!registros.length) {
        const linha = document.createElement('tr');
        const celula = document.createElement('td');
        celula.colSpan = colunas.length;
        celula.textContent = vazio;
        linha.append(celula);
        corpo.append(linha);
    } else {
        for (const registro of registros) {
            const linha = document.createElement('tr');
            for (const coluna of colunas) {
                const celula = document.createElement('td');
                celula.textContent = formatarValor(registro[coluna]);
                linha.append(celula);
            }
            if (criarAcao) {
                const celula = document.createElement('td'); celula.append(criarAcao(registro)); linha.append(celula);
            }
            corpo.append(linha);
        }
    }
    tabela.append(corpo);
    envoltorio.append(tabela);
    container.append(envoltorio);
}

function preencherSeletoresPaciente() {
    document.querySelectorAll('select[data-patient-select="true"]').forEach(select => {
        const valorAtual = select.value;
        select.replaceChildren(new Option('Selecione o paciente...', ''));
        for (const paciente of pacientes) select.add(new Option(paciente.nome, paciente.id));
        if (pacientes.some(p => String(p.id) === valorAtual)) select.value = valorAtual;
    });
}

async function carregarPacientes() {
    pacientes = await requestJSON('/pacientes');
    preencherSeletoresPaciente();
    renderizarTabelaPacientes();
    return pacientes;
}

function renderizarTabelaPacientes() {
    const corpo = document.getElementById('lista-pacientes');
    const termo = document.getElementById('filtro-pacientes')?.value.trim().toLocaleLowerCase('pt-BR') || '';
    const filtrados = pacientes.filter(paciente => !termo || [paciente.nome, paciente.diagnostico, paciente.responsavel, paciente.telefone]
        .some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)));
    if (corpo) desenharTabela(corpo, filtrados, ['nome', 'data_nascimento', 'diagnostico', 'responsavel', 'telefone'], {
        nome: 'Paciente', data_nascimento: 'Nascimento', diagnostico: 'Diagnóstico', responsavel: 'Responsável', telefone: 'Telefone'
    }, 'Ainda não há pacientes cadastrados.', paciente => {
        const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
        const editar = document.createElement('button'); editar.type = 'button'; editar.className = 'btn-acao'; editar.textContent = 'Editar';
        editar.addEventListener('click', () => editarPaciente(paciente)); acoes.append(editar);
        const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
        excluir.addEventListener('click', async () => {
            if (!confirm(`Excluir o cadastro de ${paciente.nome}? Pacientes com prontuário não podem ser excluídos.`)) return;
            try { await requestJSON(`/pacientes/${paciente.id}`, { method: 'DELETE' }); await carregarPacientes(); await carregarDashboard(); }
            catch (erro) { mostrarAviso(erro.message); }
        });
        acoes.append(excluir); return acoes;
    });
}

async function carregarDashboard() {
    try {
        const [resumo, agendaCompleta] = await Promise.all([
            requestJSON('/dashboard-resumo'),
            requestJSON('/agenda')
        ]);
        const totalPacientes = document.getElementById('dash-total-pacientes');
        const consultasHoje = document.getElementById('dash-consultas-hoje');
        const profissionalDashboard = document.getElementById('dash-profissional');
        const dataDashboard = document.getElementById('dash-hoje');
        if (totalPacientes) totalPacientes.textContent = resumo.total_pacientes ?? 0;
        if (consultasHoje) consultasHoje.textContent = resumo.consultas_hoje?.length ?? 0;
        if (profissionalDashboard) profissionalDashboard.textContent = (terapeutaAtual?.nome || 'terapeuta').split(' ')[0];
        if (dataDashboard) dataDashboard.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());
        const agenda = document.getElementById('tabela-dash-agenda');
        const host = agenda?.closest('.table-container') || agenda;
        if (host) desenharTabela(host, resumo.consultas_hoje || [], ['data_hora', 'paciente_nome', 'status', 'observacoes'], {
            data_hora: 'Horário', paciente_nome: 'Paciente', status: 'Status', observacoes: 'Observações'
        }, 'Nenhum atendimento agendado para hoje.');
        const agora = new Date();
        const limite = new Date(agora); limite.setDate(limite.getDate() + 7);
        const proximos = agendaCompleta.filter(item => {
            const data = new Date(String(item.data_hora || '').replace(' ', 'T'));
            return Number.isFinite(data.getTime()) && data >= agora && data <= limite && item.status === 'Agendado';
        }).sort((a, b) => String(a.data_hora).localeCompare(String(b.data_hora)));
        const contadorProximos = document.getElementById('dash-proximos-atendimentos');
        if (contadorProximos) contadorProximos.textContent = proximos.length;
        const proximosHost = document.getElementById('tabela-dash-proximos');
        if (proximosHost) desenharTabela(proximosHost, proximos, ['data_hora', 'paciente_nome', 'status', 'observacoes'], {
            data_hora: 'Data e horário', paciente_nome: 'Paciente', status: 'Status', observacoes: 'Observações'
        }, 'Nenhum atendimento nos próximos sete dias.');
    } catch (erro) {
        console.error(erro);
        mostrarAviso('Não foi possível carregar o painel: ' + erro.message);
    }
}

function mostrarAviso(mensagem) {
    let aviso = document.getElementById('aviso-global');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-global';
        aviso.className = 'aviso-global';
        document.body.append(aviso);
    }
    aviso.textContent = mensagem;
    aviso.classList.add('visivel');
    window.setTimeout(() => aviso.classList.remove('visivel'), 5000);
}

function renderizarModulo(chave) {
    const definicao = modulos[chave];
    const root = document.getElementById(definicao.container);
    if (!root) return;
    const slug = definicao.route.slice(1).replaceAll('/', '-') + '-' + chave;
    const formId = `form-${slug}`;
    const listId = `lista-${slug}`;
    if (!root.querySelector(`#${formId}`)) {
        const painel = card(definicao.title, 'Preencha os dados do atendimento e salve para registrar no prontuário do paciente.');
        const form = document.createElement('form');
        form.id = formId;
        form.className = 'grade-formulario';
        const usaPacienteCompartilhado = ['anamnese', 'perfilOcupacional'].includes(chave);
        if (usaPacienteCompartilhado) form.dataset.avaliacaoCompartilhada = 'true';
        for (const campo of definicao.fields) {
            if (usaPacienteCompartilhado && campo.name === 'paciente_id') continue;
            form.append(grupoCampo(campo, `${slug}-`));
        }
        if (usaPacienteCompartilhado) {
            form.addEventListener('input', () => { form.dataset.rascunho = 'true'; });
            form.addEventListener('change', () => { form.dataset.rascunho = 'true'; });
        }
        const acoes = document.createElement('div');
        acoes.className = 'acoes-formulario campo-largo';
        const salvar = document.createElement('button');
        salvar.type = 'submit';
        salvar.className = 'btn-salvar';
        salvar.textContent = 'Salvar registro';
        const status = document.createElement('span');
        status.className = 'feedback-formulario';
        status.setAttribute('role', 'status');
        acoes.append(salvar, status);
        form.append(acoes);
        form.addEventListener('submit', async evento => {
            evento.preventDefault();
            if (usaPacienteCompartilhado && !idPacienteAvaliacaoCompartilhada()) {
                status.textContent = 'Selecione o paciente no início desta página.'; return;
            }
            status.textContent = 'Salvando...';
            const dados = {};
            for (const campo of definicao.fields) {
                if (['checklist', 'keyValue', 'repeatArray'].includes(campo.type)) {
                    dados[campo.name] = valorRepetidor(form, campo);
                    continue;
                }
                const input = form.elements.namedItem(campo.name);
                if (!input) continue;
                let valor = input.value;
                if (campo.type === 'number') valor = valor === '' ? null : Number(valor);
                if (campo.type === 'json') {
                    try { valor = valor.trim() ? JSON.parse(valor) : null; }
                    catch { status.textContent = `O campo “${campo.label}” precisa conter JSON válido.`; return; }
                }
                dados[campo.name] = valor === '' ? null : valor;
            }
            if (usaPacienteCompartilhado) dados.paciente_id = idPacienteAvaliacaoCompartilhada();
            try {
                const registroId = form.dataset.registroId;
                const atualizarCOPM = Boolean(registroId && chave === 'copm');
                await requestJSON(atualizarCOPM ? `/copm/${registroId}` : definicao.route, {
                    method: atualizarCOPM ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
                });
                form.reset(); delete form.dataset.registroId;
                delete form.dataset.rascunho;
                salvar.textContent = 'Salvar registro';
                const data = definicao.fields.find(field => field.name === definicao.dateField);
                if (data) form.elements.namedItem(data.name).value = dataLocal();
                resetarRepetidores(form, definicao.fields);
                preencherSeletoresPaciente();
                status.textContent = 'Registro salvo.';
                await renderizarListaModulo(definicao, listId, chave);
                await carregarDashboard();
            } catch (erro) {
                status.textContent = erro.message;
            }
        });
        painel.append(form);
        root.append(painel);

        const historico = card('Registros anteriores');
        const lista = document.createElement('div');
        lista.id = listId;
        historico.append(lista);
        root.append(historico);
        for (const campo of definicao.fields.filter(item => item.type === 'date')) {
            form.elements.namedItem(campo.name).value = dataLocal();
        }
    }
    preencherSeletoresPaciente();
    renderizarListaModulo(definicao, listId, chave);
}

function idPacienteAvaliacaoCompartilhada() {
    return document.getElementById('identificacao-paciente-selecao')?.value || '';
}

function idadePaciente(dataNascimento) {
    if (!dataNascimento) return '';
    const nascimento = new Date(`${String(dataNascimento).slice(0, 10)}T00:00:00`);
    if (!Number.isFinite(nascimento.getTime())) return '';
    const hoje = new Date();
    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();
    if (hoje.getDate() < nascimento.getDate()) meses--;
    if (meses < 0) { anos--; meses += 12; }
    if (anos < 0) return '';
    return anos ? `${anos} ano${anos === 1 ? '' : 's'}${meses ? ` e ${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}` : `${Math.max(meses, 0)} ${meses === 1 ? 'mês' : 'meses'}`;
}

function limparRascunhosAvaliacaoCompartilhada() {
    const forms = document.querySelectorAll('#conteudo-copm form[data-avaliacao-compartilhada]');
    forms.forEach(form => {
        const campos = form.id.includes('perfil_ocupacional') ? modulos.perfilOcupacional.fields : modulos.anamnese.fields;
        form.reset(); delete form.dataset.rascunho; delete form.dataset.registroId;
        const data = campos.find(campo => campo.name === 'data_avaliacao');
        if (data) form.elements.namedItem(data.name).value = dataLocal();
        const status = form.querySelector('.feedback-formulario'); if (status) status.textContent = '';
    });
    const copm = document.getElementById('form-copm');
    if (copm) {
        copm.reset(); delete copm.dataset.rascunho; delete copm.dataset.carregada;
        copm.elements.namedItem('data_avaliacao').value = dataLocal();
        const corpo = document.getElementById('tabela-copm-itens');
        if (corpo) { corpo.replaceChildren(); for (let i = 0; i < 5; i++) corpo.append(criarLinhaCOPM()); }
        const salvar = copm.querySelector('button[type="submit"]'); if (salvar) salvar.textContent = 'Salvar avaliação inicial';
        const status = document.getElementById('status-copm'); if (status) status.textContent = '';
        atualizarMediasCOPM();
    }
    const reavaliacao = document.getElementById('form-copm-reavaliacao');
    if (reavaliacao) {
        reavaliacao.replaceChildren(); reavaliacao.hidden = true;
        delete reavaliacao.dataset.rascunho; delete reavaliacao.dataset.pacienteId; delete reavaliacao.dataset.avaliacaoBase; delete reavaliacao.dataset.etapa;
        const status = document.getElementById('status-copm-reavaliacao'); if (status) status.textContent = '';
        const dataReavaliacao = document.getElementById('copm-reavaliacao-data'); if (dataReavaliacao) dataReavaliacao.value = dataLocal();
    }
}

function atualizarResumoPacienteAvaliacao() {
    const resumo = document.getElementById('identificacao-paciente-resumo');
    if (!resumo) return;
    resumo.replaceChildren();
    const paciente = pacientes.find(item => String(item.id) === String(idPacienteAvaliacaoCompartilhada()));
    if (!paciente) {
        resumo.textContent = 'Selecione um paciente para preencher as três avaliações nesta página.';
        return;
    }
    for (const [rotulo, valor] of [
        ['Paciente', paciente.nome], ['Nascimento', paciente.data_nascimento], ['Idade', idadePaciente(paciente.data_nascimento)],
        ['Diagnóstico', paciente.diagnostico], ['Responsável', paciente.responsavel], ['Telefone', paciente.telefone]
    ]) {
        const item = document.createElement('p'); const forte = document.createElement('strong');
        forte.textContent = `${rotulo}: `; item.append(forte, document.createTextNode(valor || 'Não informado')); resumo.append(item);
    }
}

function renderizarIdentificacaoPaciente(root) {
    if (root.querySelector('#identificacao-paciente')) return;
    const painel = card('Paciente em atendimento', 'Selecione uma vez. A mesma identificação será usada na Anamnese, no Perfil Ocupacional e na COPM.');
    painel.id = 'identificacao-paciente';
    const selecao = document.createElement('select'); selecao.dataset.patientSelect = 'true'; selecao.add(new Option('Selecione o paciente...', ''));
    const label = document.createElement('label'); label.textContent = 'Paciente'; label.htmlFor = 'identificacao-paciente-selecao';
    selecao.id = 'identificacao-paciente-selecao';
    const grupo = document.createElement('div'); grupo.className = 'form-grupo'; grupo.append(label, selecao); painel.append(grupo);
    const resumo = document.createElement('div'); resumo.className = 'identificacao-resumo'; resumo.id = 'identificacao-paciente-resumo'; painel.append(resumo);
    selecao.addEventListener('change', async () => {
        const novoId = selecao.value;
        const temRascunho = [...document.querySelectorAll('#conteudo-copm form[data-avaliacao-compartilhada]')]
            .concat([...document.querySelectorAll('#form-copm, #form-copm-reavaliacao')]).some(form => form.dataset.rascunho === 'true');
        if (pacienteSelecionadoNaPaginaClinica && pacienteSelecionadoNaPaginaClinica !== novoId) {
            if (temRascunho) {
                const confirmado = confirm('Há informações ainda não salvas nesta página. Deseja descartá-las e trocar de paciente?');
                if (!confirmado) { selecao.value = pacienteSelecionadoNaPaginaClinica; return; }
            }
            limparRascunhosAvaliacaoCompartilhada();
        }
        pacienteSelecionadoNaPaginaClinica = novoId;
        atualizarResumoPacienteAvaliacao();
        await Promise.all([
            renderizarListaModulo(modulos.anamnese, 'lista-anamnese-anamnese', 'anamnese'),
            renderizarListaModulo(modulos.perfilOcupacional, 'lista-perfil_ocupacional-perfilOcupacional', 'perfilOcupacional'),
            carregarListaCOPM(), carregarHistoricoReavaliacoesCOPM()
        ]);
    });
    root.append(painel); preencherSeletoresPaciente(); atualizarResumoPacienteAvaliacao();
}

function criarLinhaCOPM(registro = {}) {
    const linha = document.createElement('tr');
    if (registro.id) linha.dataset.registroId = registro.id;
    const campos = [
        ['atividade_problema', 'textarea', 'Descreva um problema ou atividade ocupacional'],
        ['nivel_importancia', 'score', 'Importância · 1 a 10'], ['desempenho_inicial', 'score', 'Desempenho · 1 a 10'],
        ['satisfacao_inicial', 'score', 'Satisfação · 1 a 10']
    ];
    for (const [campo, tipo, ajuda] of campos) {
        const celula = document.createElement('td');
        celula.dataset.label = ({ atividade_problema: 'Problema ou atividade ocupacional', nivel_importancia: 'Importância', desempenho_inicial: 'Desempenho inicial', satisfacao_inicial: 'Satisfação inicial' })[campo];
        let input;
        if (tipo === 'textarea') {
            input = document.createElement('textarea'); input.rows = 2; input.placeholder = ajuda;
        } else {
            input = document.createElement('select'); input.add(new Option('Nota', ''));
            for (let nota = 1; nota <= 10; nota++) input.add(new Option(String(nota), String(nota)));
            input.className = 'nota-copm'; input.setAttribute('aria-label', celula.dataset.label);
        }
        input.dataset.campo = campo; input.value = registro[campo] ?? '';
        input.addEventListener('input', atualizarMediasCOPM); input.addEventListener('change', atualizarMediasCOPM);
        celula.append(input); linha.append(celula);
    }
    return linha;
}

function mediasCOPM(linhas, campo) {
    const valores = [...linhas].map(linha => Number(linha.querySelector(`[data-campo="${campo}"]`).value)).filter(n => Number.isFinite(n) && n > 0);
    return valores.length ? (valores.reduce((soma, valor) => soma + valor, 0) / valores.length).toFixed(1) : '—';
}

function atualizarMediasCOPM() {
    const linhas = document.querySelectorAll('#tabela-copm-itens tr'); if (!linhas.length) return;
    for (const campo of ['desempenho_inicial', 'satisfacao_inicial']) {
        const alvo = document.getElementById(`media-${campo}`);
        if (alvo) alvo.textContent = mediasCOPM(linhas, campo);
    }
}

function renderizarCOPM() {
    const root = document.getElementById('conteudo-copm');
    if (root.dataset.copmInicializado) { carregarListaCOPM(); carregarHistoricoReavaliacoesCOPM(); return; }
    root.dataset.copmInicializado = 'true';
    const painel = card('COPM — Medida Canadense de Desempenho Ocupacional', 'Registre até cinco problemas ocupacionais e os escores iniciais. As reavaliações são salvas em etapas separadas e podem ser repetidas quantas vezes forem necessárias.');
    const form = document.createElement('form'); form.id = 'form-copm'; form.noValidate = true; form.dataset.avaliacaoCompartilhada = 'true';
    form.addEventListener('input', () => { form.dataset.rascunho = 'true'; });
    form.addEventListener('change', () => { form.dataset.rascunho = 'true'; });
    const topo = document.createElement('div'); topo.className = 'grade-formulario';
    const data = grupoCampo({ name: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true }, 'copm-');
    data.querySelector('input').value = dataLocal();
    topo.append(data); form.append(topo);
    const help = document.createElement('p'); help.className = 'texto-ajuda';
    help.textContent = 'Preencha importância, desempenho e satisfação iniciais. Depois de salvar, registre cada reavaliação no painel abaixo, sem substituir os resultados anteriores.'; form.append(help);

    const envoltorio = document.createElement('div'); envoltorio.className = 'copm-tabela-wrap';
    const tabela = document.createElement('table'); tabela.className = 'tabela-copm';
    const th = document.createElement('thead'); const cab = document.createElement('tr');
    for (const titulo of ['Problema ou atividade ocupacional', 'Importância', 'Desempenho inicial', 'Satisfação inicial']) {
        const cel = document.createElement('th'); cel.textContent = titulo; cab.append(cel);
    }
    th.append(cab); tabela.append(th);
    const corpo = document.createElement('tbody'); corpo.id = 'tabela-copm-itens';
    for (let i = 0; i < 5; i++) corpo.append(criarLinhaCOPM());
    tabela.append(corpo); envoltorio.append(tabela); form.append(envoltorio);

    const medias = document.createElement('div'); medias.className = 'medias-copm';
    for (const [campo, label] of [['desempenho_inicial', 'Média do desempenho inicial'], ['satisfacao_inicial', 'Média da satisfação inicial']]) {
        const caixa = document.createElement('p'); caixa.textContent = `${label}: `;
        const valor = document.createElement('strong'); valor.id = `media-${campo}`; valor.textContent = '—'; caixa.append(valor); medias.append(caixa);
    }
    form.append(medias);
    const acoes = document.createElement('div'); acoes.className = 'acoes-formulario';
    const nova = document.createElement('button'); nova.type = 'button'; nova.className = 'btn-acao'; nova.textContent = 'Nova avaliação inicial';
    nova.addEventListener('click', () => {
        const corpo = document.getElementById('tabela-copm-itens'); corpo.replaceChildren();
        for (let i = 0; i < 5; i++) corpo.append(criarLinhaCOPM());
        form.elements.namedItem('data_avaliacao').value = dataLocal(); delete form.dataset.carregada; delete form.dataset.rascunho;
        form.querySelector('button[type="submit"]').textContent = 'Salvar avaliação inicial';
        document.getElementById('status-copm').textContent = ''; atualizarMediasCOPM();
    });
    const carregar = document.createElement('button'); carregar.type = 'button'; carregar.className = 'btn-acao'; carregar.textContent = 'Carregar última avaliação';
    carregar.addEventListener('click', carregarUltimaCOPM);
    const salvar = document.createElement('button'); salvar.type = 'submit'; salvar.className = 'btn-salvar'; salvar.textContent = 'Salvar avaliação inicial';
    const status = document.createElement('span'); status.id = 'status-copm'; status.className = 'feedback-formulario';
    acoes.append(nova, carregar, salvar, status); form.append(acoes); painel.append(form); root.append(painel);
    form.addEventListener('submit', salvarCOPM);

    const painelReavaliacao = card('Acompanhamento e reavaliações', 'Compare cada problema com a avaliação inicial. Cada salvamento cria uma nova etapa datada e mantém as anteriores no histórico desta tela.');
    const controles = document.createElement('div'); controles.className = 'copm-reavaliacao-controles';
    const grupoBase = document.createElement('div'); grupoBase.className = 'form-grupo';
    const labelBase = document.createElement('label'); labelBase.htmlFor = 'copm-reavaliacao-base'; labelBase.textContent = 'Avaliação inicial de referência';
    const baseSelect = document.createElement('select'); baseSelect.id = 'copm-reavaliacao-base'; baseSelect.add(new Option('Selecione uma avaliação inicial...', ''));
    grupoBase.append(labelBase, baseSelect);
    const grupoData = document.createElement('div'); grupoData.className = 'form-grupo';
    const labelData = document.createElement('label'); labelData.htmlFor = 'copm-reavaliacao-data'; labelData.textContent = 'Data desta reavaliação';
    const dataReavaliacao = document.createElement('input'); dataReavaliacao.id = 'copm-reavaliacao-data'; dataReavaliacao.type = 'date'; dataReavaliacao.value = dataLocal();
    grupoData.append(labelData, dataReavaliacao);
    const preparar = document.createElement('button'); preparar.type = 'button'; preparar.className = 'btn-acao'; preparar.textContent = 'Iniciar reavaliação';
    controles.append(grupoBase, grupoData, preparar); painelReavaliacao.append(controles);
    const statusReavaliacao = document.createElement('p'); statusReavaliacao.id = 'status-copm-reavaliacao'; statusReavaliacao.className = 'feedback-formulario'; statusReavaliacao.setAttribute('role', 'status'); painelReavaliacao.append(statusReavaliacao);
    const formReavaliacao = document.createElement('form'); formReavaliacao.id = 'form-copm-reavaliacao'; formReavaliacao.className = 'copm-reavaliacao-form'; formReavaliacao.noValidate = true; formReavaliacao.hidden = true;
    formReavaliacao.addEventListener('input', () => { formReavaliacao.dataset.rascunho = 'true'; });
    formReavaliacao.addEventListener('change', () => { formReavaliacao.dataset.rascunho = 'true'; });
    formReavaliacao.addEventListener('submit', salvarReavaliacaoCOPM); painelReavaliacao.append(formReavaliacao);
    const tituloHistorico = document.createElement('h3'); tituloHistorico.className = 'copm-reavaliacoes-titulo'; tituloHistorico.textContent = 'Histórico de reavaliações'; painelReavaliacao.append(tituloHistorico);
    const historicoReavaliacoes = document.createElement('div'); historicoReavaliacoes.id = 'lista-copm-reavaliacoes'; historicoReavaliacoes.className = 'copm-reavaliacoes-historico'; painelReavaliacao.append(historicoReavaliacoes);
    preparar.addEventListener('click', async () => {
        const pacienteId = idPacienteAvaliacaoCompartilhada(); const dataBase = baseSelect.value;
        if (!pacienteId) { statusReavaliacao.textContent = 'Selecione o paciente no início desta página.'; return; }
        if (!dataBase) { statusReavaliacao.textContent = 'Selecione uma avaliação inicial de referência.'; return; }
        if (!formReavaliacao.hidden && formReavaliacao.dataset.rascunho === 'true'
            && !confirm('Há notas desta reavaliação ainda não salvas. Deseja descartá-las e iniciar outra?')) return;
        preparar.disabled = true; statusReavaliacao.textContent = 'Carregando os problemas ocupacionais…';
        try {
            const [registros, reavaliacoesAnteriores] = await Promise.all([
                requestJSON(`/copm?paciente_id=${encodeURIComponent(pacienteId)}`),
                requestJSON(`/copm/reavaliacoes?paciente_id=${encodeURIComponent(pacienteId)}`)
            ]);
            const problemas = registros.filter(item => String(item.paciente_id) === String(pacienteId) && String(item.data_avaliacao).slice(0, 10) === dataBase)
                .sort((a, b) => Number(a.id) - Number(b.id)).slice(0, 5);
            if (!problemas.length) { statusReavaliacao.textContent = 'Não encontrei problemas na avaliação inicial selecionada.'; return; }
            const etapasSalvas = new Set(reavaliacoesAnteriores.filter(item =>
                String(item.paciente_id) === String(pacienteId) && String(item.data_avaliacao_base).slice(0, 10) === dataBase
            ).map(item => String(item.sessao_id)));
            const proximaEtapa = etapasSalvas.size + 1;
            formReavaliacao.replaceChildren();
            const listaProblemas = document.createElement('div'); listaProblemas.className = 'copm-reavaliacao-itens';
            for (const problema of problemas) {
                const item = document.createElement('section'); item.className = 'copm-reavaliacao-item'; item.dataset.metaId = String(problema.id);
                item.dataset.desempenhoInicial = problema.desempenho_inicial ?? '';
                item.dataset.satisfacaoInicial = problema.satisfacao_inicial ?? '';
                const titulo = document.createElement('h4'); titulo.textContent = problema.atividade_problema || 'Problema ocupacional'; item.append(titulo);
                const inicial = document.createElement('p'); inicial.className = 'copm-reavaliacao-inicial';
                inicial.textContent = `Avaliação inicial · importância ${problema.nivel_importancia || '—'}/10 · desempenho ${problema.desempenho_inicial || '—'}/10 · satisfação ${problema.satisfacao_inicial || '—'}/10`;
                item.append(inicial);
                const anterior = reavaliacoesAnteriores.filter(registro =>
                    String(registro.copm_meta_id) === String(problema.id) && String(registro.data_avaliacao_base).slice(0, 10) === dataBase
                ).sort((a, b) => Number(b.sessao_id) - Number(a.sessao_id))[0];
                if (anterior) {
                    const comparacao = document.createElement('p'); comparacao.className = 'copm-reavaliacao-anterior';
                    const dataAnterior = anterior.legado ? 'data não informada' : formatarValor(anterior.data_reavaliacao);
                    comparacao.textContent = `Última etapa (${dataAnterior}) · desempenho ${anterior.reavaliacao_desempenho ?? '—'}/10 · satisfação ${anterior.reavaliacao_satisfacao ?? '—'}/10`;
                    item.append(comparacao);
                }
                const notas = document.createElement('div'); notas.className = 'copm-reavaliacao-notas';
                for (const [campo, rotulo] of [['desempenho', 'Desempenho nesta etapa'], ['satisfacao', 'Satisfação nesta etapa']]) {
                    const grupo = document.createElement('div'); grupo.className = 'form-grupo';
                    const label = document.createElement('label'); label.textContent = rotulo;
                    const select = document.createElement('select'); select.dataset.campo = campo; select.required = true;
                    select.setAttribute('aria-label', `${rotulo}: ${titulo.textContent}`);
                    select.add(new Option('Escolha uma nota...', '')); for (let nota = 1; nota <= 10; nota++) select.add(new Option(`${nota} / 10`, String(nota)));
                    grupo.append(label, select); notas.append(grupo);
                }
                const observacaoGrupo = document.createElement('div'); observacaoGrupo.className = 'form-grupo campo-largo';
                const observacaoLabel = document.createElement('label'); observacaoLabel.textContent = 'Observação deste problema (opcional)';
                const observacao = document.createElement('textarea'); observacao.dataset.campo = 'observacao'; observacao.rows = 2;
                observacaoGrupo.append(observacaoLabel, observacao); notas.append(observacaoGrupo);
                item.append(notas); listaProblemas.append(item);
            }
            const acoesReavaliacao = document.createElement('div'); acoesReavaliacao.className = 'acoes-formulario';
            const salvarEtapa = document.createElement('button'); salvarEtapa.type = 'submit'; salvarEtapa.className = 'btn-salvar'; salvarEtapa.textContent = 'Salvar esta reavaliação';
            acoesReavaliacao.append(salvarEtapa); formReavaliacao.append(listaProblemas, acoesReavaliacao);
            formReavaliacao.dataset.pacienteId = String(pacienteId); formReavaliacao.dataset.avaliacaoBase = dataBase; formReavaliacao.dataset.etapa = String(proximaEtapa);
            delete formReavaliacao.dataset.rascunho; formReavaliacao.hidden = false;
            statusReavaliacao.textContent = `${problemas.length} problema(s) carregado(s) para a reavaliação ${proximaEtapa}. Preencha os dois escores em cada um.`;
            formReavaliacao.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (erro) { statusReavaliacao.textContent = `Não foi possível abrir a avaliação inicial: ${erro.message}`; }
        finally { preparar.disabled = false; }
    });
    root.append(painelReavaliacao);

    const historico = card('Avaliações iniciais registradas');
    const lista = document.createElement('div'); lista.id = 'lista-copm'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarListaCOPM(); carregarHistoricoReavaliacoesCOPM();
}

async function carregarUltimaCOPM() {
    const pacienteId = idPacienteAvaliacaoCompartilhada();
    if (!pacienteId) { mostrarAviso('Selecione o paciente primeiro.'); return; }
    try {
        const registros = await requestJSON(`/copm?paciente_id=${encodeURIComponent(pacienteId)}`);
        const pacienteRows = registros.filter(row => String(row.paciente_id) === String(pacienteId));
        if (!pacienteRows.length) { mostrarAviso('Não há COPM anterior para este paciente.'); return; }
        const dataMaisRecente = pacienteRows[0].data_avaliacao;
        await abrirGrupoCOPM(pacienteId, dataMaisRecente);
    } catch (erro) { mostrarAviso(erro.message); }
}

async function abrirGrupoCOPM(pacienteId, dataAvaliacao) {
    const registros = await requestJSON(`/copm?paciente_id=${encodeURIComponent(pacienteId)}`);
    const grupo = registros.filter(row => String(row.paciente_id) === String(pacienteId) && row.data_avaliacao === dataAvaliacao).slice(0, 5);
    if (!grupo.length) throw new Error('Esta avaliação COPM não foi encontrada.');
    const seletorPaciente = document.getElementById('identificacao-paciente-selecao');
    seletorPaciente.value = String(pacienteId);
    seletorPaciente.dispatchEvent(new Event('change', { bubbles: true }));
    if (seletorPaciente.value !== String(pacienteId)) return;
    const corpo = document.getElementById('tabela-copm-itens'); corpo.replaceChildren();
    for (let i = 0; i < 5; i++) corpo.append(criarLinhaCOPM(grupo[i] || {}));
    document.querySelector('#form-copm [name="data_avaliacao"]').value = dataAvaliacao;
    document.getElementById('form-copm').dataset.carregada = 'true';
    document.querySelector('#form-copm button[type="submit"]').textContent = 'Atualizar avaliação inicial';
    atualizarMediasCOPM(); document.getElementById('form-copm').scrollIntoView({ behavior: 'smooth' });
}

async function salvarCOPM(evento) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const pacienteId = idPacienteAvaliacaoCompartilhada();
    const data = form.elements.namedItem('data_avaliacao').value;
    const itens = [...document.querySelectorAll('#tabela-copm-itens tr')].map(linha => {
        const item = { id: linha.dataset.registroId || null };
        linha.querySelectorAll('[data-campo]').forEach(input => { item[input.dataset.campo] = input.value || null; });
        return item;
    }).filter(item => item.atividade_problema?.trim());
    const status = document.getElementById('status-copm'); status.textContent = 'Salvando...';
    if (!pacienteId || !data) { status.textContent = 'Selecione o paciente e informe a data da avaliação.'; return; }
    if (!itens.length || itens.length > 5) { status.textContent = 'Preencha ao menos um problema ocupacional (até cinco).'; return; }
    const camposObrigatorios = ['nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial'];
    for (const item of itens) {
        for (const campo of camposObrigatorios) {
            const nota = Number(item[campo]);
            if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
                status.textContent = 'Preencha importância, desempenho e satisfação iniciais com notas de 1 a 10 em cada problema.'; return;
            }
        }
    }
    try {
        await requestJSON('/copm/lote', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente_id: pacienteId, data_avaliacao: data, itens })
        });
        const salvos = await requestJSON(`/copm?paciente_id=${encodeURIComponent(pacienteId)}`);
        const rows = salvos.filter(row => row.data_avaliacao === data).slice(0, 5);
        const corpo = document.getElementById('tabela-copm-itens'); corpo.replaceChildren();
        for (let i = 0; i < 5; i++) corpo.append(criarLinhaCOPM(rows[i] || {}));
        delete form.dataset.carregada; form.querySelector('button[type="submit"]').textContent = 'Salvar avaliação inicial';
        atualizarMediasCOPM();
        delete form.dataset.rascunho;
        status.textContent = 'Avaliação inicial salva.'; await carregarListaCOPM(); await carregarDashboard();
    } catch (erro) { status.textContent = erro.message; }
}

async function salvarReavaliacaoCOPM(evento) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const status = document.getElementById('status-copm-reavaliacao');
    const pacienteId = idPacienteAvaliacaoCompartilhada();
    const dataReavaliacao = document.getElementById('copm-reavaliacao-data')?.value;
    if (!pacienteId || form.dataset.pacienteId !== String(pacienteId)) { status.textContent = 'O paciente selecionado mudou. Inicie a reavaliação novamente.'; return; }
    if (!dataReavaliacao) { status.textContent = 'Informe a data desta reavaliação.'; return; }
    if (dataReavaliacao < form.dataset.avaliacaoBase) { status.textContent = 'A data da reavaliação deve ser igual ou posterior à avaliação inicial.'; return; }
    const itens = [...form.querySelectorAll('.copm-reavaliacao-item')].map(item => {
        const obter = campo => item.querySelector(`[data-campo="${campo}"]`)?.value || null;
        return { copm_meta_id: item.dataset.metaId, desempenho: obter('desempenho'), satisfacao: obter('satisfacao'), observacao: obter('observacao') };
    });
    if (!itens.length || itens.some(item => !item.desempenho || !item.satisfacao)) { status.textContent = 'Preencha desempenho e satisfação em todos os problemas.'; return; }
    const botao = form.querySelector('button[type="submit"]'); botao.disabled = true; status.textContent = 'Salvando esta etapa…';
    try {
        const comparacao = [...form.querySelectorAll('.copm-reavaliacao-item')].map(item => ({
            desempenho_inicial: item.dataset.desempenhoInicial,
            satisfacao_inicial: item.dataset.satisfacaoInicial,
            reavaliacao_desempenho: item.querySelector('[data-campo="desempenho"]')?.value,
            reavaliacao_satisfacao: item.querySelector('[data-campo="satisfacao"]')?.value
        }));
        const resumoResultado = resumirMediasReavaliacaoCOPM(comparacao);
        await requestJSON('/copm/reavaliacoes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paciente_id: pacienteId, data_avaliacao_base: form.dataset.avaliacaoBase, data_reavaliacao: dataReavaliacao, itens })
        });
        form.replaceChildren(); form.hidden = true;
        delete form.dataset.rascunho; delete form.dataset.pacienteId; delete form.dataset.avaliacaoBase; delete form.dataset.etapa;
        status.textContent = `Reavaliação salva. ${resumoResultado.texto} Confira as médias e os detalhes no histórico abaixo.`;
        await carregarHistoricoReavaliacoesCOPM();
    } catch (erro) { status.textContent = `Não foi possível salvar a reavaliação: ${erro.message}`; }
    finally { botao.disabled = false; }
}

async function carregarListaCOPM() {
    const host = document.getElementById('lista-copm'); if (!host) return;
    try {
        const todosRegistros = await requestJSON('/copm');
        const pacienteId = idPacienteAvaliacaoCompartilhada();
        const registros = pacienteId ? todosRegistros.filter(item => String(item.paciente_id) === String(pacienteId)) : [];
        const grupos = new Map();
        for (const registro of registros) {
            const chave = `${registro.paciente_id}|${registro.data_avaliacao}`;
            if (!grupos.has(chave)) grupos.set(chave, []);
            grupos.get(chave).push(registro);
        }
        const lista = [...grupos.values()].map(rows => ({
            paciente_id: rows[0].paciente_id, paciente_nome: rows[0].paciente_nome, data_avaliacao: rows[0].data_avaliacao,
            ids: rows.map(row => row.id),
            total: rows.length, desempenho_inicial: mediasCOPMdeRows(rows, 'desempenho_inicial'),
            satisfacao_inicial: mediasCOPMdeRows(rows, 'satisfacao_inicial')
        })).sort((a, b) => String(b.data_avaliacao).localeCompare(String(a.data_avaliacao)));
        const baseSelect = document.getElementById('copm-reavaliacao-base');
        if (baseSelect) {
            const valorAtual = baseSelect.value; baseSelect.replaceChildren(new Option('Selecione uma avaliação inicial...', ''));
            lista.forEach(grupo => baseSelect.add(new Option(`${formatarValor(grupo.data_avaliacao)} · ${grupo.total} problema(s)`, String(grupo.data_avaliacao).slice(0, 10))));
            baseSelect.value = lista.some(grupo => String(grupo.data_avaliacao).slice(0, 10) === valorAtual)
                ? valorAtual : (lista.length ? String(lista[0].data_avaliacao).slice(0, 10) : '');
        }
        host.replaceChildren();
        const grade = document.createElement('div'); grade.className = 'copm-avaliacoes-lista'; host.append(grade);
        if (!lista.length) {
            const vazio = document.createElement('p'); vazio.className = 'texto-ajuda';
            vazio.textContent = pacienteId ? 'Nenhuma avaliação inicial COPM registrada para este paciente.' : 'Selecione o paciente acima para ver as avaliações.';
            grade.append(vazio); return;
        }
        for (const grupo of lista) {
            const item = document.createElement('article'); item.className = 'copm-avaliacao-resumo';
            const cabecalho = document.createElement('div'); cabecalho.className = 'copm-avaliacao-resumo-cabecalho';
            const titulo = document.createElement('h3'); titulo.textContent = `Avaliação inicial · ${formatarValor(grupo.data_avaliacao)}`;
            const total = document.createElement('span'); total.className = 'copm-badge'; total.textContent = `${grupo.total} problema(s)`;
            cabecalho.append(titulo, total); item.append(cabecalho);
            const mediasGrupo = document.createElement('div'); mediasGrupo.className = 'copm-avaliacao-medias';
            for (const [label, valor] of [['Desempenho inicial', grupo.desempenho_inicial], ['Satisfação inicial', grupo.satisfacao_inicial]]) {
                const media = document.createElement('div'); media.className = 'copm-avaliacao-media';
                const nome = document.createElement('span'); nome.textContent = label; const nota = document.createElement('strong'); nota.textContent = `${valor}/10`;
                media.append(nome, nota); mediasGrupo.append(media);
            }
            item.append(mediasGrupo);
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela copm-avaliacao-acoes';
            const abrir = document.createElement('button'); abrir.type = 'button'; abrir.className = 'btn-acao'; abrir.textContent = 'Abrir avaliação inicial';
            abrir.addEventListener('click', async () => { try { await abrirGrupoCOPM(grupo.paciente_id, grupo.data_avaliacao); } catch (erro) { mostrarAviso(erro.message); } });
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm(`Excluir esta avaliação inicial e seus ${grupo.total} problema(s)? As reavaliações salvas permanecem no histórico como registros desta avaliação.`)) return;
                try { for (const id of grupo.ids) await requestJSON(`/copm/${id}`, { method: 'DELETE' }); await carregarListaCOPM(); await carregarDashboard(); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(abrir, excluir); item.append(acoes); grade.append(item);
        }
    } catch (erro) { host.textContent = 'Não foi possível carregar as avaliações: ' + erro.message; }
}

async function carregarHistoricoReavaliacoesCOPM() {
    const host = document.getElementById('lista-copm-reavaliacoes'); if (!host) return;
    const pacienteId = idPacienteAvaliacaoCompartilhada(); host.replaceChildren();
    if (!pacienteId) { host.textContent = 'Selecione um paciente para ver as reavaliações.'; return; }
    try {
        const linhas = await requestJSON(`/copm/reavaliacoes?paciente_id=${encodeURIComponent(pacienteId)}`);
        const grupos = new Map();
        linhas.filter(item => String(item.paciente_id) === String(pacienteId)).forEach(item => {
            if (!grupos.has(String(item.sessao_id))) grupos.set(String(item.sessao_id), { ...item, itens: [] });
            grupos.get(String(item.sessao_id)).itens.push(item);
        });
        if (!grupos.size) { host.textContent = 'Ainda não há reavaliações salvas para este paciente.'; return; }
        const resumo = document.createElement('p'); resumo.className = 'texto-ajuda'; resumo.textContent = `${grupos.size} etapa(s) de reavaliação salva(s).`; host.append(resumo);
        let indiceSessao = 0;
        const sessoesOrdenadas = [...grupos.values()].sort((a, b) => {
            if (Boolean(a.legado) !== Boolean(b.legado)) return a.legado ? -1 : 1;
            return String(a.data_reavaliacao || a.criado_em).localeCompare(String(b.data_reavaliacao || b.criado_em)) || Number(a.sessao_id) - Number(b.sessao_id);
        });
        const etapasPorBase = new Map();
        for (const grupo of sessoesOrdenadas) {
            const detalhes = document.createElement('details'); detalhes.className = 'copm-reavaliacao-historico-sessao';
            detalhes.open = indiceSessao++ === sessoesOrdenadas.length - 1;
            const sumario = document.createElement('summary');
            const chaveBase = String(grupo.data_avaliacao_base);
            const etapa = (etapasPorBase.get(chaveBase) || 0) + 1; etapasPorBase.set(chaveBase, etapa);
            const dataEtapa = grupo.legado ? 'Registro anterior · data não informada' : `Reavaliação ${etapa} · ${formatarValor(grupo.data_reavaliacao)}`;
            const resumoResultado = resumirMediasReavaliacaoCOPM(grupo.itens);
            const textoSumario = document.createElement('span'); textoSumario.textContent = `${dataEtapa} · referência inicial ${formatarValor(grupo.data_avaliacao_base)} · ${grupo.itens.length} problema(s)`;
            const mediasCompactas = document.createElement('span'); mediasCompactas.className = 'copm-reavaliacao-resumo-medias';
            mediasCompactas.textContent = `Desempenho ${formatarMediaReavaliacaoCOPM(resumoResultado.desempenho.inicial)} → ${formatarMediaReavaliacaoCOPM(resumoResultado.desempenho.reavaliacao)} · Satisfação ${formatarMediaReavaliacaoCOPM(resumoResultado.satisfacao.inicial)} → ${formatarMediaReavaliacaoCOPM(resumoResultado.satisfacao.reavaliacao)}`;
            sumario.append(textoSumario, mediasCompactas);
            detalhes.append(sumario);
            if (grupo.observacoes_sessao) { const nota = document.createElement('p'); nota.className = 'texto-ajuda'; nota.textContent = grupo.observacoes_sessao; detalhes.append(nota); }
            const painelResultado = document.createElement('section'); painelResultado.className = `copm-reavaliacao-resultado copm-resultado-${resumoResultado.status}`;
            const tituloResultado = document.createElement('h4'); tituloResultado.textContent = 'Comparação das médias · inicial → reavaliação';
            const indicacao = document.createElement('p'); indicacao.className = 'copm-reavaliacao-indicacao'; indicacao.textContent = resumoResultado.texto;
            painelResultado.append(tituloResultado, indicacao);
            const mediasResultado = document.createElement('div'); mediasResultado.className = 'copm-reavaliacao-medias';
            for (const [chave, rotulo] of [['desempenho', 'Desempenho médio'], ['satisfacao', 'Satisfação média']]) {
                const media = resumoResultado[chave];
                const cartao = document.createElement('div'); cartao.className = `copm-reavaliacao-media copm-media-${media.status}`;
                const nome = document.createElement('span'); nome.textContent = rotulo;
                const valor = document.createElement('strong'); valor.textContent = `${formatarMediaReavaliacaoCOPM(media.inicial)} → ${formatarMediaReavaliacaoCOPM(media.reavaliacao)}`;
                const variacao = document.createElement('small'); variacao.textContent = media.variacao === null ? 'Sem dados suficientes para comparar' : `Variação: ${formatarVariacaoReavaliacaoCOPM(media.variacao)} ponto(s)`;
                cartao.append(nome, valor, variacao); mediasResultado.append(cartao);
            }
            painelResultado.append(mediasResultado);
            const notaInterpretacao = document.createElement('p'); notaInterpretacao.className = 'copm-reavaliacao-nota-interpretacao';
            notaInterpretacao.textContent = 'Indicador descritivo calculado pelas médias dos problemas registrados; considere também o contexto clínico.';
            painelResultado.append(notaInterpretacao); detalhes.append(painelResultado);
            const listaItens = document.createElement('div'); listaItens.className = 'copm-reavaliacao-historico-itens';
            for (const item of grupo.itens) {
                const linha = document.createElement('article'); linha.className = 'copm-reavaliacao-historico-item';
                const titulo = document.createElement('h4'); titulo.textContent = item.atividade_problema || 'Problema ocupacional'; linha.append(titulo);
                const desempenho = document.createElement('p'); desempenho.textContent = `Desempenho: inicial ${item.desempenho_inicial ?? '—'}/10 → reavaliação ${item.reavaliacao_desempenho ?? '—'}/10`;
                const satisfacao = document.createElement('p'); satisfacao.textContent = `Satisfação: inicial ${item.satisfacao_inicial ?? '—'}/10 → reavaliação ${item.reavaliacao_satisfacao ?? '—'}/10`;
                linha.append(desempenho, satisfacao);
                if (item.observacao_item) { const observacao = document.createElement('p'); observacao.className = 'copm-reavaliacao-observacao'; observacao.textContent = item.observacao_item; linha.append(observacao); }
                listaItens.append(linha);
            }
            detalhes.append(listaItens); host.append(detalhes);
        }
    } catch (erro) { host.textContent = `Não foi possível carregar o histórico de reavaliações: ${erro.message}`; }
}

function mediasCOPMdeRows(rows, campo) {
    const notas = rows.map(row => Number(row[campo])).filter(value => Number.isFinite(value) && value > 0);
    return notas.length ? (notas.reduce((total, value) => total + value, 0) / notas.length).toFixed(1) : '—';
}

function resumirMediasReavaliacaoCOPM(itens) {
    const calcular = valores => {
        const notas = valores.map(Number).filter(valor => Number.isFinite(valor) && valor >= 1 && valor <= 10);
        return notas.length ? notas.reduce((total, valor) => total + valor, 0) / notas.length : null;
    };
    const criarMedia = (campoInicial, campoReavaliacao) => {
        const inicial = calcular(itens.map(item => item[campoInicial]));
        const reavaliacao = calcular(itens.map(item => item[campoReavaliacao]));
        const variacao = inicial === null || reavaliacao === null ? null : Math.round((reavaliacao - inicial) * 10) / 10;
        return { inicial, reavaliacao, variacao, status: variacao === null ? 'parcial' : variacao > 0 ? 'subiu' : variacao < 0 ? 'caiu' : 'estavel' };
    };
    const desempenho = criarMedia('desempenho_inicial', 'reavaliacao_desempenho');
    const satisfacao = criarMedia('satisfacao_inicial', 'reavaliacao_satisfacao');
    let status = 'parcial';
    let texto = 'Comparação parcial: faltam notas válidas para comparar as duas médias.';
    if (desempenho.variacao !== null && satisfacao.variacao !== null) {
        const mudancas = [desempenho.variacao, satisfacao.variacao];
        if (mudancas.every(valor => valor > 0)) { status = 'favoravel'; texto = 'Tendência de melhora: as médias de desempenho e satisfação aumentaram.'; }
        else if (mudancas.every(valor => valor < 0)) { status = 'queda'; texto = 'Tendência de piora: as médias de desempenho e satisfação diminuíram.'; }
        else if (mudancas.every(valor => valor === 0)) { status = 'estavel'; texto = 'Sem alteração: as médias de desempenho e satisfação se mantiveram.'; }
        else if (mudancas.some(valor => valor > 0) && mudancas.some(valor => valor < 0)) { status = 'misto'; texto = 'Resultado misto: uma média aumentou e a outra diminuiu.'; }
        else {
            status = mudancas.some(valor => valor > 0) ? 'favoravel' : 'queda';
            texto = mudancas[0] > 0 || mudancas[1] > 0
                ? 'Tendência favorável: uma média aumentou e a outra se manteve.'
                : 'Tendência de piora: uma média diminuiu e a outra se manteve.';
        }
    } else if (desempenho.variacao !== null || satisfacao.variacao !== null) {
        const mediaDisponivel = desempenho.variacao !== null ? desempenho : satisfacao;
        const dimensao = desempenho.variacao !== null ? 'desempenho' : 'satisfação';
        status = mediaDisponivel.variacao > 0 ? 'favoravel' : mediaDisponivel.variacao < 0 ? 'queda' : 'estavel';
        texto = `Comparação parcial: a média de ${dimensao} ${mediaDisponivel.variacao > 0 ? 'aumentou' : mediaDisponivel.variacao < 0 ? 'diminuiu' : 'se manteve'}.`;
    }
    return { desempenho, satisfacao, status, texto };
}

function formatarMediaReavaliacaoCOPM(valor) {
    return valor === null ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatarVariacaoReavaliacaoCOPM(valor) {
    const formatado = formatarMediaReavaliacaoCOPM(Math.abs(valor));
    return valor > 0 ? `+${formatado}` : valor < 0 ? `−${formatado}` : formatado;
}

function adicionarAcoesFormulario(form, idStatus, textoBotao = 'Salvar avaliação') {
    const acoes = document.createElement('div'); acoes.className = 'acoes-formulario campo-largo';
    const salvar = document.createElement('button'); salvar.type = 'submit'; salvar.className = 'btn-salvar'; salvar.textContent = textoBotao;
    const status = document.createElement('span'); status.id = idStatus; status.className = 'feedback-formulario'; status.setAttribute('role', 'status');
    acoes.append(salvar, status); form.append(acoes);
}

function adicionarHistoricoEspecializado(host, rota, colunas, rotulos, definicao, mensagem) {
    return requestJSON(rota).then(registros => desenharTabela(host, registros, colunas, rotulos, mensagem, registro => {
        const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
        const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'btn-acao'; botao.textContent = 'Ver detalhes';
        botao.addEventListener('click', () => abrirDetalhesRegistro(registro, definicao)); acoes.append(botao);
        if (!['/avaliacao_sensorial', '/pedi_autocuidado'].includes(rota)) {
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm(`Excluir este registro de ${definicao.title}?`)) return;
                try { await requestJSON(`${rota}/${registro.id}`, { method: 'DELETE' }); await adicionarHistoricoEspecializado(host, rota, colunas, rotulos, definicao, mensagem); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(excluir);
        }
        return acoes;
    })).catch(erro => { host.textContent = 'Não foi possível carregar o histórico: ' + erro.message; });
}

function pontuacoesDoFormulario(form, pares) {
    return Object.fromEntries(pares.map(([nome]) => [nome, form.elements.namedItem(nome)?.value || 0]));
}

function renderizarSensorial() {
    const root = document.getElementById('conteudo-sensorial');
    if (!root || root.dataset.sensorialInicializado) { if (root) carregarHistoricoSensorial(); return; }
    root.dataset.sensorialInicializado = 'true';
    const painel = card('Avaliação sensorial e funcional', 'Marque cada habilidade na escala de 1 a 10. O gráfico radial acompanha as pontuações conforme o preenchimento.');
    const form = document.createElement('form'); form.id = 'form-sensorial'; form.className = 'grade-formulario'; form.noValidate = true;
    form.append(grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'sensorial-'));
    form.append(grupoCampo({ name: 'data_avaliacao', label: 'Data da avaliação', type: 'date' }, 'sensorial-'));
    form.elements.namedItem('data_avaliacao').value = dataLocal();
    for (const grupoDados of habilidadesSensoriais) {
        const fieldset = document.createElement('fieldset'); fieldset.className = 'escala-grupo campo-largo';
        const legenda = document.createElement('legend'); legenda.textContent = grupoDados.grupo; fieldset.append(legenda);
        const grade = document.createElement('div'); grade.className = 'grade-pontuacoes';
        for (const [nome, rotulo] of grupoDados.itens) grade.append(montarCampoPontuacao(nome, rotulo));
        fieldset.append(grade); form.append(fieldset);
    }
    const chartCard = card('Visualização radial', 'As notas são apresentadas nos mesmos cinco grupos do formulário.');
    const chart = document.createElement('div'); chart.className = 'radar-wrap'; chart.id = 'grafico-sensorial'; chartCard.append(chart);
    const todosItens = habilidadesSensoriais.flatMap(grupoDados => grupoDados.itens);
    adicionarLegendaRadar(chartCard, todosItens);
    const atualizar = () => desenharRadar(chart, todosItens, pontuacoesDoFormulario(form, todosItens));
    form.addEventListener('change', atualizar); form.addEventListener('input', atualizar); atualizar();
    adicionarAcoesFormulario(form, 'status-sensorial');
    form.addEventListener('submit', async evento => {
        evento.preventDefault();
        const status = document.getElementById('status-sensorial');
        const dados = Object.fromEntries(new FormData(form).entries());
        if (!dados.paciente_id || !dados.data_avaliacao) { status.textContent = 'Selecione o paciente e informe a data.'; return; }
        for (const [nome] of todosItens) {
            const valor = Number(dados[nome]);
            if (!Number.isInteger(valor) || valor < 1 || valor > 10) { status.textContent = 'Preencha todas as habilidades com notas de 1 a 10.'; form.elements.namedItem(nome).focus(); return; }
            dados[nome] = valor;
        }
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/avaliacao_sensorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const pacienteAtual = form.elements.namedItem('paciente_id').value;
            form.reset(); form.elements.namedItem('paciente_id').value = pacienteAtual;
            form.elements.namedItem('data_avaliacao').value = dataLocal(); atualizar();
            status.textContent = 'Avaliação sensorial salva.'; await carregarHistoricoSensorial(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    painel.append(form); root.append(painel, chartCard);
    const historico = card('Avaliações anteriores'); const lista = document.createElement('div'); lista.id = 'lista-sensorial'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarHistoricoSensorial();
}

async function carregarHistoricoSensorial() {
    const host = document.getElementById('lista-sensorial'); if (!host) return;
    await adicionarHistoricoEspecializado(host, '/avaliacao_sensorial', ['data_avaliacao', 'paciente_nome', 'contato_visual', 'motor_global', 'brincar'], {
        data_avaliacao: 'Data', paciente_nome: 'Paciente', contato_visual: 'Contato visual', motor_global: 'Motor global', brincar: 'Brincar'
    }, modulos.sensorial, 'Nenhuma avaliação sensorial registrada.');
}

function montarEixoRoda(nome, rotulo, cores, atualizar) {
    const linha = document.createElement('div'); linha.className = 'rv-eixo-row';
    const titulo = document.createElement('span'); titulo.className = 'rv-eixo-titulo'; titulo.textContent = rotulo;
    const controle = document.createElement('input'); controle.type = 'hidden'; controle.name = nome; controle.id = `roda-${nome}`;
    const opcoes = document.createElement('div'); opcoes.className = 'rv-notas-group'; opcoes.setAttribute('role', 'group'); opcoes.setAttribute('aria-label', `Nota para ${rotulo}`);
    for (let nota = 1; nota <= 10; nota++) {
        const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'rv-nota-btn';
        botao.dataset.eixo = nome; botao.dataset.v = String(nota); botao.textContent = String(nota);
        botao.style.setProperty('--rv-cor', cores[nota - 1]); botao.setAttribute('aria-pressed', 'false');
        botao.style.setProperty('--rv-texto', nota === 1 || nota === 10 ? '#ffffff' : '#1e293b');
        botao.addEventListener('click', () => {
            controle.value = String(nota);
            opcoes.querySelectorAll('.rv-nota-btn').forEach(item => {
                const ativo = item === botao; item.classList.toggle('ativo', ativo); item.setAttribute('aria-pressed', String(ativo));
            });
            atualizar();
        });
        opcoes.append(botao);
    }
    linha.append(titulo, opcoes, controle); return linha;
}

const coresNotasRoda = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'];

function marcarNotaRoda(form, nome, valor) {
    const controle = form.elements.namedItem(nome); if (!controle) return;
    controle.value = valor === null || valor === undefined ? '' : String(valor);
    form.querySelectorAll(`.rv-nota-btn[data-eixo="${nome}"]`).forEach(botao => {
        const ativo = botao.dataset.v === String(valor); botao.classList.toggle('ativo', ativo); botao.setAttribute('aria-pressed', String(ativo));
    });
}

function renderizarRodaVida() {
    const root = document.getElementById('conteudo-rodavida');
    if (!root || root.dataset.rodaInicializada) { if (root) carregarHistoricoRodaVida(); return; }
    root.dataset.rodaInicializada = 'true';
    const painel = card('Roda da Vida', 'Escolha uma nota de 1 a 10 para cada área. As cores e o gráfico ajudam a visualizar o resultado.');
    const form = document.createElement('form'); form.id = 'form-roda-vida'; form.className = 'grade-formulario'; form.noValidate = true;
    form.append(grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'roda-'));
    form.append(grupoCampo({ name: 'data_avaliacao', label: 'Data da avaliação', type: 'date' }, 'roda-'));
    form.elements.namedItem('data_avaliacao').value = dataLocal();
    const pontuacoes = document.createElement('div'); pontuacoes.className = 'rv-eixos';
    const chartCard = card('Sua roda em equilíbrio', 'Cada eixo corresponde à área numerada abaixo. A forma muda conforme as notas.');
    chartCard.classList.add('roda-chart-panel');
    const chart = document.createElement('div'); chart.className = 'radar-wrap roda-chart-wrap'; chart.id = 'grafico-roda-vida'; chartCard.append(chart);
    const resumoGrafico = document.createElement('div'); resumoGrafico.className = 'rv-chart-resumo';
    const resumoMedia = document.createElement('div'); resumoMedia.className = 'rv-chart-indicador';
    resumoMedia.innerHTML = '<span>MÉDIA ATUAL</span><strong>—</strong><small>de 10 pontos</small>';
    const resumoEixos = document.createElement('div'); resumoEixos.className = 'rv-chart-indicador rv-chart-indicador-secundario';
    resumoEixos.innerHTML = '<span>ÁREAS AVALIADAS</span><strong>0/12</strong><small>eixos preenchidos</small>';
    resumoGrafico.append(resumoMedia, resumoEixos); chartCard.append(resumoGrafico); adicionarLegendaRadar(chartCard, rodaAreas);
    const workspace = document.createElement('div'); workspace.className = 'roda-vida-workspace campo-largo';
    const opcoesGrafico = {
        tamanho: 520, raio: 176, distanciaRotulo: 215, gradiente: true, numerarEixos: true,
        cores: rodaAreas.map((_, indice) => ['#0f766e', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#a21caf', '#db2777', '#e11d48', '#ea580c', '#ca8a04', '#65a30d', '#059669'][indice])
    };
    const atualizar = () => {
        const valores = pontuacoesDoFormulario(form, rodaAreas);
        desenharRadar(chart, rodaAreas, valores, opcoesGrafico);
        const notas = rodaAreas.map(([nome]) => Number(valores[nome])).filter(nota => Number.isFinite(nota) && nota >= 1 && nota <= 10);
        const media = notas.length ? (notas.reduce((total, nota) => total + nota, 0) / notas.length).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
        resumoMedia.querySelector('strong').textContent = media;
        resumoEixos.querySelector('strong').textContent = `${notas.length}/12`;
    };
    chart.atualizarRoda = atualizar;
    for (const [nome, label] of rodaAreas) pontuacoes.append(montarEixoRoda(nome, label, coresNotasRoda, atualizar));
    workspace.append(pontuacoes, chartCard); form.append(workspace);
    const observacoes = grupoCampo({ name: 'observacoes', label: 'Observações', type: 'textarea', wide: true }, 'roda-'); form.append(observacoes);
    const limpar = document.createElement('button'); limpar.type = 'button'; limpar.className = 'btn-acao'; limpar.textContent = 'Limpar notas';
    limpar.addEventListener('click', () => { for (const [nome] of rodaAreas) marcarNotaRoda(form, nome, ''); atualizar(); });
    form.append(limpar);
    adicionarAcoesFormulario(form, 'status-roda-vida');
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); const status = document.getElementById('status-roda-vida');
        const dados = Object.fromEntries(new FormData(form).entries());
        if (!dados.paciente_id || !dados.data_avaliacao) { status.textContent = 'Selecione o paciente e informe a data.'; return; }
        for (const [nome] of rodaAreas) {
            const valor = Number(dados[nome]);
            if (!Number.isInteger(valor) || valor < 1 || valor > 10) { status.textContent = 'Escolha uma nota em cada uma das 12 áreas.'; form.querySelector(`.rv-nota-btn[data-eixo="${nome}"]`)?.focus(); return; }
            dados[nome] = valor;
        }
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/roda_vida', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const pacienteAtual = form.elements.namedItem('paciente_id').value;
            form.reset(); form.elements.namedItem('paciente_id').value = pacienteAtual;
            for (const [nome] of rodaAreas) marcarNotaRoda(form, nome, '');
            form.elements.namedItem('data_avaliacao').value = dataLocal(); atualizar();
            status.textContent = 'Roda da Vida salva.'; await carregarHistoricoRodaVida(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    atualizar(); painel.append(form); root.append(painel);
    const historico = card('Histórico de avaliações'); const lista = document.createElement('div'); lista.id = 'lista-roda-vida'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarHistoricoRodaVida();
}

async function carregarHistoricoRodaVida() {
    const host = document.getElementById('lista-roda-vida'); if (!host) return;
    try {
        const registros = await requestJSON('/roda_vida');
        const linhas = registros.map(registro => {
            const notas = rodaAreas.map(([nome]) => Number(registro[nome])).filter(nota => Number.isFinite(nota) && nota >= 1 && nota <= 10);
            return { ...registro, media: notas.length ? (notas.reduce((soma, nota) => soma + nota, 0) / notas.length).toFixed(1) : '—' };
        });
        desenharTabela(host, linhas, ['data_avaliacao', 'paciente_nome', 'media'], {
            data_avaliacao: 'Data', paciente_nome: 'Paciente', media: 'Média das áreas'
        }, 'Nenhuma Roda da Vida registrada.', registro => {
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
            const carregar = document.createElement('button'); carregar.type = 'button'; carregar.className = 'btn-acao'; carregar.textContent = 'Carregar dados';
            carregar.addEventListener('click', () => {
                const form = document.getElementById('form-roda-vida'); form.elements.namedItem('paciente_id').value = String(registro.paciente_id);
                form.elements.namedItem('data_avaliacao').value = String(registro.data_avaliacao || '').slice(0, 10);
                form.elements.namedItem('observacoes').value = registro.observacoes || '';
                for (const [nome] of rodaAreas) marcarNotaRoda(form, nome, registro[nome]);
                const grafico = document.getElementById('grafico-roda-vida');
                if (grafico?.atualizarRoda) grafico.atualizarRoda();
                else desenharRadar(grafico, rodaAreas, pontuacoesDoFormulario(form, rodaAreas));
                document.getElementById('status-roda-vida').textContent = 'Dados carregados para revisão; salvar registra uma nova avaliação.';
                form.scrollIntoView({ behavior: 'smooth' });
            });
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm('Excluir esta avaliação da Roda da Vida?')) return;
                try { await requestJSON(`/roda_vida/${registro.id}`, { method: 'DELETE' }); await carregarHistoricoRodaVida(); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(carregar, excluir); return acoes;
        });
    } catch (erro) { host.textContent = 'Não foi possível carregar o histórico: ' + erro.message; }
}

function renderizarPEDI() {
    const root = document.getElementById('conteudo-pedi');
    if (!root || root.dataset.pediInicializado) { if (root) carregarHistoricoPEDI(); return; }
    root.dataset.pediInicializado = 'true';
    const painel = card('PEDI — Autocuidado', 'Avalie os 73 itens da Parte I: marque 0 para “Incapaz” e 1 para “Capaz”. O total é calculado automaticamente.');
    const form = document.createElement('form'); form.id = 'form-pedi'; form.className = 'formulario-pedi'; form.noValidate = true;
    const topo = document.createElement('div'); topo.className = 'grade-formulario';
    topo.append(grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'pedi-'));
    topo.append(grupoCampo({ name: 'data_avaliacao', label: 'Data da avaliação', type: 'date' }, 'pedi-'));
    topo.querySelector('[name="data_avaliacao"]').value = dataLocal(); form.append(topo);
    const listaItens = [];
    let contador = 0;
    for (const [titulo, itens] of pediCategorias) {
        const fieldset = document.createElement('fieldset'); fieldset.className = 'pedi-grupo';
        const legenda = document.createElement('legend'); legenda.textContent = titulo; fieldset.append(legenda);
        itens.forEach((texto, indice) => {
            contador++;
            const codigo = `${titulo[0]}${indice + 1}`; const nome = `pedi_item_${contador}`;
            listaItens.push({ codigo, nome, texto });
            const linha = document.createElement('div'); linha.className = 'pedi-linha';
            const enunciado = document.createElement('span'); enunciado.className = 'pedi-enunciado'; enunciado.textContent = `${codigo}. ${texto}`; linha.append(enunciado);
            const opcoes = document.createElement('div'); opcoes.className = 'pedi-opcoes';
            for (const [valor, rotulo] of [['0', 'Incapaz'], ['1', 'Capaz']]) {
                const label = document.createElement('label'); const radio = document.createElement('input');
                radio.type = 'radio'; radio.name = nome; radio.value = valor; radio.required = true;
                radio.addEventListener('change', atualizarEscore);
                label.append(radio, document.createTextNode(rotulo)); opcoes.append(label);
            }
            linha.append(opcoes); fieldset.append(linha);
        });
        form.append(fieldset);
    }
    const resumo = document.createElement('div'); resumo.className = 'pedi-resumo';
    const escoreLabel = document.createElement('label'); escoreLabel.htmlFor = 'pedi-escore'; escoreLabel.textContent = 'Total de itens capazes';
    const escore = document.createElement('output'); escore.id = 'pedi-escore'; escore.textContent = '0 / 73'; resumo.append(escoreLabel, escore);
    function atualizarEscore() {
        const total = listaItens.reduce((soma, item) => soma + (form.elements.namedItem(item.nome).value === '1' ? 1 : 0), 0);
        escore.textContent = `${total} / ${listaItens.length}`;
    }
    const comentarios = grupoCampo({ name: 'comentarios', label: 'Comentários', type: 'textarea', wide: true }, 'pedi-');
    form.append(resumo, comentarios); adicionarAcoesFormulario(form, 'status-pedi', 'Salvar avaliação PEDI');
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); const status = document.getElementById('status-pedi');
        if (!form.reportValidity()) { status.textContent = 'Responda aos 73 itens antes de salvar.'; return; }
        const pacienteId = form.elements.namedItem('paciente_id').value;
        const data = form.elements.namedItem('data_avaliacao').value;
        if (!pacienteId || !data) { status.textContent = 'Selecione o paciente e informe a data.'; return; }
        const itens = listaItens.map(item => ({ codigo: item.codigo, habilidade: item.texto, resposta: Number(form.elements.namedItem(item.nome).value) }));
        const total = itens.reduce((soma, item) => soma + item.resposta, 0);
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/pedi_autocuidado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paciente_id: pacienteId, data_avaliacao: data, respostas: { itens, comentarios: form.elements.namedItem('comentarios').value.trim() }, escore_total: total }) });
            const pacienteAtual = form.elements.namedItem('paciente_id').value;
            form.reset(); form.elements.namedItem('paciente_id').value = pacienteAtual;
            form.elements.namedItem('data_avaliacao').value = dataLocal(); atualizarEscore();
            status.textContent = 'Avaliação PEDI salva.'; await carregarHistoricoPEDI(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    painel.append(form); root.append(painel);
    const historico = card('Avaliações anteriores'); const lista = document.createElement('div'); lista.id = 'lista-pedi'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarHistoricoPEDI();
}

async function carregarHistoricoPEDI() {
    const host = document.getElementById('lista-pedi'); if (!host) return;
    await adicionarHistoricoEspecializado(host, '/pedi_autocuidado', ['data_avaliacao', 'paciente_nome', 'escore_total'], {
        data_avaliacao: 'Data', paciente_nome: 'Paciente', escore_total: 'Itens capazes'
    }, modulos.pedi, 'Nenhuma avaliação PEDI registrada.');
}

function adicionarLinhaProgramacao(container) {
    const linha = document.createElement('div'); linha.className = 'programacao-linha';
    const definicoes = [
        ['programa', 'Programa', 'text'], ['objetivos', 'Objetivos', 'textarea'], ['data_registro', 'Data', 'date'],
        ['tentativas', 'Tentativas', 'number'], ['alcancado', 'Alcançado', 'select']
    ];
    for (const [nome, titulo, tipo] of definicoes) {
        const grupo = document.createElement('div'); grupo.className = 'form-grupo';
        const id = `programacao-${nome}-${cryptoRandomId()}`; const label = document.createElement('label'); label.htmlFor = id; label.textContent = titulo;
        let input;
        if (tipo === 'textarea') { input = document.createElement('textarea'); input.rows = 2; }
        else if (tipo === 'select') { input = document.createElement('select'); input.add(new Option('Selecione...', '')); input.add(new Option('Sim', 'Sim')); input.add(new Option('Não', 'Não')); }
        else { input = document.createElement('input'); input.type = tipo; if (tipo === 'number') { input.min = '0'; input.step = '1'; } }
        input.id = id; input.dataset.campo = nome;
        if (nome === 'data_registro') input.value = dataLocal();
        grupo.append(label, input); linha.append(grupo);
    }
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'btn-remover-item'; remover.textContent = 'Remover';
    remover.addEventListener('click', () => { if (container.children.length > 1) linha.remove(); else linha.querySelectorAll('input,textarea,select').forEach(campo => { campo.value = campo.type === 'date' ? dataLocal() : ''; }); });
    linha.append(remover); container.append(linha);
}

function cryptoRandomId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function renderizarProgramacao() {
    const root = document.getElementById('conteudo-programacao');
    if (!root || root.dataset.programacaoInicializada) { if (root) carregarHistoricoProgramacao(); return; }
    root.dataset.programacaoInicializada = 'true';
    const painel = card('Programação Terapêutica', 'Cadastre programas, objetivos, data, tentativas e se o objetivo foi alcançado. Uma ficha pode conter várias linhas.');
    const form = document.createElement('form'); form.id = 'form-programacao'; form.noValidate = true;
    const topo = document.createElement('div'); topo.className = 'grade-formulario';
    const pacienteGrupo = grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'programacao-');
    topo.append(pacienteGrupo, grupoCampo({ name: 'terapeuta_responsavel', label: 'Terapeuta responsável' }, 'programacao-'), grupoCampo({ name: 'supervisora', label: 'Supervisora' }, 'programacao-'));
    const info = document.createElement('div'); info.className = 'identificacao-resumo campo-largo'; info.id = 'programacao-paciente-info'; topo.append(info);
    form.append(topo);
    const pacienteSelect = pacienteGrupo.querySelector('select');
    pacienteSelect.addEventListener('change', () => {
        const paciente = pacientes.find(item => String(item.id) === pacienteSelect.value); info.replaceChildren(); if (!paciente) return;
        const nascimento = paciente.data_nascimento || 'Não informado';
        const idade = paciente.data_nascimento ? Math.max(0, Math.floor((Date.now() - new Date(`${paciente.data_nascimento}T00:00:00`).getTime()) / 31557600000)) : null;
        const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = 'Nascimento: '; p.append(strong, document.createTextNode(nascimento));
        const pIdade = document.createElement('p'); const strongIdade = document.createElement('strong'); strongIdade.textContent = 'Idade: '; pIdade.append(strongIdade, document.createTextNode(idade === null ? 'Não informado' : `${idade} anos`));
        info.append(p, pIdade);
    });
    const table = document.createElement('div'); table.className = 'programacao-linhas'; form.append(table); adicionarLinhaProgramacao(table);
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn-acao'; add.textContent = '+ Adicionar programa'; add.addEventListener('click', () => adicionarLinhaProgramacao(table)); form.append(add);
    adicionarAcoesFormulario(form, 'status-programacao', 'Salvar programação');
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); const status = document.getElementById('status-programacao');
        const pacienteId = form.elements.namedItem('paciente_id').value;
        if (!pacienteId) { status.textContent = 'Selecione um paciente.'; return; }
        const itens = [...table.children].map(linha => Object.fromEntries([...linha.querySelectorAll('[data-campo]')].map(input => [input.dataset.campo, input.value.trim() || null])));
        const preenchidos = itens.filter(item => item.programa || item.objetivos);
        if (!preenchidos.length) { status.textContent = 'Preencha pelo menos um programa ou objetivo.'; return; }
        if (preenchidos.some(item => !item.data_registro || !item.alcancado)) { status.textContent = 'Informe a data e selecione Sim ou Não em cada programa preenchido.'; return; }
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/programacao/lote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paciente_id: pacienteId, terapeuta_responsavel: form.elements.namedItem('terapeuta_responsavel').value.trim(), supervisora: form.elements.namedItem('supervisora').value.trim(), itens: preenchidos }) });
            table.replaceChildren(); adicionarLinhaProgramacao(table);
            status.textContent = 'Programação salva.'; await carregarHistoricoProgramacao(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    painel.append(form); root.append(painel);
    const historico = card('Programações anteriores'); const lista = document.createElement('div'); lista.id = 'lista-programacao'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarHistoricoProgramacao();
}

async function carregarHistoricoProgramacao() {
    const host = document.getElementById('lista-programacao'); if (!host) return;
    await adicionarHistoricoEspecializado(host, '/programacao', ['data_registro', 'paciente_nome', 'programa', 'objetivos', 'tentativas', 'alcancado'], {
        data_registro: 'Data', paciente_nome: 'Paciente', programa: 'Programa', objetivos: 'Objetivos', tentativas: 'Tentativas', alcancado: 'Alcançado'
    }, modulos.programacao, 'Nenhuma programação terapêutica registrada.');
}

function renderizarFichaObservacao() {
    const root = document.getElementById('conteudo-ficha-observacao');
    if (!root || root.dataset.fichaInicializada) { if (root) carregarHistoricoFichaObservacao(); return; }
    root.dataset.fichaInicializada = 'true';
    const painel = card('Ficha de Observação — Terapia Ocupacional Infantil', 'Registro por momentos da sessão, com opções de observação e espaço para sínteses clínicas.');
    const form = document.createElement('form'); form.id = 'form-ficha-observacao'; form.className = 'ficha-observacao-form'; form.noValidate = true;
    const topo = document.createElement('div'); topo.className = 'grade-formulario';
    const selecaoPaciente = grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'fo-');
    const seletorComAcao = document.createElement('div'); seletorComAcao.className = 'fo-paciente-seletor campo-largo';
    seletorComAcao.append(selecaoPaciente);
    const atualizarPaciente = document.createElement('button'); atualizarPaciente.type = 'button'; atualizarPaciente.className = 'btn-acao';
    atualizarPaciente.id = 'fo-atualizar-paciente'; atualizarPaciente.textContent = 'Atualizar informações do paciente';
    seletorComAcao.append(atualizarPaciente); topo.append(seletorComAcao);
    topo.append(grupoCampo({ name: 'data_atendimento', label: 'Data', type: 'date' }, 'fo-'));
    topo.append(grupoCampo({ name: 'atendimento_num', label: 'Atendimento nº', placeholder: 'Ex.: 2º atendimento' }, 'fo-'));
    topo.append(grupoCampo({ name: 'idade', label: 'Idade / meses', placeholder: 'Ex.: 2 meses' }, 'fo-'));
    topo.append(grupoCampo({ name: 'duracao', label: 'Duração' }, 'fo-'));
    topo.append(grupoCampo({ name: 'terapeuta', label: 'Terapeuta responsável' }, 'fo-'));
    form.append(topo);
    const resumoPaciente = document.createElement('div'); resumoPaciente.id = 'fo-paciente-info';
    resumoPaciente.className = 'identificacao-resumo fo-paciente-info campo-largo'; resumoPaciente.setAttribute('aria-live', 'polite');
    resumoPaciente.textContent = 'Selecione um paciente para ver os dados clínicos nesta ficha.'; form.append(resumoPaciente);
    form.elements.namedItem('data_atendimento').value = dataLocal();
    form.elements.namedItem('duracao').value = '40 minutos';
    form.elements.namedItem('terapeuta').value = terapeutaAtual?.nome || '';
    const seletor = form.elements.namedItem('paciente_id');
    seletor.addEventListener('change', () => {
        const paciente = pacientes.find(item => String(item.id) === seletor.value);
        const idade = form.elements.namedItem('idade');
        if (idade) idade.value = paciente ? idadePaciente(paciente.data_nascimento) : '';
        exibirResumoPacienteFicha(paciente, resumoPaciente);
    });
    atualizarPaciente.addEventListener('click', carregarInformacoesPacienteFicha);
    const camposObservacao = [];
    fichaObservacaoBlocos.forEach((bloco, indice) => {
        const section = document.createElement('fieldset'); section.className = 'fo-bloco campo-largo';
        const legenda = document.createElement('legend'); legenda.className = 'fo-titulo-bloco'; legenda.textContent = bloco.titulo; section.append(legenda);
        for (const [nomeGrupo, opcoes] of bloco.grupos) {
            const subtitulo = document.createElement('h3'); subtitulo.className = 'fo-subtitulo'; subtitulo.textContent = nomeGrupo; section.append(subtitulo);
            const grade = document.createElement('div'); grade.className = 'fo-checkbox-grid';
            for (const opcao of opcoes) {
                const label = document.createElement('label'); label.className = 'fo-checkbox-item';
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
                checkbox.dataset.grupo = `${bloco.titulo} · ${nomeGrupo}`; checkbox.dataset.item = opcao;
                label.append(checkbox, document.createTextNode(opcao)); grade.append(label);
            }
            section.append(grade);
        }
        const campoNota = `obs_${indice + 1}`; camposObservacao.push(campoNota);
        section.append(grupoCampo({ name: campoNota, label: `Observações deste momento (${bloco.titulo.match(/\((.*?)\)/)?.[1] || ''})`, type: 'textarea', wide: true }, 'fo-'));
        form.append(section);
    });
    const sintese = document.createElement('fieldset'); sintese.className = 'fo-bloco campo-largo';
    const legendaSintese = document.createElement('legend'); legendaSintese.className = 'fo-titulo-bloco'; legendaSintese.textContent = 'Síntese clínica'; sintese.append(legendaSintese);
    const textosSintese = [
        ['orientacoes_cuidador', 'Dúvidas e relatos do cuidador'], ['sintese_desempenho', 'Desempenho observado'],
        ['sintese_faixa_etaria', 'Aspectos compatíveis com a faixa etária'], ['sintese_acompanhar', 'Aspectos a acompanhar'],
        ['sintese_conduta', 'Conduta para os próximos atendimentos']
    ];
    textosSintese.forEach(([name, label]) => sintese.append(grupoCampo({ name, label, type: 'textarea', wide: true }, 'fo-')));
    sintese.append(grupoCampo({
        name: 'sintese_encaminhamento', label: 'Necessidade de encaminhamento / avaliação complementar', type: 'select', wide: true,
        options: [['', 'Selecione'], ['nao-identificada', 'Não identificada no momento'], ['observar', 'Manter observação'], ['sim', 'Sim — especificar']]
    }, 'fo-'));
    const especificacao = grupoCampo({ name: 'sintese_encaminhamento_detalhe', label: 'Especificação do encaminhamento', type: 'textarea', wide: true }, 'fo-');
    especificacao.hidden = true; sintese.append(especificacao);
    const encaminhamentoSelect = sintese.querySelector('[name="sintese_encaminhamento"]');
    const encaminhamentoDetalhe = sintese.querySelector('[name="sintese_encaminhamento_detalhe"]');
    encaminhamentoSelect.addEventListener('change', () => { especificacao.hidden = encaminhamentoSelect.value !== 'sim'; });
    form.append(sintese); adicionarAcoesFormulario(form, 'status-ficha-observacao', 'Salvar ficha infantil');
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); const status = document.getElementById('status-ficha-observacao');
        const pacienteId = form.elements.namedItem('paciente_id').value;
        const data = form.elements.namedItem('data_atendimento').value;
        if (!pacienteId || !data) { status.textContent = 'Selecione o paciente e informe a data.'; return; }
        const checkboxes = [...form.querySelectorAll('input[type="checkbox"]:checked')].map(input => ({
            grupo: input.dataset.grupo, item: input.dataset.item, marcado: true
        }));
        const dados = { paciente_id: pacienteId, data_atendimento: data, checkboxes };
        for (const campo of ['atendimento_num', 'idade', 'duracao', 'terapeuta', ...camposObservacao, ...textosSintese.map(([nome]) => nome)]) {
            dados[campo] = form.elements.namedItem(campo).value.trim() || null;
        }
        const encaminhamento = form.elements.namedItem('sintese_encaminhamento').value;
        const detalheEncaminhamento = form.elements.namedItem('sintese_encaminhamento_detalhe').value.trim();
        if (encaminhamento === 'sim' && !detalheEncaminhamento) {
            status.textContent = 'Descreva o encaminhamento ou a avaliação complementar indicada.'; return;
        }
        dados.sintese_encaminhamento = encaminhamento === 'sim'
            ? `Sim${detalheEncaminhamento ? ` — ${detalheEncaminhamento}` : ''}`
            : encaminhamento || null;
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/ficha_observacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const pacienteAtual = form.elements.namedItem('paciente_id').value;
            form.reset(); form.elements.namedItem('paciente_id').value = pacienteAtual;
            especificacao.hidden = true;
            form.elements.namedItem('data_atendimento').value = dataLocal(); form.elements.namedItem('duracao').value = '40 minutos';
            form.elements.namedItem('terapeuta').value = terapeutaAtual?.nome || '';
            status.textContent = 'Ficha de observação salva.'; await carregarHistoricoFichaObservacao(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    painel.append(form); root.append(painel);
    const historico = card('Histórico de fichas de observação'); const lista = document.createElement('div'); lista.id = 'lista-ficha-observacao'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); carregarHistoricoFichaObservacao();
}

function exibirResumoPacienteFicha(paciente, host) {
    host.replaceChildren();
    if (!paciente) { host.textContent = 'Selecione um paciente para ver os dados clínicos nesta ficha.'; return; }
    for (const [rotulo, valor] of [
        ['Paciente', paciente.nome], ['Nascimento', paciente.data_nascimento], ['Idade', idadePaciente(paciente.data_nascimento)],
        ['Diagnóstico', paciente.diagnostico], ['Responsável', paciente.responsavel], ['Contato', paciente.telefone]
    ]) {
        const linha = document.createElement('p'); const forte = document.createElement('strong'); forte.textContent = `${rotulo}: `;
        linha.append(forte, document.createTextNode(valor || 'Não informado')); host.append(linha);
    }
}

async function carregarInformacoesPacienteFicha() {
    const form = document.getElementById('form-ficha-observacao');
    const host = document.getElementById('fo-paciente-info');
    const botao = document.getElementById('fo-atualizar-paciente');
    const pacienteId = form?.elements.namedItem('paciente_id').value;
    if (!pacienteId) { host.textContent = 'Selecione um paciente para atualizar as informações.'; return; }
    botao.disabled = true; botao.textContent = 'Atualizando…';
    try {
        pacientes = await requestJSON('/pacientes');
        preencherSeletoresPaciente();
        const paciente = pacientes.find(item => String(item.id) === String(pacienteId));
        exibirResumoPacienteFicha(paciente, host);
        if (!paciente) throw new Error('O paciente não foi encontrado nesta conta.');
        const [anamneses, perfis, evolucoes, fichas] = await Promise.all([
            requestJSON('/anamnese'), requestJSON('/perfil_ocupacional'), requestJSON('/evolucao_terapeutica'), requestJSON('/ficha_observacao')
        ]);
        const maisRecente = (rows, campo) => rows.filter(item => String(item.paciente_id) === String(pacienteId))
            .sort((a, b) => String(b[campo] || '').localeCompare(String(a[campo] || '')))[0];
        const anamnese = maisRecente(anamneses, 'data_avaliacao');
        const perfil = maisRecente(perfis, 'data_avaliacao');
        const evolucao = maisRecente(evolucoes, 'data_registro');
        const ficha = maisRecente(fichas, 'data_atendimento');
        const adicionar = (titulo, texto) => {
            if (!texto) return;
            const secao = document.createElement('section'); secao.className = 'fo-paciente-nota';
            const h = document.createElement('h3'); h.textContent = titulo;
            const p = document.createElement('p'); p.textContent = texto;
            secao.append(h, p); host.append(secao);
        };
        if (anamnese) {
            adicionar(`Anamnese recente · ${dataRelatorio(anamnese.data_avaliacao)}`, [
                anamnese.historico_medico_desenvolvimento, anamnese.historico_educacional, anamnese.historico_terapeutico
            ].filter(Boolean).join('\n\n'));
        }
        if (perfil) {
            adicionar(`Perfil ocupacional recente · ${dataRelatorio(perfil.data_avaliacao)}`, [
                perfil.ocupacoes && `Ocupações: ${perfil.ocupacoes}`,
                perfil.desafios_participacao && `Participação: ${perfil.desafios_participacao}`,
                perfil.observacoes_finais && `Observações: ${perfil.observacoes_finais}`
            ].filter(Boolean).join('\n\n'));
        }
        if (evolucao) {
            adicionar(`Última evolução · ${dataRelatorio(evolucao.data_registro)}`, [
                evolucao.programa_terapeutico && `Programa: ${evolucao.programa_terapeutico}`,
                evolucao.objetivo && `Objetivo: ${evolucao.objetivo}`,
                evolucao.evolucao && `Evolução: ${evolucao.evolucao}`,
                evolucao.conduta && `Conduta: ${evolucao.conduta}`
            ].filter(Boolean).join('\n\n'));
        }
        if (ficha) {
            let itens = ficha.checkboxes;
            if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch { itens = []; } }
            const marcados = Array.isArray(itens) ? itens.filter(item => item.marcado).map(item => `${item.grupo}: ${item.item}`) : [];
            adicionar(`Última ficha de observação · ${dataRelatorio(ficha.data_atendimento)}`, [
                marcados.length ? `Observações marcadas: ${marcados.join('; ')}` : '',
                ficha.sintese_desempenho && `Desempenho: ${ficha.sintese_desempenho}`,
                ficha.sintese_acompanhar && `A acompanhar: ${ficha.sintese_acompanhar}`,
                ficha.sintese_conduta && `Conduta: ${ficha.sintese_conduta}`
            ].filter(Boolean).join('\n\n'));
        }
        if (!anamnese && !perfil && !evolucao && !ficha) {
            const aviso = document.createElement('p'); aviso.className = 'fo-paciente-sem-registros';
            aviso.textContent = 'Ainda não há anamnese, perfil ocupacional ou evolução registrada para este paciente.'; host.append(aviso);
        }
    } catch (erro) {
        const aviso = document.createElement('p'); aviso.className = 'fo-paciente-sem-registros'; aviso.textContent = `Não foi possível atualizar os dados: ${erro.message}`; host.append(aviso);
    } finally {
        botao.disabled = false; botao.textContent = 'Atualizar informações do paciente';
    }
}

async function carregarHistoricoFichaObservacao() {
    const host = document.getElementById('lista-ficha-observacao'); if (!host) return;
    try {
        const registros = await requestJSON('/ficha_observacao');
        desenharTabela(host, registros, ['data_atendimento', 'paciente_nome', 'atendimento_num', 'idade'], {
            data_atendimento: 'Data', paciente_nome: 'Paciente', atendimento_num: 'Atendimento', idade: 'Idade'
        }, 'Nenhuma ficha infantil registrada.', registro => {
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
            const ver = document.createElement('button'); ver.type = 'button'; ver.className = 'btn-acao'; ver.textContent = 'Ver';
            ver.addEventListener('click', () => abrirDetalhesRegistro(registro, modulos.ficha));
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm('Excluir esta ficha de observação?')) return;
                try { await requestJSON(`/ficha_observacao/${registro.id}`, { method: 'DELETE' }); await carregarHistoricoFichaObservacao(); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(ver, excluir); return acoes;
        });
    } catch (erro) { host.textContent = 'Não foi possível carregar o histórico: ' + erro.message; }
}

function renderizarPlanoIntervencao() {
    const root = document.getElementById('conteudo-plano-intervencao');
    if (!root || root.dataset.planoInicializado) { if (root) carregarHistoricoPlanoIntervencao(); return; }
    root.dataset.planoInicializado = 'true';
    const painel = card('Plano de Intervenção Individual', 'Organize cinco programas com objetivos de curto, médio e longo prazo.');
    const form = document.createElement('form'); form.id = 'form-plano-intervencao'; form.noValidate = true;
    const topo = document.createElement('div'); topo.className = 'grade-formulario';
    const campoPaciente = grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'plano-');
    topo.append(campoPaciente, grupoCampo({ name: 'data_registro', label: 'Data do registro', type: 'date' }, 'plano-'));
    form.append(topo); form.elements.namedItem('data_registro').value = dataLocal();
    const resumoPaciente = document.createElement('div'); resumoPaciente.id = 'plano-paciente-resumo'; resumoPaciente.className = 'identificacao-resumo campo-largo'; form.append(resumoPaciente);
    const profissional = grupoCampo({ name: 'profissional_responsavel', label: 'Profissional responsável', required: true }, 'plano-');
    profissional.classList.add('campo-largo'); form.append(profissional);
    profissional.querySelector('input').value = terapeutaAtual?.nome || '';
    const tabelaWrap = document.createElement('div'); tabelaWrap.className = 'table-container campo-largo';
    const tabela = document.createElement('table'); tabela.className = 'tabela-plano';
    const cabecalho = document.createElement('thead'); const cabLinha = document.createElement('tr');
    for (const texto of ['Programa', 'Curto prazo', 'Médio prazo', 'Longo prazo']) { const th = document.createElement('th'); th.textContent = texto; cabLinha.append(th); }
    cabecalho.append(cabLinha); tabela.append(cabecalho);
    const corpo = document.createElement('tbody');
    for (let i = 1; i <= 5; i++) {
        const linha = document.createElement('tr');
        for (const [nome, rotulo] of [['programa', 'Programa'], ['curto', 'Objetivo de curto prazo'], ['medio', 'Objetivo de médio prazo'], ['longo', 'Objetivo de longo prazo']]) {
            const celula = document.createElement('td'); const textarea = document.createElement('textarea'); textarea.rows = 2;
            textarea.dataset.campo = nome; textarea.dataset.linha = String(i); textarea.setAttribute('aria-label', `${rotulo}, item ${i}`); celula.append(textarea); linha.append(celula);
        }
        corpo.append(linha);
    }
    tabela.append(corpo); tabelaWrap.append(tabela); form.append(tabelaWrap);
    const acoesTopo = document.createElement('div'); acoesTopo.className = 'acoes-formulario campo-largo';
    const carregar = document.createElement('button'); carregar.type = 'button'; carregar.className = 'btn-acao'; carregar.textContent = 'Carregar último plano deste paciente';
    const limpar = document.createElement('button'); limpar.type = 'button'; limpar.className = 'btn-acao'; limpar.textContent = 'Limpar metas';
    acoesTopo.append(carregar, limpar); form.append(acoesTopo);
    adicionarAcoesFormulario(form, 'status-plano-intervencao', 'Salvar plano');
    const selectPaciente = campoPaciente.querySelector('select');
    const atualizarInfo = () => {
        const paciente = pacientes.find(item => String(item.id) === selectPaciente.value); resumoPaciente.replaceChildren();
        if (!paciente) return;
        const idade = paciente.data_nascimento ? Math.max(0, Math.floor((Date.now() - new Date(`${paciente.data_nascimento}T00:00:00`).getTime()) / 31557600000)) : null;
        for (const [labelTexto, valor] of [['Paciente', paciente.nome], ['Nascimento', paciente.data_nascimento], ['Idade', idade === null ? '' : `${idade} anos`]]) {
            const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = `${labelTexto}: `;
            p.append(strong, document.createTextNode(valor || 'Não informado')); resumoPaciente.append(p);
        }
    };
    selectPaciente.addEventListener('change', atualizarInfo);
    carregar.addEventListener('click', async () => {
        if (!selectPaciente.value) { mostrarAviso('Selecione um paciente para carregar o último plano.'); return; }
        try {
            const rows = await requestJSON(`/plano_intervencao?paciente_id=${encodeURIComponent(selectPaciente.value)}`);
            const ultimo = rows.find(row => String(row.paciente_id) === String(selectPaciente.value));
            if (!ultimo) { mostrarAviso('Este paciente ainda não tem plano salvo.'); return; }
            let itens = ultimo.itens; if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch { itens = []; } }
            tabela.querySelectorAll('[data-campo]').forEach(textarea => { textarea.value = itens?.[Number(textarea.dataset.linha) - 1]?.[textarea.dataset.campo] || ''; });
            form.elements.namedItem('profissional_responsavel').value = ultimo.profissional_responsavel || terapeutaAtual?.nome || '';
            document.getElementById('status-plano-intervencao').textContent = 'Plano carregado para revisão. Ao salvar, será criada uma nova versão.';
        } catch (erro) { mostrarAviso(erro.message); }
    });
    limpar.addEventListener('click', () => { tabela.querySelectorAll('textarea').forEach(campo => { campo.value = ''; }); });
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); const status = document.getElementById('status-plano-intervencao');
        const pacienteId = selectPaciente.value; const data = form.elements.namedItem('data_registro').value;
        if (!pacienteId || !data) { status.textContent = 'Selecione o paciente e informe a data.'; return; }
        const profissionalNome = form.elements.namedItem('profissional_responsavel').value.trim();
        if (!profissionalNome) { status.textContent = 'Informe o profissional responsável.'; form.elements.namedItem('profissional_responsavel').focus(); return; }
        const itens = [];
        for (let linha = 1; linha <= 5; linha++) {
            const item = Object.fromEntries(['programa', 'curto', 'medio', 'longo'].map(nome => [nome, tabela.querySelector(`[data-linha="${linha}"][data-campo="${nome}"]`).value.trim()]));
            if (Object.values(item).some(Boolean)) itens.push(item);
        }
        if (!itens.length) { status.textContent = 'Preencha pelo menos um programa ou objetivo.'; return; }
        status.textContent = 'Salvando...';
        try {
            await requestJSON('/plano_intervencao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paciente_id: pacienteId, data_registro: data, profissional_responsavel: profissionalNome, itens }) });
            tabela.querySelectorAll('textarea').forEach(campo => { campo.value = ''; });
            status.textContent = 'Plano salvo.'; await carregarHistoricoPlanoIntervencao(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    painel.append(form); root.append(painel);
    const historico = card('Histórico de planos de intervenção'); const lista = document.createElement('div'); lista.id = 'lista-plano-intervencao'; historico.append(lista); root.append(historico);
    preencherSeletoresPaciente(); atualizarInfo(); carregarHistoricoPlanoIntervencao();
}

async function carregarHistoricoPlanoIntervencao() {
    const host = document.getElementById('lista-plano-intervencao'); if (!host) return;
    try {
        const registros = await requestJSON('/plano_intervencao');
        const linhas = registros.map(registro => {
            let itens = registro.itens; if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch { itens = []; } }
            const resumo = Array.isArray(itens) ? itens.map(item => item.programa).filter(Boolean).join(', ') : '';
            return { ...registro, resumo_programas: resumo || '—' };
        });
        desenharTabela(host, linhas, ['data_registro', 'paciente_nome', 'profissional_responsavel', 'resumo_programas'], {
            data_registro: 'Data', paciente_nome: 'Paciente', profissional_responsavel: 'Profissional', resumo_programas: 'Programas'
        }, 'Nenhum plano de intervenção registrado.', registro => {
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
            const ver = document.createElement('button'); ver.type = 'button'; ver.className = 'btn-acao'; ver.textContent = 'Ver';
            ver.addEventListener('click', () => abrirDetalhesRegistro(registro, modulos.plano));
            const carregar = document.createElement('button'); carregar.type = 'button'; carregar.className = 'btn-acao'; carregar.textContent = 'Carregar';
            carregar.addEventListener('click', async () => {
                const form = document.getElementById('form-plano-intervencao');
                form.elements.namedItem('paciente_id').value = String(registro.paciente_id); form.elements.namedItem('data_registro').value = dataLocal();
                document.getElementById('plano-paciente-resumo').replaceChildren();
                form.elements.namedItem('paciente_id').dispatchEvent(new Event('change'));
                const itens = typeof registro.itens === 'string' ? JSON.parse(registro.itens || '[]') : registro.itens;
                form.querySelectorAll('[data-campo]').forEach(textarea => { textarea.value = itens?.[Number(textarea.dataset.linha) - 1]?.[textarea.dataset.campo] || ''; });
                form.elements.namedItem('profissional_responsavel').value = registro.profissional_responsavel || '';
                form.scrollIntoView({ behavior: 'smooth' });
            });
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm('Excluir este plano de intervenção?')) return;
                try { await requestJSON(`/plano_intervencao/${registro.id}`, { method: 'DELETE' }); await carregarHistoricoPlanoIntervencao(); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(ver, carregar, excluir); return acoes;
        });
    } catch (erro) { host.textContent = 'Não foi possível carregar o histórico: ' + erro.message; }
}

async function renderizarListaModulo(definicao, idLista, chave) {
    const host = document.getElementById(idLista || `lista-${definicao.route.slice(1).replaceAll('/', '-')}`);
    if (!host) return;
    try {
        let registros = await requestJSON(definicao.route);
        let mensagemVazia = 'Nenhum registro encontrado.';
        if (['anamnese', 'perfilOcupacional'].includes(chave)) {
            const pacienteId = idPacienteAvaliacaoCompartilhada();
            registros = pacienteId ? registros.filter(item => String(item.paciente_id) === String(pacienteId)) : [];
            mensagemVazia = pacienteId ? 'Nenhum registro deste paciente.' : 'Selecione o paciente acima para ver os registros.';
        }
        desenharTabela(host, registros, definicao.columns, definicao.labels, mensagemVazia, registro => {
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
            const detalhes = document.createElement('button'); detalhes.type = 'button'; detalhes.className = 'btn-acao';
            detalhes.textContent = 'Ver'; detalhes.addEventListener('click', () => abrirDetalhesRegistro(registro, definicao));
            acoes.append(detalhes);
            if (chave === 'copm') {
                const reavaliar = document.createElement('button'); reavaliar.type = 'button'; reavaliar.className = 'btn-acao';
                reavaliar.textContent = 'Reavaliar'; reavaliar.addEventListener('click', () => preencherFormularioCOPM(registro, definicao));
                acoes.append(reavaliar);
            }
            return acoes;
        });
    } catch (erro) {
        host.textContent = 'Não foi possível carregar os registros: ' + erro.message;
    }
}

function abrirDetalhesRegistro(registro, definicao) {
    let dialogo = document.getElementById('dialogo-registro');
    if (!dialogo) {
        dialogo = document.createElement('dialog'); dialogo.id = 'dialogo-registro'; dialogo.className = 'dialogo-registro';
        const cabecalho = document.createElement('div'); cabecalho.className = 'dialogo-cabecalho';
        const titulo = document.createElement('h2'); titulo.id = 'dialogo-registro-titulo';
        const fechar = document.createElement('button'); fechar.type = 'button'; fechar.className = 'btn-acao'; fechar.textContent = 'Fechar';
        fechar.addEventListener('click', () => dialogo.close()); cabecalho.append(titulo, fechar);
        const conteudo = document.createElement('dl'); conteudo.id = 'dialogo-registro-conteudo';
        dialogo.append(cabecalho, conteudo); document.body.append(dialogo);
    }
    document.getElementById('dialogo-registro-titulo').textContent = `${definicao.title} — ${registro.paciente_nome || 'registro'}`;
    const conteudo = document.getElementById('dialogo-registro-conteudo'); conteudo.replaceChildren();
    for (const [campo, valor] of Object.entries(registro)) {
        if (campo === 'id' || campo === 'paciente_id') continue;
        const dt = document.createElement('dt'); dt.textContent = definicao.labels[campo] || campo.replaceAll('_', ' ');
        const dd = document.createElement('dd'); dd.textContent = formatarValor(valor);
        conteudo.append(dt, dd);
    }
    dialogo.showModal();
}

function preencherFormularioCOPM(registro, definicao) {
    const slug = definicao.route.slice(1).replaceAll('/', '-') + '-copm';
    const form = document.getElementById(`form-${slug}`);
    if (!form) return;
    for (const campo of definicao.fields) {
        const input = form.elements.namedItem(campo.name);
        if (input) input.value = registro[campo.name] ?? '';
    }
    form.dataset.registroId = registro.id;
    form.querySelector('button[type="submit"]').textContent = 'Salvar reavaliação';
    form.querySelector('.feedback-formulario').textContent = `Atualizando avaliação de ${registro.paciente_nome}`;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarPacientes() {
    const root = document.getElementById('conteudo-pacientes');
    if (root.dataset.inicializado) { carregarPacientes().catch(erro => mostrarAviso(erro.message)); return; }
    root.dataset.inicializado = 'true';
    const painel = card('Cadastrar paciente', 'Os dados ficam vinculados à sua conta profissional.');
    const form = document.createElement('form');
    form.id = 'form-paciente';
    form.className = 'grade-formulario';
    const campos = [
        { name: 'nome', label: 'Nome completo', required: true },
        { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
        { name: 'diagnostico', label: 'Diagnóstico / motivo do acompanhamento' },
        { name: 'responsavel', label: 'Responsável' }, { name: 'telefone', label: 'Telefone' }
    ];
    for (const campo of campos) form.append(grupoCampo(campo, 'paciente-'));
    const acoes = document.createElement('div');
    acoes.className = 'acoes-formulario campo-largo';
    const botao = document.createElement('button');
    botao.type = 'submit'; botao.className = 'btn-salvar'; botao.textContent = 'Cadastrar paciente';
    const status = document.createElement('span'); status.className = 'feedback-formulario';
    acoes.append(botao, status); form.append(acoes); painel.append(form); root.append(painel);
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); status.textContent = 'Salvando...';
        const dados = Object.fromEntries(campos.map(c => [c.name, form.elements.namedItem(c.name).value || null]));
        try {
            const pacienteId = form.dataset.pacienteId;
            await requestJSON(pacienteId ? `/pacientes/${pacienteId}` : '/pacientes', {
                method: pacienteId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
            });
            form.reset(); delete form.dataset.pacienteId;
            botao.textContent = 'Cadastrar paciente'; status.textContent = pacienteId ? 'Cadastro atualizado.' : 'Paciente cadastrado.';
            await carregarPacientes(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    const historico = card('Pacientes cadastrados');
    const filtro = document.createElement('input'); filtro.type = 'search'; filtro.id = 'filtro-pacientes';
    filtro.placeholder = 'Buscar por paciente, diagnóstico ou responsável'; filtro.setAttribute('aria-label', filtro.placeholder);
    filtro.addEventListener('input', renderizarTabelaPacientes);
    historico.append(filtro);
    const lista = document.createElement('div'); lista.id = 'lista-pacientes'; historico.append(lista); root.append(historico);
    carregarPacientes().catch(erro => mostrarAviso(erro.message));
}

function editarPaciente(paciente) {
    const form = document.getElementById('form-paciente');
    if (!form) return;
    for (const campo of ['nome', 'data_nascimento', 'diagnostico', 'responsavel', 'telefone']) {
        form.elements.namedItem(campo).value = paciente[campo] || '';
    }
    form.dataset.pacienteId = paciente.id;
    form.querySelector('button[type="submit"]').textContent = 'Salvar alterações';
    form.querySelector('.feedback-formulario').textContent = `Editando ${paciente.nome}`;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarAgenda() {
    const root = document.getElementById('conteudo-agenda');
    if (root.dataset.inicializado) { carregarAgenda(); return; }
    root.dataset.inicializado = 'true';
    const painel = card('Novo atendimento');
    const form = document.createElement('form'); form.id = 'form-agenda'; form.className = 'grade-formulario';
    const campos = [
        { name: 'paciente_id', label: 'Paciente', type: 'patient', required: true },
        { name: 'data_hora', label: 'Data e horário', type: 'datetime-local', required: true },
        { name: 'status', label: 'Status', type: 'select', options: [['Agendado', 'Agendado'], ['Realizado', 'Realizado'], ['Cancelado', 'Cancelado']] },
        { name: 'observacoes', label: 'Observações', type: 'textarea', wide: true }
    ];
    campos.forEach(c => form.append(grupoCampo(c, 'agenda-')));
    form.elements.namedItem('status').value = 'Agendado'; form.elements.namedItem('data_hora').value = dataLocal('datetime-local');
    const actions = document.createElement('div'); actions.className = 'acoes-formulario campo-largo';
    const button = document.createElement('button'); button.type = 'submit'; button.className = 'btn-salvar'; button.textContent = 'Agendar atendimento';
    const status = document.createElement('span'); status.className = 'feedback-formulario'; actions.append(button, status); form.append(actions); painel.append(form);
    form.addEventListener('submit', async evento => {
        evento.preventDefault(); status.textContent = 'Salvando...';
        const dados = Object.fromEntries(campos.map(c => [c.name, form.elements.namedItem(c.name).value || null]));
        try {
            await requestJSON('/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            form.reset(); form.elements.namedItem('status').value = 'Agendado'; form.elements.namedItem('data_hora').value = dataLocal('datetime-local');
            status.textContent = 'Atendimento agendado.'; preencherSeletoresPaciente(); await carregarAgenda(); await carregarDashboard();
        } catch (erro) { status.textContent = erro.message; }
    });
    const calendario = card('Calendário mensal', 'Clique em um dia para preencher a data do próximo atendimento.');
    const cabecalhoCalendario = document.createElement('div'); cabecalhoCalendario.className = 'calendario-header';
    const anterior = document.createElement('button'); anterior.type = 'button'; anterior.textContent = '‹ Mês anterior';
    const tituloMes = document.createElement('strong'); tituloMes.id = 'agenda-mes-titulo';
    const proximo = document.createElement('button'); proximo.type = 'button'; proximo.textContent = 'Próximo mês ›';
    anterior.addEventListener('click', () => mudarMesCalendario(-1)); proximo.addEventListener('click', () => mudarMesCalendario(1));
    cabecalhoCalendario.append(anterior, tituloMes, proximo);
    const diasSemana = document.createElement('div'); diasSemana.className = 'cal-grid-dias';
    for (const dia of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) { const celula = document.createElement('div'); celula.className = 'cal-dia-semana'; celula.textContent = dia; diasSemana.append(celula); }
    const gradeDias = document.createElement('div'); gradeDias.id = 'agenda-grade-calendario'; gradeDias.className = 'cal-grid-dias agenda-grade-calendario';
    calendario.append(cabecalhoCalendario, diasSemana, gradeDias);
    const historico = card('Atendimentos agendados'); const lista = document.createElement('div'); lista.id = 'lista-agenda'; historico.append(lista);
    root.append(painel, calendario, historico);
    renderizarCalendarioAgenda();
    carregarAgenda();
}

function chaveDataLocal(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function mudarMesCalendario(delta) {
    agendaMesExibido = new Date(agendaMesExibido.getFullYear(), agendaMesExibido.getMonth() + delta, 1);
    renderizarCalendarioAgenda();
}

function renderizarCalendarioAgenda() {
    const host = document.getElementById('agenda-grade-calendario'); if (!host) return;
    const titulo = document.getElementById('agenda-mes-titulo');
    if (titulo) titulo.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(agendaMesExibido);
    host.replaceChildren();
    const primeiroDia = new Date(agendaMesExibido.getFullYear(), agendaMesExibido.getMonth(), 1);
    const inicio = new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), 1 - primeiroDia.getDay());
    for (let indice = 0; indice < 42; indice++) {
        const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
        const chave = chaveDataLocal(dia);
        const doDia = agendaRegistros.filter(item => String(item.data_hora || '').slice(0, 10) === chave);
        const celula = document.createElement('button'); celula.type = 'button'; celula.className = 'cal-day';
        if (dia.getMonth() !== agendaMesExibido.getMonth()) celula.classList.add('fora-mes');
        if (doDia.length) {
            const status = doDia.some(item => item.status === 'Cancelado') ? 'tem-consulta-vermelho'
                : doDia.some(item => item.status === 'Agendado') ? 'tem-consulta-amarelo' : 'tem-consulta-verde';
            celula.classList.add(status);
        }
        const numero = document.createElement('span'); numero.textContent = String(dia.getDate()); celula.append(numero);
        if (doDia.length) { const contagem = document.createElement('small'); contagem.textContent = `${doDia.length} consulta${doDia.length === 1 ? '' : 's'}`; celula.append(contagem); }
        celula.setAttribute('aria-label', `${chave}${doDia.length ? `, ${doDia.length} atendimento(s)` : ''}`);
        celula.addEventListener('click', () => {
            const campoData = document.querySelector('#form-agenda [name="data_hora"]');
            if (campoData) { campoData.value = `${chave}T09:00`; document.getElementById('form-agenda').scrollIntoView({ behavior: 'smooth' }); campoData.focus(); }
        });
        host.append(celula);
    }
}

async function carregarAgenda() {
    const host = document.getElementById('lista-agenda'); if (!host) return;
    try {
        const rows = await requestJSON('/agenda');
        agendaRegistros = rows; renderizarCalendarioAgenda();
        desenharTabela(host, rows, ['data_hora', 'paciente_nome', 'status', 'observacoes'], {
            data_hora: 'Data e horário', paciente_nome: 'Paciente', status: 'Status', observacoes: 'Observações'
        }, 'Nenhum atendimento agendado.', registro => {
            const acoes = document.createElement('div'); acoes.className = 'acoes-tabela';
            const select = document.createElement('select');
            for (const status of ['Agendado', 'Realizado', 'Cancelado']) select.add(new Option(status, status));
            select.value = registro.status || 'Agendado';
            select.addEventListener('change', async () => {
                try {
                    await requestJSON(`/agenda/${registro.id}/status`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: select.value })
                    });
                    await carregarAgenda(); await carregarDashboard();
                } catch (erro) { mostrarAviso(erro.message); }
            });
            const excluir = document.createElement('button'); excluir.type = 'button'; excluir.className = 'btn-excluir'; excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm(`Excluir o atendimento de ${registro.paciente_nome}?`)) return;
                try { await requestJSON(`/agenda/${registro.id}`, { method: 'DELETE' }); await carregarAgenda(); await carregarDashboard(); }
                catch (erro) { mostrarAviso(erro.message); }
            });
            acoes.append(select, excluir); return acoes;
        });
    } catch (erro) { host.textContent = erro.message; }
}

function renderizarProntuario() {
    const root = document.getElementById('conteudo-prontuario');
    if (root.dataset.inicializado) return;
    root.dataset.inicializado = 'true';
    const painel = card('Prontuário do paciente', 'Selecione um paciente para consultar os registros salvos nos módulos clínicos.');
    const select = document.createElement('select'); select.dataset.patientSelect = 'true'; select.id = 'prontuario-paciente'; select.add(new Option('Selecione o paciente...', ''));
    const label = document.createElement('label'); label.htmlFor = select.id; label.textContent = 'Paciente';
    const grupo = document.createElement('div'); grupo.className = 'form-grupo'; grupo.append(label, select); painel.append(grupo);
    const acoes = document.createElement('div'); acoes.className = 'acoes-formulario';
    const atualizar = document.createElement('button'); atualizar.type = 'button'; atualizar.className = 'btn-acao'; atualizar.textContent = 'Atualizar prontuário';
    const imprimir = document.createElement('button'); imprimir.type = 'button'; imprimir.id = 'imprimir-prontuario'; imprimir.className = 'btn-salvar'; imprimir.textContent = 'Imprimir prontuário'; imprimir.disabled = true;
    acoes.append(atualizar, imprimir); painel.append(acoes);
    const saida = document.createElement('div'); saida.id = 'prontuario-registros'; painel.append(saida); root.append(painel);
    select.addEventListener('change', () => { imprimir.disabled = !select.value; carregarProntuario(select.value); });
    atualizar.addEventListener('click', () => { if (select.value) carregarProntuario(select.value); else mostrarAviso('Selecione um paciente para atualizar o prontuário.'); });
    imprimir.addEventListener('click', () => imprimirProntuario(select.value));
    preencherSeletoresPaciente();
}

function imprimirProntuario(pacienteId) {
    const paciente = pacientes.find(item => String(item.id) === String(pacienteId));
    const host = document.getElementById('prontuario-registros');
    if (!paciente || !host?.childElementCount) { mostrarAviso('Selecione um paciente e aguarde o prontuário carregar.'); return; }
    const janela = window.open('', '_blank');
    if (!janela) { mostrarAviso('Permita a abertura da janela de impressão para continuar.'); return; }
    const estilo = janela.document.createElement('style');
    estilo.textContent = 'body{font:14px Arial,sans-serif;max-width:900px;margin:32px auto;color:#111;line-height:1.5}h1{font-size:22px}details{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:12px 0;break-inside:avoid}summary{font-weight:bold;color:#0d9488}pre{white-space:pre-wrap;font:12px Arial,sans-serif}';
    const titulo = janela.document.createElement('h1'); titulo.textContent = `Prontuário — ${paciente.nome}`;
    const dados = janela.document.createElement('p'); dados.textContent = `Nascimento: ${dataRelatorio(paciente.data_nascimento)} · Diagnóstico: ${paciente.diagnostico || 'Não informado'}`;
    const copia = host.cloneNode(true); copia.querySelectorAll('details').forEach(item => { item.open = true; });
    janela.document.head.append(estilo); janela.document.body.append(titulo, dados, copia); janela.document.title = `Prontuário — ${paciente.nome}`;
    janela.focus(); janela.print();
}

const rotulosProntuario = {
    data_atendimento: 'Data do atendimento', data_avaliacao: 'Data da avaliação', data_registro: 'Data do registro', data_hora: 'Data e horário',
    atendimento_num: 'Número do atendimento', paciente_nome: 'Paciente', status: 'Status', observacoes: 'Observações',
    idade: 'Idade', duracao: 'Duração', terapeuta: 'Terapeuta', terapeuta_responsavel: 'Terapeuta responsável', supervisora: 'Supervisora',
    diagnostico: 'Diagnóstico / motivo do acompanhamento', responsavel: 'Responsável', telefone: 'Telefone', crefito: 'CREFITO',
    historico_medico_desenvolvimento: 'Histórico médico e de desenvolvimento', historico_educacional: 'Histórico educacional',
    historico_terapeutico: 'Histórico terapêutico', ambiental: 'Fatores ambientais', pessoal: 'Fatores pessoais', ocupacoes: 'Ocupações',
    padroes_desempenho: 'Padrões de desempenho', habilidade_interacao: 'Habilidades de interação', fatores_cliente: 'Oportunidades e pontos fortes',
    desafios_participacao: 'Desafios de participação', observacoes_finais: 'Observações finais', coisas_irritam: 'O que irrita ou incomoda',
    coisas_gosto: 'Preferências e interesses', como_comunico: 'Como se comunica', atividade_problema: 'Problema / atividade ocupacional',
    nivel_importancia: 'Importância', desempenho_inicial: 'Desempenho inicial', satisfacao_inicial: 'Satisfação inicial',
    desempenho_reavaliacao: 'Desempenho na reavaliação', satisfacao_reavaliacao: 'Satisfação na reavaliação',
    checkboxes: 'Itens observados', obs_1: 'Observações — etapa 1', obs_2: 'Observações — etapa 2', obs_3: 'Observações — etapa 3',
    obs_4: 'Observações — etapa 4', obs_5: 'Observações — etapa 5', obs_6: 'Observações — etapa 6', obs_7: 'Observações — etapa 7', orientacoes_cuidador: 'Dúvidas e relatos do cuidador',
    sintese_desempenho: 'Síntese do desempenho', sintese_faixa_etaria: 'Aspectos da faixa etária', sintese_acompanhar: 'Pontos a acompanhar',
    sintese_conduta: 'Conduta para próximos atendimentos', sintese_encaminhamento: 'Encaminhamento / avaliação complementar', escore_total: 'Escore total', respostas: 'Respostas e comentários',
    profissional: 'Profissional', especialidade: 'Especialidade', horario: 'Horário', programa_terapeutico: 'Programa terapêutico',
    objetivo: 'Objetivo', evolucao: 'Evolução da sessão', desempenho: 'Desempenho observado', reforcadores: 'Reforçadores',
    intercorrencias: 'Intercorrências', conduta: 'Conduta', devolutiva: 'Devolutiva', profissional_responsavel: 'Profissional responsável',
    itens: 'Programas e metas', programa: 'Programa', objetivos: 'Objetivos', tentativas: 'Tentativas', alcancado: 'Objetivo alcançado?',
    saude_disposicao: 'Saúde e disposição', desenvolvimento_pessoal: 'Desenvolvimento intelectual', equilibrio_emocional: 'Equilíbrio emocional',
    vida_social: 'Vida social', contribuicao: 'Contribuição social', familia: 'Família', recursos_financeiros: 'Recursos financeiros',
    amoroso: 'Desenvolvimento amoroso', criatividade_hobbies: 'Criatividade, hobbies e diversão', plenitude_realizacao: 'Plenitude e felicidade',
    espiritualidade: 'Espiritualidade', curto: 'Objetivo de curto prazo', medio: 'Objetivo de médio prazo', longo: 'Objetivo de longo prazo',
    data_avaliacao_base: 'Avaliação inicial de referência', data_reavaliacao: 'Data da reavaliação',
    reavaliacao_desempenho: 'Desempenho na reavaliação', reavaliacao_satisfacao: 'Satisfação na reavaliação',
    observacao_item: 'Observação do problema', observacoes_sessao: 'Observações da etapa', paciente_id: 'Paciente'
};

for (const grupo of habilidadesSensoriais) for (const [campo, rotulo] of grupo.itens) rotulosProntuario[campo] = rotulo;
for (const [campo, rotulo] of rodaAreas) rotulosProntuario[campo] = rotulo;

function rotuloCampoProntuario(campo) { return rotulosProntuario[campo] || campo.replaceAll('_', ' ').replace(/^./, letra => letra.toLocaleUpperCase('pt-BR')); }

function textoValorProntuario(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
    if (typeof valor === 'string') {
        const aparado = valor.trim();
        if (aparado.startsWith('{') || aparado.startsWith('[')) {
            try { return JSON.stringify(JSON.parse(aparado), null, 2); } catch { /* Mantém o texto original se não for JSON. */ }
        }
        return valor.replace('T', ' ');
    }
    return String(valor);
}

function desenharRegistroProntuario(host, registro, fonte) {
    const artigo = document.createElement('article'); artigo.className = 'prontuario-registro-item';
    const data = registro.data_reavaliacao || registro.data_hora || registro.data_registro || registro.data_avaliacao || registro.data_atendimento || registro.data_avaliacao_base;
    const titulo = document.createElement('h4'); titulo.textContent = data ? dataRelatorio(data) : fonte; artigo.append(titulo);
    const lista = document.createElement('dl'); lista.className = 'prontuario-campos';
    for (const [campo, valor] of Object.entries(registro)) {
        if (['id', 'item_id', 'sessao_id', 'copm_meta_id', 'legado', 'criado_em', 'paciente_id', 'paciente_nome', 'data_hora', 'data_registro', 'data_avaliacao', 'data_atendimento', 'data_reavaliacao', 'data_avaliacao_base'].includes(campo)) continue;
        if (valor === null || valor === undefined || valor === '') continue;
        const dt = document.createElement('dt'); dt.textContent = rotuloCampoProntuario(campo);
        const dd = document.createElement('dd'); dd.textContent = textoValorProntuario(valor); lista.append(dt, dd);
    }
    if (!lista.childElementCount) { const vazio = document.createElement('p'); vazio.className = 'texto-ajuda'; vazio.textContent = 'Este registro não possui campos adicionais.'; artigo.append(vazio); }
    else artigo.append(lista);
    host.append(artigo);
}

async function carregarProntuario(pacienteId) {
    const host = document.getElementById('prontuario-registros'); host.replaceChildren();
    if (!pacienteId) return;
    const paciente = pacientes.find(item => String(item.id) === String(pacienteId));
    const carregando = document.createElement('p'); carregando.className = 'texto-ajuda'; carregando.textContent = 'Carregando prontuário completo…'; host.append(carregando);
    const fontes = [
        ['Consultas e atendimentos', '/agenda'],
        ['Anamnese', '/anamnese'], ['Perfil ocupacional', '/perfil_ocupacional'], ['COPM', '/copm'], ['Reavaliações COPM', '/copm/reavaliacoes'],
        ['Ficha de observação', '/ficha_observacao'], ['Avaliação sensorial', '/avaliacao_sensorial'],
        ['PEDI', '/pedi_autocuidado'], ['Evoluções', '/evolucao_terapeutica'],
        ['Plano de intervenção', '/plano_intervencao'], ['Programação terapêutica', '/programacao'], ['Roda da vida', '/roda_vida']
    ];
    try {
        const resultados = await Promise.all(fontes.map(async ([titulo, rota]) => {
            try {
                const rows = await requestJSON(`${rota}?paciente_id=${encodeURIComponent(pacienteId)}`);
                return { titulo, rows: rows.filter(row => String(row.paciente_id) === String(pacienteId)), erro: null };
            } catch (erro) { return { titulo, rows: [], erro: erro.message }; }
        }));
        host.replaceChildren();
        const quantidadeTotal = resultados.reduce((total, fonte) => total + fonte.rows.length, 0);
        const fonte = nome => resultados.find(item => item.titulo === nome);
        const fonteAgenda = fonte('Consultas e atendimentos');
        const consultas = fonteAgenda?.rows || [];
        const hoje = new Date(`${dataLocal()}T00:00:00`);
        const consultasAtrasadas = consultas.filter(item => item.status === 'Agendado' && new Date(String(item.data_hora || '').replace(' ', 'T')) < hoje);
        const reavaliacoesCopm = fonte('Reavaliações COPM')?.rows || [];
        const copmSemReavaliacao = (fonte('COPM')?.rows || []).filter(item => !reavaliacoesCopm.some(reavaliacao =>
            String(reavaliacao.copm_meta_id) === String(item.id) && reavaliacao.reavaliacao_desempenho && reavaliacao.reavaliacao_satisfacao));
        const resumo = card('Visão geral do acompanhamento', `${quantidadeTotal} registros encontrados em ${resultados.length} áreas do prontuário.`);
        if (paciente) {
            const dados = document.createElement('div'); dados.className = 'identificacao-resumo';
            for (const [rotulo, valor] of [['Paciente', paciente.nome], ['Nascimento', dataRelatorio(paciente.data_nascimento)], ['Diagnóstico', paciente.diagnostico], ['Responsável', paciente.responsavel]]) {
                const item = document.createElement('p'); const forte = document.createElement('strong'); forte.textContent = `${rotulo}: `;
                item.append(forte, document.createTextNode(valor || 'Não informado')); dados.append(item);
            }
            resumo.append(dados);
        }
        const indicadores = document.createElement('div'); indicadores.className = 'prontuario-indicadores';
        for (const [rotulo, valor, detalhe] of [
            ['Consultas', consultas.length, `${consultas.filter(item => item.status === 'Realizado').length} realizadas`],
            ['Registros clínicos', quantidadeTotal - consultas.length, 'Avaliações, planos e evoluções'],
            ['Pontos para conferir', consultasAtrasadas.length + copmSemReavaliacao.length, 'Consultas sem baixa e COPM a reavaliar']
        ]) {
            const indicador = document.createElement('div'); indicador.className = 'prontuario-indicador';
            const nome = document.createElement('span'); nome.textContent = rotulo;
            const total = document.createElement('strong'); total.textContent = String(valor);
            const nota = document.createElement('small'); nota.textContent = detalhe;
            indicador.append(nome, total, nota); indicadores.append(indicador);
        }
        resumo.append(indicadores); host.append(resumo);

        const checklist = card('O que já existe e o que está sem registro', 'Itens sem registro são sinalizados para conferência; isso não substitui o julgamento clínico sobre a necessidade de cada avaliação.');
        const listaStatus = document.createElement('div'); listaStatus.className = 'prontuario-status-grid';
        const listaFeitos = document.createElement('section'); listaFeitos.className = 'prontuario-status-bloco';
        const tituloFeitos = document.createElement('h3'); tituloFeitos.textContent = 'Registros encontrados'; listaFeitos.append(tituloFeitos);
        const listaPendencias = document.createElement('section'); listaPendencias.className = 'prontuario-status-bloco';
        const tituloPendencias = document.createElement('h3'); tituloPendencias.textContent = 'Pontos para conferir'; listaPendencias.append(tituloPendencias);
        const itensChecklist = [
            ['Consultas e atendimentos', 'Consultas'], ['Anamnese', 'Anamnese'], ['Perfil ocupacional', 'Perfil ocupacional'],
            ['COPM', 'COPM'], ['Reavaliações COPM', 'Reavaliações da COPM'], ['Ficha de observação', 'Ficha de observação'], ['Avaliação sensorial', 'Avaliação sensorial'],
            ['PEDI', 'PEDI'], ['Evoluções', 'Evoluções terapêuticas'], ['Plano de intervenção', 'Plano de intervenção'],
            ['Programação terapêutica', 'Programação terapêutica'], ['Roda da vida', 'Roda da vida']
        ];
        const semRegistros = [];
        for (const [nomeFonte, rotulo] of itensChecklist) {
            const itemFonte = fonte(nomeFonte); const total = itemFonte?.rows.length || 0;
            if (total) {
                const li = document.createElement('p'); li.className = 'prontuario-status-ok'; li.textContent = `✓ ${rotulo}: ${total} registro(s)`; listaFeitos.append(li);
            } else if (!itemFonte?.erro) semRegistros.push(rotulo);
        }
        if (semRegistros.length) semRegistros.forEach(rotulo => {
            const li = document.createElement('p'); li.className = 'prontuario-status-pendente'; li.textContent = `• ${rotulo}: sem registro`; listaPendencias.append(li);
        });
        if (consultasAtrasadas.length) {
            const li = document.createElement('p'); li.className = 'prontuario-status-pendente';
            li.textContent = `${consultasAtrasadas.length} consulta(s) passada(s) ainda marcadas como agendadas.`; listaPendencias.append(li);
        }
        if (copmSemReavaliacao.length) {
            const li = document.createElement('p'); li.className = 'prontuario-status-pendente';
            li.textContent = `${copmSemReavaliacao.length} problema(s) COPM sem as duas notas de reavaliação.`; listaPendencias.append(li);
        }
        if (!listaFeitos.querySelector('p')) { const vazio = document.createElement('p'); vazio.textContent = 'Nenhum registro encontrado ainda.'; listaFeitos.append(vazio); }
        if (!listaPendencias.querySelector('p')) { const vazio = document.createElement('p'); vazio.className = 'prontuario-status-ok'; vazio.textContent = 'Nenhum ponto automático para conferir.'; listaPendencias.append(vazio); }
        listaStatus.append(listaFeitos, listaPendencias); checklist.append(listaStatus); host.append(checklist);
        for (const fonte of resultados) {
            const details = document.createElement('details'); details.className = 'registro-prontuario';
            details.open = true;
            const summary = document.createElement('summary'); summary.textContent = `${fonte.titulo} — ${fonte.rows.length} registro(s)`; details.append(summary);
            if (fonte.erro) { const aviso = document.createElement('p'); aviso.className = 'texto-ajuda'; aviso.textContent = `Não foi possível carregar este módulo: ${fonte.erro}`; details.append(aviso); }
            else if (fonte.rows.length) {
                fonte.rows.sort((a, b) => String(b.data_hora || b.data_registro || b.data_avaliacao || b.data_atendimento || '').localeCompare(String(a.data_hora || a.data_registro || a.data_avaliacao || a.data_atendimento || '')));
                fonte.rows.forEach(registro => desenharRegistroProntuario(details, registro, fonte.titulo));
            } else { const vazio = document.createElement('p'); vazio.className = 'texto-ajuda'; vazio.textContent = 'Nenhum registro neste módulo.'; details.append(vazio); }
            host.append(details);
        }
    } catch (erro) { host.textContent = 'Não foi possível carregar o prontuário: ' + erro.message; }
}

function dataRelatorio(valor) {
    if (!valor) return 'Não informada';
    const texto = String(valor);
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
    return match ? `${match[3]}/${match[2]}/${match[1]}${match[4] ? ` ${match[4]}` : ''}` : texto;
}

function filtrarPeriodoRelatorio(rows, campoData, inicio, fim) {
    return rows.filter(row => {
        const data = String(row[campoData] || '').slice(0, 10);
        if (!data && (inicio || fim)) return false;
        return (!inicio || data >= inicio) && (!fim || data <= fim);
    });
}

function ordenarRegistrosPorData(rows, campoData) {
    return [...rows].sort((a, b) => String(a[campoData] || '').localeCompare(String(b[campoData] || '')));
}

function renderizarRelatorio() {
    const root = document.getElementById('conteudo-relatorio');
    if (root.dataset.inicializado) return;
    root.dataset.inicializado = 'true';
    const painel = card('Relatório terapêutico', 'Documento clínico preenchido com o prontuário. Revise, edite e complete as informações exigidas pelo convênio antes de assinar e encaminhar. Cada operadora pode solicitar campos ou modelos próprios.');
    const filtros = document.createElement('div'); filtros.className = 'grade-formulario';
    const pacienteCampo = grupoCampo({ name: 'paciente_id', label: 'Paciente', type: 'patient' }, 'relatorio-');
    const inicioCampo = grupoCampo({ name: 'periodo_inicio', label: 'Período — início', type: 'date' }, 'relatorio-');
    const fimCampo = grupoCampo({ name: 'periodo_fim', label: 'Período — fim', type: 'date' }, 'relatorio-');
    filtros.append(pacienteCampo, inicioCampo, fimCampo); painel.append(filtros);
    const instrucao = document.createElement('p'); instrucao.className = 'texto-ajuda';
    instrucao.textContent = 'Deixe as datas vazias para incluir todo o histórico disponível. O texto gerado pode ser editado antes de imprimir ou salvar em PDF.'; painel.append(instrucao);
    const salvoGrupo = document.createElement('div'); salvoGrupo.className = 'form-grupo campo-largo relatorio-salvos-wrap';
    const salvoLabel = document.createElement('label'); salvoLabel.htmlFor = 'relatorio-salvo'; salvoLabel.textContent = 'Relatórios já salvos deste paciente';
    const salvoSelect = document.createElement('select'); salvoSelect.id = 'relatorio-salvo'; salvoSelect.add(new Option('Selecione um relatório salvo...', ''));
    salvoGrupo.append(salvoLabel, salvoSelect); painel.append(salvoGrupo);
    const areaLabel = document.createElement('label'); areaLabel.htmlFor = 'relatorio-texto'; areaLabel.textContent = 'Relatório editável'; painel.append(areaLabel);
    const area = document.createElement('textarea'); area.id = 'relatorio-texto'; area.rows = 24; area.className = 'relatorio-editor'; area.placeholder = 'Selecione um paciente e gere o relatório.'; painel.append(area);
    const actions = document.createElement('div'); actions.className = 'acoes-formulario';
    const gerar = document.createElement('button'); gerar.type = 'button'; gerar.className = 'btn-salvar'; gerar.textContent = 'Gerar relatório';
    const salvar = document.createElement('button'); salvar.type = 'button'; salvar.className = 'btn-acao'; salvar.textContent = 'Salvar relatório';
    const outroPaciente = document.createElement('button'); outroPaciente.type = 'button'; outroPaciente.className = 'btn-acao btn-secundario'; outroPaciente.textContent = 'Carregar outro paciente';
    const baixar = document.createElement('button'); baixar.type = 'button'; baixar.className = 'btn-acao'; baixar.textContent = 'Baixar .txt';
    const imprimir = document.createElement('button'); imprimir.type = 'button'; imprimir.className = 'btn-acao'; imprimir.textContent = 'Imprimir / salvar em PDF';
    const status = document.createElement('span'); status.id = 'status-relatorio'; status.className = 'feedback-formulario'; status.setAttribute('role', 'status');
    actions.append(gerar, salvar, outroPaciente, baixar, imprimir, status); painel.append(actions); root.append(painel); preencherSeletoresPaciente();
    const seletorPaciente = pacienteCampo.querySelector('select');

    async function atualizarListaRelatoriosSalvos() {
        const pacienteId = seletorPaciente.value;
        salvoSelect.replaceChildren(new Option('Selecione um relatório salvo...', ''));
        if (!pacienteId) return;
        try {
            const rows = await requestJSON(`/relatorios_convenio?paciente_id=${encodeURIComponent(pacienteId)}`);
            if (seletorPaciente.value !== pacienteId) return;
            for (const row of rows) {
                const periodo = row.periodo_inicio || row.periodo_fim
                    ? `${dataRelatorio(row.periodo_inicio)} a ${dataRelatorio(row.periodo_fim)}`
                    : 'Histórico completo';
                salvoSelect.add(new Option(`${dataRelatorio(row.criado_em)} · ${periodo}`, row.id));
            }
        } catch (erro) { status.textContent = `Não foi possível carregar os relatórios salvos: ${erro.message}`; }
    }

    seletorPaciente.addEventListener('change', atualizarListaRelatoriosSalvos);
    salvoSelect.addEventListener('change', async () => {
        if (!salvoSelect.value) return;
        status.textContent = 'Carregando relatório salvo…';
        try {
            const relatorio = await requestJSON(`/relatorios_convenio/${encodeURIComponent(salvoSelect.value)}`);
            seletorPaciente.value = String(relatorio.paciente_id);
            area.value = relatorio.conteudo; area.dataset.pacienteId = String(relatorio.paciente_id);
            inicioCampo.querySelector('input').value = relatorio.periodo_inicio || '';
            fimCampo.querySelector('input').value = relatorio.periodo_fim || '';
            status.textContent = `Relatório de ${relatorio.paciente_nome} carregado.`;
        } catch (erro) { status.textContent = erro.message; }
    });
    outroPaciente.addEventListener('click', () => {
        seletorPaciente.value = ''; inicioCampo.querySelector('input').value = ''; fimCampo.querySelector('input').value = '';
        area.value = ''; delete area.dataset.pacienteId; salvoSelect.replaceChildren(new Option('Selecione um relatório salvo...', ''));
        status.textContent = 'Selecione outro paciente para gerar um novo relatório.';
    });
    salvar.addEventListener('click', async () => {
        const pacienteId = seletorPaciente.value;
        if (!pacienteId) { status.textContent = 'Selecione o paciente antes de salvar.'; return; }
        if (!area.value.trim()) { status.textContent = 'Gere ou escreva o relatório antes de salvar.'; return; }
        if (area.dataset.pacienteId !== String(pacienteId)) { status.textContent = 'O paciente mudou. Gere novamente o relatório antes de salvar.'; return; }
        salvar.disabled = true; status.textContent = 'Salvando relatório…';
        try {
            const resposta = await requestJSON('/relatorios_convenio', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paciente_id: pacienteId, periodo_inicio: inicioCampo.querySelector('input').value || null, periodo_fim: fimCampo.querySelector('input').value || null, conteudo: area.value })
            });
            await atualizarListaRelatoriosSalvos(); salvoSelect.value = String(resposta.id);
            status.textContent = 'Relatório salvo no prontuário do paciente.';
        } catch (erro) { status.textContent = erro.message; }
        finally { salvar.disabled = false; }
    });
    gerar.addEventListener('click', async () => {
        const paciente = pacientes.find(p => String(p.id) === pacienteCampo.querySelector('select').value);
        if (!paciente) { status.textContent = 'Selecione o paciente.'; return; }
        const inicio = inicioCampo.querySelector('input').value; const fim = fimCampo.querySelector('input').value;
        if (inicio && fim && inicio > fim) { status.textContent = 'A data inicial precisa ser anterior à data final.'; return; }
        status.textContent = 'Buscando dados do prontuário…';
        try {
            const id = encodeURIComponent(paciente.id);
            const rotas = [
                ['agenda', '/agenda'], ['anamnese', '/anamnese'], ['perfil', '/perfil_ocupacional'], ['copm', '/copm'], ['copmReavaliacoes', '/copm/reavaliacoes'],
                ['pedi', '/pedi_autocuidado'], ['sensorial', '/avaliacao_sensorial'], ['evolucoes', '/evolucao_terapeutica'],
                ['planos', '/plano_intervencao'], ['programacao', '/programacao'], ['roda', '/roda_vida'], ['fichas', '/ficha_observacao']
            ];
            const respostas = await Promise.all(rotas.map(async ([chave, rota]) => [chave, await requestJSON(`${rota}?paciente_id=${id}`)]));
            const dados = Object.fromEntries(respostas.map(([chave, rows]) => [chave, rows.filter(row => String(row.paciente_id) === String(paciente.id))]));
            const consultas = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.agenda, 'data_hora', inicio, fim), 'data_hora');
            const evolucoes = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.evolucoes, 'data_registro', inicio, fim), 'data_registro');
            const registrosCopm = filtrarPeriodoRelatorio(dados.copm, 'data_avaliacao', inicio, fim);
            const reavaliacoesCopm = filtrarPeriodoRelatorio(dados.copmReavaliacoes, 'data_reavaliacao', inicio, fim);
            const programacoes = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.programacao, 'data_registro', inicio, fim), 'data_registro');
            const fichas = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.fichas, 'data_atendimento', inicio, fim), 'data_atendimento');
            const anamnese = ordenarRegistrosPorData(dados.anamnese, 'data_avaliacao').at(-1);
            const perfil = ordenarRegistrosPorData(dados.perfil, 'data_avaliacao').at(-1);
            const plano = ordenarRegistrosPorData(dados.planos, 'data_registro').at(-1);
            const pedi = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.pedi, 'data_avaliacao', inicio, fim), 'data_avaliacao').at(-1);
            const sensorial = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.sensorial, 'data_avaliacao', inicio, fim), 'data_avaliacao').at(-1);
            const roda = ordenarRegistrosPorData(filtrarPeriodoRelatorio(dados.roda, 'data_avaliacao', inicio, fim), 'data_avaliacao').at(-1);
            const textoPeriodo = inicio && fim ? `${dataRelatorio(inicio)} a ${dataRelatorio(fim)}`
                : inicio ? `a partir de ${dataRelatorio(inicio)}` : fim ? `até ${dataRelatorio(fim)}` : 'todo o histórico disponível';
            const linhas = [
                'RELATÓRIO TERAPÊUTICO CIRCUNSTANCIADO — CONVÊNIO',
                `Período: ${textoPeriodo}`,
                `Data de emissão: ${dataRelatorio(dataLocal())}`, '',
                '1. IDENTIFICAÇÃO', `Paciente: ${paciente.nome}`, `Data de nascimento: ${dataRelatorio(paciente.data_nascimento)}`,
                `Diagnóstico / motivo do acompanhamento: ${paciente.diagnostico || 'Não informado'}`,
                `Responsável: ${paciente.responsavel || 'Não informado'}`, `Contato: ${paciente.telefone || 'Não informado'}`, '',
                'DADOS PARA AUTORIZAÇÃO DO CONVÊNIO',
                'Convênio / operadora: [Preencher]', 'Número da carteirinha / beneficiário: [Preencher]',
                'Número da guia / autorização: [Preencher]', 'Médico solicitante / CRM: [Preencher]',
                'Procedimento e quantidade de sessões solicitadas: [Preencher]', '',
                '2. HISTÓRICO E PERFIL OCUPACIONAL',
                `Histórico médico e de desenvolvimento: ${anamnese?.historico_medico_desenvolvimento || 'Não registrado.'}`,
                `Histórico educacional: ${anamnese?.historico_educacional || 'Não registrado.'}`,
                `Histórico terapêutico: ${anamnese?.historico_terapeutico || 'Não registrado.'}`,
                `Ocupações: ${perfil?.ocupacoes || 'Não registrado.'}`, `Padrões de desempenho: ${perfil?.padroes_desempenho || 'Não registrado.'}`,
                `Fatores ambientais: ${perfil?.ambiental || 'Não registrado.'}`, `Desafios de participação: ${perfil?.desafios_participacao || 'Não registrado.'}`, '',
                '3. PLANO E OBJETIVOS TERAPÊUTICOS'
            ];
            let itensPlano = plano?.itens;
            if (typeof itensPlano === 'string') { try { itensPlano = JSON.parse(itensPlano); } catch { itensPlano = []; } }
            if (Array.isArray(itensPlano) && itensPlano.length) {
                linhas.push(`Plano registrado em ${dataRelatorio(plano.data_registro)} — responsável: ${plano.profissional_responsavel || 'Não informado'}`);
                itensPlano.forEach(item => linhas.push(`• ${item.programa || 'Programa não identificado'}`, `  Curto prazo: ${item.curto || 'Não informado'}`, `  Médio prazo: ${item.medio || 'Não informado'}`, `  Longo prazo: ${item.longo || 'Não informado'}`));
            } else linhas.push('Não há plano de intervenção registrado.');
            if (programacoes.length) {
                linhas.push('', 'PROGRAMAÇÃO TERAPÊUTICA NO PERÍODO');
                programacoes.forEach(item => linhas.push(
                    `${dataRelatorio(item.data_registro)} · ${item.programa || 'Programa não informado'}`,
                    `Objetivos: ${item.objetivos || 'Não informados'} · Tentativas: ${item.tentativas || '—'} · Alcançado: ${item.alcancado || 'Não informado'}`
                ));
            }
            linhas.push('', '4. ACOMPANHAMENTO NO PERÍODO',
                `Consultas agendadas: ${consultas.length}`, `Realizadas: ${consultas.filter(item => item.status === 'Realizado').length}`,
                `Agendadas/pendentes: ${consultas.filter(item => item.status === 'Agendado').length}`, `Canceladas: ${consultas.filter(item => item.status === 'Cancelado').length}`,
                `Evoluções terapêuticas registradas: ${evolucoes.length}`, '');
            if (consultas.length) {
                linhas.push('CONSULTAS');
                consultas.forEach(item => linhas.push(`${dataRelatorio(item.data_hora)} — ${item.status || 'Sem status'}${item.observacoes ? ` — ${item.observacoes}` : ''}`));
                linhas.push('');
            }
            if (evolucoes.length) {
                linhas.push('EVOLUÇÕES DE SESSÃO');
                evolucoes.forEach(item => linhas.push(
                    `Data: ${dataRelatorio(item.data_registro)} · ${item.horario || ''} · ${item.duracao || ''}`,
                    `Profissional: ${item.profissional || 'Não informado'} · Especialidade: ${item.especialidade || 'Não informada'}`,
                    `Programa: ${item.programa_terapeutico || 'Não informado'}`, `Objetivo: ${item.objetivo || 'Não informado'}`,
                    `Evolução: ${item.evolucao || 'Não informada'}`, `Desempenho: ${item.desempenho || 'Não informado'}`,
                    `Intercorrências: ${item.intercorrencias || 'Nenhuma registrada'}`, `Conduta: ${item.conduta || 'Não informada'}`, ''
                ));
            } else linhas.push('Não há evoluções registradas no período selecionado.', '');
            linhas.push(`FICHAS DE OBSERVAÇÃO INFANTIL NO PERÍODO: ${fichas.length}`);
            if (fichas.length) {
                for (const ficha of fichas) {
                    linhas.push('', `${dataRelatorio(ficha.data_atendimento)} · Atendimento ${ficha.atendimento_num || 'não informado'} · ${ficha.duracao || 'duração não informada'}`);
                    let itensObservados = ficha.checkboxes;
                    if (typeof itensObservados === 'string') { try { itensObservados = JSON.parse(itensObservados); } catch { itensObservados = []; } }
                    if (Array.isArray(itensObservados) && itensObservados.length) {
                        linhas.push('Itens observados:', ...itensObservados.filter(item => item.marcado).map(item => `• ${item.grupo}: ${item.item}`));
                    }
                    for (let etapa = 1; etapa <= 7; etapa++) if (ficha[`obs_${etapa}`]) linhas.push(`Observações da etapa ${etapa}: ${ficha[`obs_${etapa}`]}`);
                    for (const [rotulo, campo] of [
                        ['Dúvidas / relatos do cuidador', 'orientacoes_cuidador'], ['Desempenho observado', 'sintese_desempenho'],
                        ['Aspectos da faixa etária', 'sintese_faixa_etaria'], ['Aspectos a acompanhar', 'sintese_acompanhar'],
                        ['Conduta', 'sintese_conduta'], ['Encaminhamento / avaliação complementar', 'sintese_encaminhamento']
                    ]) if (ficha[campo]) linhas.push(`${rotulo}: ${ficha[campo]}`);
                }
                linhas.push('');
            }
            linhas.push('5. AVALIAÇÕES COMPLEMENTARES');
            if (registrosCopm.length) {
                linhas.push('COPM — problemas ocupacionais e escores iniciais:');
                registrosCopm.forEach(item => linhas.push(
                    `${dataRelatorio(item.data_avaliacao)} · ${item.atividade_problema || 'Problema não descrito'} · Importância ${item.nivel_importancia || '—'} · Desempenho ${item.desempenho_inicial || '—'} · Satisfação ${item.satisfacao_inicial || '—'}`
                ));
            } else linhas.push('COPM: sem registro no período.');
            if (reavaliacoesCopm.length) {
                const sessoes = new Map();
                for (const item of reavaliacoesCopm) {
                    if (!sessoes.has(String(item.sessao_id))) sessoes.set(String(item.sessao_id), { ...item, itens: [] });
                    sessoes.get(String(item.sessao_id)).itens.push(item);
                }
                linhas.push('', 'REAVALIAÇÕES COPM');
                for (const sessao of sessoes.values()) {
                    linhas.push('', `${sessao.legado ? 'Registro anterior (data não informada)' : dataRelatorio(sessao.data_reavaliacao)} · referência inicial ${dataRelatorio(sessao.data_avaliacao_base)}`);
                    for (const item of sessao.itens) linhas.push(
                        `${item.atividade_problema || 'Problema não descrito'} · Desempenho ${item.desempenho_inicial ?? '—'} → ${item.reavaliacao_desempenho ?? '—'} · Satisfação ${item.satisfacao_inicial ?? '—'} → ${item.reavaliacao_satisfacao ?? '—'}${item.observacao_item ? ` · Observação: ${item.observacao_item}` : ''}`
                    );
                }
            }
            linhas.push(pedi ? `PEDI — Autocuidado: ${pedi.escore_total ?? '—'} de 73 itens capazes em ${dataRelatorio(pedi.data_avaliacao)}.` : 'PEDI — Autocuidado: sem avaliação no período.');
            if (sensorial) {
                const valores = habilidadesSensoriais.flatMap(grupo => grupo.itens).map(([campo]) => Number(sensorial[campo])).filter(valor => Number.isFinite(valor) && valor >= 1 && valor <= 10);
                const media = valores.length ? (valores.reduce((soma, valor) => soma + valor, 0) / valores.length).toFixed(1) : '—';
                linhas.push(`Avaliação sensorial: ${valores.length}/20 habilidades pontuadas; média ${media}/10 (${dataRelatorio(sensorial.data_avaliacao)}).`);
            } else linhas.push('Avaliação sensorial: sem registro no período.');
            if (roda) {
                const valores = rodaAreas.map(([campo]) => Number(roda[campo])).filter(valor => Number.isFinite(valor) && valor >= 1 && valor <= 10);
                const media = valores.length ? (valores.reduce((soma, valor) => soma + valor, 0) / valores.length).toFixed(1) : '—';
                linhas.push(`Roda da Vida: ${valores.length}/12 áreas pontuadas; média ${media}/10 (${dataRelatorio(roda.data_avaliacao)}).`);
            } else linhas.push('Roda da Vida: sem registro no período.');
            linhas.push('', '6. SÍNTESE, JUSTIFICATIVA E RECOMENDAÇÃO PROFISSIONAL',
                '[Descreva a análise clínica, a necessidade de continuidade e as recomendações para o convênio.]', '',
                'Documento elaborado a partir dos registros disponíveis no prontuário. Revise e complemente as informações antes de assinar e encaminhar.', '',
                '______________________________________________', `Terapeuta: ${terapeutaAtual?.nome || 'Não informado'}`,
                `CREFITO: ${terapeutaAtual?.crefito || 'Não informado'}`, 'Assinatura e carimbo', 'Data: ____/____/________');
            area.value = linhas.join('\n'); area.dataset.pacienteId = String(paciente.id);
            status.textContent = 'Relatório gerado e preenchido com os registros disponíveis. Revise antes de encaminhar.';
        } catch (erro) { status.textContent = `Não foi possível gerar o relatório: ${erro.message}`; }
    });
    baixar.addEventListener('click', async () => {
        if (!area.value.trim()) { status.textContent = 'Gere ou escreva o relatório antes de baixar.'; return; }
        try { await window.TabletApi.shareText(area.value); status.textContent = 'Relatório enviado ao seletor do Android. Confira o destino escolhido.'; }
        catch { status.textContent = 'A exportação do relatório não foi concluída.'; }
    });
    imprimir.addEventListener('click', () => {
        if (!area.value.trim()) { status.textContent = 'Gere ou escreva o relatório antes de imprimir.'; return; }
        const janela = window.open('', '_blank');
        if (!janela) { status.textContent = 'Permita a abertura da janela de impressão para continuar.'; return; }
        janela.document.title = 'Relatório terapêutico para convênio';
        const estilo = janela.document.createElement('style');
        estilo.textContent = 'body{font:12pt Arial,sans-serif;max-width:850px;margin:32px auto;line-height:1.55;color:#111}pre{white-space:pre-wrap;font:inherit} @media print{body{margin:0;max-width:none}}';
        const pre = janela.document.createElement('pre'); pre.textContent = area.value;
        janela.document.head.append(estilo); janela.document.body.append(pre); janela.focus(); janela.print();
    });
}

function iniciaisTerapeuta(nome) {
    return String(nome || 'Terapeuta').split(/\s+/).filter(Boolean).slice(0, 2)
        .map(parte => parte[0].toLocaleUpperCase('pt-BR')).join('');
}

function atualizarFotoPerfilInterface() {
    const nome = terapeutaAtual?.nome || 'Terapeuta';
    const foto = terapeutaAtual?.foto_perfil || '';
    const iniciais = iniciaisTerapeuta(nome);
    for (const [imagemId, iniciaisId] of [['sidebar-foto-img', 'sidebar-foto-iniciais'], ['perfil-foto-preview', 'perfil-foto-iniciais']]) {
        const imagem = document.getElementById(imagemId); const letras = document.getElementById(iniciaisId);
        if (!imagem || !letras) continue;
        if (foto) { imagem.src = foto; imagem.hidden = false; letras.hidden = true; }
        else { imagem.removeAttribute('src'); imagem.hidden = true; letras.textContent = iniciais; letras.hidden = false; }
    }
    const remover = document.getElementById('remover-foto-perfil');
    if (remover) remover.disabled = !foto;
}

async function converterFotoPerfil(arquivo) {
    if (!arquivo?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
    if (arquivo.size > 10 * 1024 * 1024) throw new Error('A imagem original deve ter no máximo 10 MB.');
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const foto = await new Promise((resolve, reject) => canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Não foi possível processar esta imagem.')); return; }
        resolve(blob);
    }, 'image/jpeg', 0.82));
    if (foto.size > 600 * 1024) throw new Error('A imagem continua grande após a otimização. Escolha outra foto.');
    return await new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        leitor.readAsDataURL(foto);
    });
}

function renderizarPerfil() {
    const root = document.getElementById('sec-perfil'); if (!root || root.dataset.perfilInicializado) return;
    root.dataset.perfilInicializado = 'true';
    const info = card('Meu perfil profissional', 'Personalize sua identificação no portal e nos atendimentos.');
    const resumo = document.createElement('div'); resumo.className = 'perfil-profissional-resumo';
    const avatar = document.createElement('div'); avatar.className = 'perfil-avatar';
    avatar.setAttribute('aria-label', 'Foto de perfil');
    const iniciais = document.createElement('span'); iniciais.id = 'perfil-foto-iniciais'; avatar.append(iniciais);
    const preview = document.createElement('img'); preview.id = 'perfil-foto-preview'; preview.alt = 'Foto de perfil da terapeuta'; preview.hidden = true; avatar.append(preview);
    const dados = document.createElement('div'); dados.className = 'perfil-dados';
    const nomeEl = document.createElement('h3'); nomeEl.textContent = terapeutaAtual?.nome || 'Terapeuta';
    const crefito = document.createElement('p'); crefito.textContent = `CREFITO: ${terapeutaAtual?.crefito || 'Não informado'}`;
    const controles = document.createElement('div'); controles.className = 'perfil-foto-acoes';
    const arquivo = document.createElement('input'); arquivo.type = 'file'; arquivo.id = 'perfil-foto-arquivo'; arquivo.className = 'input-arquivo-escondido';
    arquivo.accept = 'image/jpeg,image/png,image/webp'; arquivo.setAttribute('aria-label', 'Escolher foto de perfil');
    const carregar = document.createElement('label'); carregar.htmlFor = arquivo.id; carregar.className = 'btn-acao'; carregar.textContent = 'Carregar foto';
    const remover = document.createElement('button'); remover.type = 'button'; remover.id = 'remover-foto-perfil'; remover.className = 'btn-acao btn-secundario'; remover.textContent = 'Remover foto';
    const statusFoto = document.createElement('span'); statusFoto.id = 'status-foto-perfil'; statusFoto.className = 'feedback-formulario'; statusFoto.setAttribute('role', 'status');
    controles.append(arquivo, carregar, remover, statusFoto);
    dados.append(nomeEl, crefito, controles); resumo.append(avatar, dados); info.append(resumo); root.prepend(info);
    atualizarFotoPerfilInterface();
    arquivo.addEventListener('change', async () => {
        const imagem = arquivo.files?.[0]; if (!imagem) return;
        statusFoto.textContent = 'Otimizando e salvando foto…'; arquivo.disabled = true;
        try {
            const foto = await converterFotoPerfil(imagem);
            const resposta = await requestJSON('/sessao/foto', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foto_perfil: foto })
            });
            terapeutaAtual.foto_perfil = resposta.foto_perfil; atualizarFotoPerfilInterface();
            statusFoto.textContent = 'Foto salva no perfil.';
        } catch (erro) { statusFoto.textContent = erro.message; }
        finally { arquivo.disabled = false; arquivo.value = ''; }
    });
    remover.addEventListener('click', async () => {
        statusFoto.textContent = 'Removendo foto…'; remover.disabled = true;
        try {
            await requestJSON('/sessao/foto', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foto_perfil: null })
            });
            terapeutaAtual.foto_perfil = null; atualizarFotoPerfilInterface(); statusFoto.textContent = 'Foto removida do perfil.';
        } catch (erro) { statusFoto.textContent = erro.message; remover.disabled = false; }
    });
}

function carregarSecao(idSecao) {
    const rotas = {
        'sec-dashboard': carregarDashboard,
        'sec-pacientes': renderizarPacientes,
        'sec-agenda': renderizarAgenda,
        'sec-copm': () => {
            const root = document.getElementById('conteudo-copm');
            if (root) renderizarIdentificacaoPaciente(root);
            ['anamnese', 'perfilOcupacional'].forEach(renderizarModulo);
            renderizarCOPM();
        },
        'sec-ficha-observacao': renderizarFichaObservacao,
        'sec-sensorial': renderizarSensorial,
        'sec-evolucao': () => renderizarModulo('evolucao'),
        'sec-pedi': renderizarPEDI,
        'sec-plano-intervencao': renderizarPlanoIntervencao,
        'sec-programacao': renderizarProgramacao,
        'sec-rodavida': renderizarRodaVida,
        'sec-prontuario': renderizarProntuario,
        'sec-relatorio': renderizarRelatorio,
        'sec-perfil': renderizarPerfil
    };
    rotas[idSecao]?.();
}

function mudarTela(idSecao) {
    document.querySelectorAll('.secao').forEach(secao => secao.classList.remove('ativa'));
    document.getElementById(idSecao)?.classList.add('ativa');
    const titulo = document.querySelector('.top-bar .titulo-pagina');
    if (titulo) titulo.textContent = titulosSecoes[idSecao] || 'Gestão Clínica';
    document.querySelectorAll('.sidebar a[data-secao]').forEach(link => {
        const ativo = link.dataset.secao === idSecao;
        link.classList.toggle('ativo', ativo);
        if (ativo) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (window.innerWidth <= 760) document.getElementById('sidebar')?.classList.add('escondida');
    document.getElementById('conteudo')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    carregarSecao(idSecao);
}

function alternarMenu() {
    document.getElementById('sidebar')?.classList.toggle('escondida');
}

function atualizarControleTema() {
    const botao = document.getElementById('btn-tema-visual'); if (!botao) return;
    const escuro = document.body.classList.contains('dark-mode');
    botao.textContent = escuro ? '☀️ Tema claro' : '🌙 Tema escuro';
    botao.setAttribute('aria-pressed', String(escuro));
}

function mudarTemaVisual() {
    document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('portal-tema', document.body.classList.contains('dark-mode') ? 'escuro' : 'claro'); } catch { /* Tema continua ativo nesta sessão mesmo sem armazenamento local. */ }
    atualizarControleTema();
}

async function realizarLogin(evento) {
    evento.preventDefault();
    try {
        const resposta = await requestJSON('/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: document.getElementById('login_usuario').value.trim(), senha: document.getElementById('login_senha').value })
        });
        sessionStorage.setItem('token_sessao', resposta.token);
        abrirPortal(resposta.terapeuta);
    } catch (erro) { mostrarAviso(erro.message); }
}

function abrirPortal(terapeuta) {
    terapeutaAtual = terapeuta || null;
    pacienteSelecionadoNaPaginaClinica = '';
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app-principal').style.display = 'flex';
    document.getElementById('sidebar-nome').textContent = terapeuta?.nome || 'Terapeuta';
    document.getElementById('sidebar-crefito').textContent = terapeuta?.crefito || '';
    atualizarFotoPerfilInterface();
    if (window.innerWidth <= 760) document.getElementById('sidebar')?.classList.add('escondida');
    else document.getElementById('sidebar')?.classList.remove('escondida');
    carregarPacientes().then(() => mudarTela('sec-dashboard')).catch(erro => mostrarAviso(erro.message));
}

function terminarSessao() {
    window.TabletApi.lock();
    sessionStorage.removeItem('token_sessao');
    document.getElementById('app-principal').style.display = 'none';
    document.getElementById('tela-login').style.display = 'flex';
    window.location.reload();
}

function mostrarRegistoTerapeuta(evento) {
    evento.preventDefault();
    document.getElementById('card-login-principal').style.display = 'none';
    document.getElementById('card-registo-terapeuta').style.display = 'block';
}

function voltarLogin(evento) {
    evento.preventDefault();
    document.getElementById('card-registo-terapeuta').style.display = 'none';
    document.getElementById('card-login-principal').style.display = 'block';
}

async function registarTerapeuta(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById('reg_nome').value.trim(), crefito: document.getElementById('reg_crefito').value.trim(),
        usuario: document.getElementById('reg_usuario').value.trim(), senha: document.getElementById('reg_senha').value,
        codigo_convite: document.getElementById('reg_codigo_convite').value
    };
    try {
        await requestJSON('/terapeutas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
        document.getElementById('registoTerapeuta').reset(); document.getElementById('login_usuario').value = dados.usuario;
        voltarLogin(evento); mostrarAviso('Conta criada. Entre com seu usuário e senha.');
    } catch (erro) { mostrarAviso(erro.message); }
}

async function alterarSenha(evento) {
    evento.preventDefault();
    const senhaNova = document.getElementById('senha_nova').value;
    if (senhaNova !== document.getElementById('senha_confirmacao').value) { mostrarAviso('A confirmação não corresponde à nova senha.'); return; }
    try {
        await requestJSON('/sessao/senha', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha_atual: document.getElementById('senha_atual').value, senha_nova: senhaNova })
        });
        document.getElementById('formAlterarSenha').reset(); terminarSessao();
        mostrarAviso('Senha alterada. Entre novamente com a nova senha.');
    } catch (erro) { mostrarAviso(erro.message); }
}

window.addEventListener('DOMContentLoaded', async () => {
    try { if (localStorage.getItem('portal-tema') === 'escuro') document.body.classList.add('dark-mode'); } catch { /* Preferência visual opcional. */ }
    document.getElementById('btn-tema-visual')?.addEventListener('click', mudarTemaVisual);
    atualizarControleTema();
    if (!sessionStorage.getItem('token_sessao')) return;
    try {
        const sessao = await requestJSON('/sessao');
        abrirPortal(sessao.terapeuta);
    } catch { sessionStorage.removeItem('token_sessao'); }
});
