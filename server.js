
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const scryptAsync = promisify(crypto.scrypt);
const AUTH_SECRET = process.env.AUTH_SECRET;
const SIGNUP_INVITE_CODE = process.env.SIGNUP_INVITE_CODE || '';
const LOGIN_DESENVOLVIMENTO_ATIVO = process.env.NODE_ENV === 'development' && process.env.DEV_LOGIN_ENABLED === 'true';
const ORIGENS_PERMITIDAS = new Set(
    (process.env.CORS_ORIGINS || '').split(',').map(origem => origem.trim()).filter(Boolean)
);
const JANELA_FALHAS_LOGIN_MS = 15 * 60 * 1000;
const MAX_FALHAS_LOGIN = 10;
const falhasLoginPorIp = new Map();

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(cors({
    origin(origem, callback) {
        if (process.env.NODE_ENV !== 'production' || !origem || ORIGENS_PERMITIDAS.has(origem)) {
            return callback(null, true);
        }
        callback(null, false);
    }
}));
app.use(express.json({ limit: '2mb' }));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinica_terapia',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    charset: 'utf8mb4'
});

function executar(handler) {
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (erro) {
            console.error('Erro na rota:', erro.message);

            if (!res.headersSent) {
                if (erro.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ erro: 'Este nome de usuário já está cadastrado.' });
                }
                if (erro.statusCode) {
                    return res.status(erro.statusCode).json({ erro: erro.message });
                }
                res.status(500).json({ erro: 'Erro ao executar a operação.' });
            }
        }
    };
}

function dataMySQL(valor) {
    if (!valor) return null;
    return String(valor).replace('T', ' ').slice(0, 19);
}

function jsonSeguro(valor) {
    if (valor === undefined || valor === null) return null;
    return typeof valor === 'object'
        ? JSON.stringify(valor)
        : valor;
}

async function hashSenha(senha) {
    const salt = crypto.randomBytes(16).toString('base64url');
    const hash = await scryptAsync(senha, salt, 64);
    return `scrypt$${salt}$${Buffer.from(hash).toString('base64url')}`;
}

function compararSeguro(a, b) {
    const bufferA = Buffer.from(String(a));
    const bufferB = Buffer.from(String(b));
    return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

function chaveIpLogin(req) {
    return String(req.ip || req.socket.remoteAddress || 'desconhecido').slice(0, 120);
}

function bloqueioPorFalhasLogin(req, res) {
    const chave = chaveIpLogin(req);
    const estado = falhasLoginPorIp.get(chave);
    if (!estado) return false;
    if (estado.expiraEm <= Date.now()) {
        falhasLoginPorIp.delete(chave);
        return false;
    }
    if (estado.quantidade < MAX_FALHAS_LOGIN) return false;

    const segundos = Math.max(1, Math.ceil((estado.expiraEm - Date.now()) / 1000));
    res.set('Retry-After', String(segundos));
    res.status(429).json({ erro: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.' });
    return true;
}

function registrarFalhaLogin(req) {
    const agora = Date.now();
    const chave = chaveIpLogin(req);
    const estado = falhasLoginPorIp.get(chave);
    if (!estado || estado.expiraEm <= agora) {
        falhasLoginPorIp.set(chave, { quantidade: 1, expiraEm: agora + JANELA_FALHAS_LOGIN_MS });
    } else {
        estado.quantidade += 1;
    }

    if (falhasLoginPorIp.size > 5000) {
        for (const [ip, tentativa] of falhasLoginPorIp) {
            if (tentativa.expiraEm <= agora || falhasLoginPorIp.size > 4500) falhasLoginPorIp.delete(ip);
            else break;
        }
    }
}

async function conferirSenha(senhaInformada, senhaSalva) {
    if (typeof senhaSalva !== 'string') return false;

    if (senhaSalva.startsWith('scrypt$')) {
        const [, salt, hashSalvo] = senhaSalva.split('$');
        if (!salt || !hashSalvo) return false;
        const hashInformado = Buffer.from(await scryptAsync(senhaInformada, salt, 64));
        const hashEsperado = Buffer.from(hashSalvo, 'base64url');
        return hashEsperado.length === hashInformado.length &&
            crypto.timingSafeEqual(hashInformado, hashEsperado);
    }

    // Migra a senha antiga em texto simples no primeiro login válido.
    return compararSeguro(senhaInformada, senhaSalva);
}

function emitirToken(usuario) {
    const payload = Buffer.from(JSON.stringify({
        id: usuario.id,
        exp: Date.now() + 12 * 60 * 60 * 1000
    })).toString('base64url');
    const assinatura = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
    return `${payload}.${assinatura}`;
}

function autenticar(req, res, next) {
    const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' });

    const [payload, assinatura] = token.split('.');
    if (!payload || !assinatura) return res.status(401).json({ erro: 'Sessão inválida.' });

    const assinaturaEsperada = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest();
    let assinaturaRecebida;
    try {
        assinaturaRecebida = Buffer.from(assinatura, 'base64url');
    } catch {
        return res.status(401).json({ erro: 'Sessão inválida.' });
    }

    if (assinaturaRecebida.length !== assinaturaEsperada.length ||
        !crypto.timingSafeEqual(assinaturaRecebida, assinaturaEsperada)) {
        return res.status(401).json({ erro: 'Sessão inválida.' });
    }

    try {
        const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!Number.isInteger(dados.id) || dados.exp <= Date.now()) {
            return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
        }
        req.terapeuta = { id: dados.id };
        next();
    } catch {
        return res.status(401).json({ erro: 'Sessão inválida.' });
    }
}

app.get('/', (req, res) => {
    res.json({
        sistema: 'Portal da Terapeuta',
        status: 'online'
    });
});

app.get('/health', executar(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', mysql: 'conectado' });
}));

// LOGIN
app.post('/login', executar(async (req, res) => {
    if (bloqueioPorFalhasLogin(req, res)) return;
    const { usuario, senha } = req.body || {};

    if (typeof usuario !== 'string' || typeof senha !== 'string' ||
        !usuario.trim() || !senha || usuario.length > 50 || senha.length > 256) {
        registrarFalhaLogin(req);
        return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    }

    const acessoDesenvolvimento = LOGIN_DESENVOLVIMENTO_ATIVO && usuario === 'admin' && senha === 'admin';
    const [rows] = acessoDesenvolvimento
        ? await pool.execute(
            `SELECT id, nome, crefito, usuario, foto_perfil, senha
             FROM terapeutas ORDER BY id DESC LIMIT 1`
        )
        : await pool.execute(
            `SELECT id, nome, crefito, usuario, foto_perfil, senha
             FROM terapeutas WHERE usuario = ? LIMIT 1`,
            [usuario]
        );

    const terapeuta = rows[0];
    if (!terapeuta || (!acessoDesenvolvimento && !(await conferirSenha(senha, terapeuta.senha)))) {
        registrarFalhaLogin(req);
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Credenciais inválidas.'
        });
    }

    if (!terapeuta.senha.startsWith('scrypt$')) {
        await pool.execute(
            'UPDATE terapeutas SET senha = ? WHERE id = ?',
            [await hashSenha(senha), terapeuta.id]
        );
    }

    falhasLoginPorIp.delete(chaveIpLogin(req));

    const { senha: senhaPrivada, ...dadosPublicos } = terapeuta;
    res.json({ sucesso: true, token: emitirToken(terapeuta), terapeuta: dadosPublicos });
}));

// CADASTRO DE TERAPEUTA
app.post('/terapeutas', executar(async (req, res) => {
    if (bloqueioPorFalhasLogin(req, res)) return;
    const { nome, crefito, usuario, senha, codigo_convite } = req.body || {};

    if (process.env.NODE_ENV === 'production') {
        if (!SIGNUP_INVITE_CODE) {
            return res.status(403).json({ erro: 'O cadastro está fechado. Solicite um convite ao responsável pelo portal.' });
        }
        if (typeof codigo_convite !== 'string' || codigo_convite.length > 256 || !compararSeguro(codigo_convite, SIGNUP_INVITE_CODE)) {
            registrarFalhaLogin(req);
            return res.status(403).json({ erro: 'Código de convite inválido.' });
        }
    }

    if (!nome || !usuario || !senha) {
        return res.status(400).json({
            erro: 'Nome, usuário e senha são obrigatórios.'
        });
    }

    if (String(senha).length < 12) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 12 caracteres.' });
    }

    const [resultado] = await pool.execute(
        `INSERT INTO terapeutas (nome, crefito, usuario, senha)
         VALUES (?, ?, ?, ?)`,
        [nome, crefito || null, usuario, await hashSenha(senha)]
    );

    res.status(201).json({ id: resultado.insertId });
}));

// As rotas clínicas abaixo exigem uma sessão válida.
app.use(autenticar);

app.get('/sessao', executar(async (req, res) => {
    const [rows] = await pool.execute(
        'SELECT id, nome, crefito, usuario, foto_perfil FROM terapeutas WHERE id = ? LIMIT 1',
        [req.terapeuta.id]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Conta não encontrada.' });
    res.json({ terapeuta: rows[0] });
}));

app.put('/sessao/foto', executar(async (req, res) => {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'foto_perfil')) {
        return res.status(400).json({ erro: 'Informe a foto de perfil ou envie null para removê-la.' });
    }
    const foto = req.body.foto_perfil;
    if (foto !== null && (typeof foto !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(foto))) {
        return res.status(400).json({ erro: 'Envie uma imagem JPEG, PNG ou WebP válida.' });
    }
    if (foto && Buffer.byteLength(foto.slice(foto.indexOf(',') + 1), 'base64') > 600 * 1024) {
        return res.status(413).json({ erro: 'A foto otimizada precisa ter até 600 KB.' });
    }

    await pool.execute('UPDATE terapeutas SET foto_perfil = ? WHERE id = ?', [foto, req.terapeuta.id]);
    res.json({ foto_perfil: foto });
}));

app.get('/relatorios_convenio', executar(async (req, res) => {
    const filtroPaciente = req.query.paciente_id ? 'AND r.paciente_id = ?' : '';
    const valores = req.query.paciente_id ? [req.terapeuta.id, req.query.paciente_id] : [req.terapeuta.id];
    const [rows] = await pool.execute(
        `SELECT r.id, r.paciente_id, p.nome AS paciente_nome, r.periodo_inicio, r.periodo_fim, r.criado_em
         FROM relatorios_convenio r
         INNER JOIN pacientes p ON p.id = r.paciente_id
         WHERE p.terapeuta_id = ? ${filtroPaciente}
         ORDER BY r.criado_em DESC LIMIT 100`,
        valores
    );
    res.json(rows);
}));

app.post('/relatorios_convenio', executar(async (req, res) => {
    const { paciente_id, periodo_inicio, periodo_fim, conteudo } = req.body;
    if (!paciente_id || typeof conteudo !== 'string' || !conteudo.trim()) {
        return res.status(400).json({ erro: 'Selecione o paciente e gere o conteúdo do relatório antes de salvar.' });
    }
    if (periodo_inicio && periodo_fim && periodo_inicio > periodo_fim) {
        return res.status(400).json({ erro: 'O período do relatório está invertido.' });
    }
    if (Buffer.byteLength(conteudo, 'utf8') > 700 * 1024) {
        return res.status(413).json({ erro: 'O relatório ultrapassa o limite permitido para salvar.' });
    }
    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }
    const [resultado] = await pool.execute(
        `INSERT INTO relatorios_convenio (paciente_id, periodo_inicio, periodo_fim, conteudo)
         VALUES (?, ?, ?, ?)`,
        [paciente_id, periodo_inicio || null, periodo_fim || null, conteudo]
    );
    res.status(201).json({ id: resultado.insertId });
}));

app.get('/relatorios_convenio/:id', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT r.id, r.paciente_id, p.nome AS paciente_nome, r.periodo_inicio, r.periodo_fim, r.conteudo, r.criado_em
         FROM relatorios_convenio r
         INNER JOIN pacientes p ON p.id = r.paciente_id
         WHERE r.id = ? AND p.terapeuta_id = ? LIMIT 1`,
        [req.params.id, req.terapeuta.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Relatório não encontrado nesta conta.' });
    res.json(rows[0]);
}));

app.put('/sessao/senha', executar(async (req, res) => {
    const { senha_atual, senha_nova } = req.body;
    if (!senha_atual || !senha_nova) {
        return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
    }
    if (String(senha_nova).length < 12) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 12 caracteres.' });
    }
    if (senha_atual === senha_nova) {
        return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual.' });
    }

    const [rows] = await pool.execute(
        'SELECT senha FROM terapeutas WHERE id = ? LIMIT 1',
        [req.terapeuta.id]
    );
    if (!rows.length || !(await conferirSenha(senha_atual, rows[0].senha))) {
        return res.status(401).json({ erro: 'A senha atual está incorreta.' });
    }

    await pool.execute(
        'UPDATE terapeutas SET senha = ? WHERE id = ?',
        [await hashSenha(senha_nova), req.terapeuta.id]
    );
    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso. Entre novamente com a nova senha.' });
}));

async function pacienteDoTerapeuta(pacienteId, terapeutaId) {
    const [rows] = await pool.execute(
        'SELECT id FROM pacientes WHERE id = ? AND terapeuta_id = ? LIMIT 1',
        [pacienteId, terapeutaId]
    );
    return rows.length > 0;
}

// PACIENTES
app.get('/pacientes', executar(async (req, res) => {
    const [rows] = await pool.execute(
        'SELECT * FROM pacientes WHERE terapeuta_id = ? ORDER BY nome',
        [req.terapeuta.id]
    );
    res.json(rows);
}));

app.post('/pacientes', executar(async (req, res) => {
    const {
        nome,
        data_nascimento,
        diagnostico,
        responsavel,
        telefone
    } = req.body;

    if (!nome) {
        return res.status(400).json({
            erro: 'O nome do paciente é obrigatório.'
        });
    }

    const [resultado] = await pool.execute(
        `INSERT INTO pacientes
         (terapeuta_id, nome, data_nascimento, diagnostico, responsavel, telefone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            req.terapeuta.id,
            nome,
            data_nascimento || null,
            diagnostico || null,
            responsavel || null,
            telefone || null
        ]
    );

    res.status(201).json({ id: resultado.insertId });
}));

app.put('/pacientes/:id', executar(async (req, res) => {
    if (!(await pacienteDoTerapeuta(req.params.id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }
    const { nome, data_nascimento, diagnostico, responsavel, telefone } = req.body;
    if (!nome || !String(nome).trim()) {
        return res.status(400).json({ erro: 'O nome do paciente é obrigatório.' });
    }
    const [resultado] = await pool.execute(
        `UPDATE pacientes
         SET nome = ?, data_nascimento = ?, diagnostico = ?, responsavel = ?, telefone = ?
         WHERE id = ? AND terapeuta_id = ?`,
        [String(nome).trim(), data_nascimento || null, diagnostico || null,
            responsavel || null, telefone || null, req.params.id, req.terapeuta.id]
    );
    res.json({ atualizado: resultado.affectedRows > 0 });
}));

app.delete('/pacientes/:id', executar(async (req, res) => {
    if (!(await pacienteDoTerapeuta(req.params.id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    const [vinculos] = await pool.execute(
        `SELECT SUM(total) AS total FROM (
            SELECT COUNT(*) AS total FROM agenda WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM anamnese WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM copm_metas WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM perfil_ocupacional WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM pedi_autocuidado WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM avaliacao_sensorial WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM programacao_terapeutica WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM plano_intervencao WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM evolucao_terapeutica WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM roda_vida WHERE paciente_id = ?
            UNION ALL SELECT COUNT(*) FROM ficha_observacao WHERE paciente_id = ?
        ) AS registros`,
        Array(11).fill(req.params.id)
    );
    if (Number(vinculos[0].total || 0) > 0) {
        return res.status(409).json({ erro: 'Este paciente possui registros clínicos. A exclusão está bloqueada para preservar o prontuário.' });
    }

    const [resultado] = await pool.execute(
        'DELETE FROM pacientes WHERE id = ? AND terapeuta_id = ?',
        [req.params.id, req.terapeuta.id]
    );

    res.json({ removido: resultado.affectedRows });
}));

// AGENDA
app.get('/agenda', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT a.*, p.nome AS paciente_nome
         FROM agenda a
         INNER JOIN pacientes p ON p.id = a.paciente_id
         WHERE p.terapeuta_id = ?
         ORDER BY a.data_hora DESC`,
        [req.terapeuta.id]
    );

    res.json(rows);
}));

app.post('/agenda', executar(async (req, res) => {
    const { paciente_id, data_hora, status, observacoes } = req.body;

    if (!paciente_id || !data_hora) {
        return res.status(400).json({
            erro: 'Paciente e data/hora são obrigatórios.'
        });
    }

    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    const [resultado] = await pool.execute(
        `INSERT INTO agenda
         (paciente_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?)`,
        [
            paciente_id,
            dataMySQL(data_hora),
            status || 'Agendado',
            observacoes || null
        ]
    );

    res.status(201).json({ id: resultado.insertId });
}));

app.put('/agenda/:id/status', executar(async (req, res) => {
    const [resultado] = await pool.execute(
        `UPDATE agenda a
         INNER JOIN pacientes p ON p.id = a.paciente_id
         SET a.status = ?
         WHERE a.id = ? AND p.terapeuta_id = ?`,
        [req.body.status, req.params.id, req.terapeuta.id]
    );

    res.json({ atualizado: resultado.affectedRows });
}));

app.delete('/agenda/:id', executar(async (req, res) => {
    const [resultado] = await pool.execute(
        `DELETE a FROM agenda a
         INNER JOIN pacientes p ON p.id = a.paciente_id
         WHERE a.id = ? AND p.terapeuta_id = ?`,
        [req.params.id, req.terapeuta.id]
    );

    res.json({ removido: resultado.affectedRows });
}));

// RESUMO DO PAINEL
app.get('/dashboard-resumo', executar(async (req, res) => {
    const [[pacientes]] = await pool.execute(
        'SELECT COUNT(*) AS total FROM pacientes WHERE terapeuta_id = ?',
        [req.terapeuta.id]
    );

    const [consultas] = await pool.execute(
        `SELECT a.*, p.nome AS paciente_nome
         FROM agenda a
         INNER JOIN pacientes p ON p.id = a.paciente_id
         WHERE DATE(a.data_hora) = CURDATE() AND p.terapeuta_id = ?
         ORDER BY a.data_hora`,
        [req.terapeuta.id]
    );

    res.json({
        total_pacientes: pacientes.total,
        consultas_hoje: consultas
    });
}));

// ANAMNESE
app.get('/anamnese', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT a.*, p.nome AS paciente_nome FROM anamnese a
         INNER JOIN pacientes p ON p.id = a.paciente_id
         WHERE p.terapeuta_id = ? ORDER BY a.id DESC`,
        [req.terapeuta.id]
    );
    res.json(rows);
}));

app.post('/anamnese', executar(async (req, res) => {
    const {
        paciente_id,
        data_avaliacao,
        historico_medico_desenvolvimento,
        historico_educacional,
        historico_terapeutico
    } = req.body;

    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    const [resultado] = await pool.execute(
        `INSERT INTO anamnese
         (paciente_id, data_avaliacao,
          historico_medico_desenvolvimento,
          historico_educacional, historico_terapeutico)
         VALUES (?, ?, ?, ?, ?)`,
        [
            paciente_id,
            data_avaliacao || null,
            historico_medico_desenvolvimento || null,
            historico_educacional || null,
            historico_terapeutico || null
        ]
    );

    res.status(201).json({ id: resultado.insertId });
}));

// PERFIL OCUPACIONAL
app.get('/perfil_ocupacional', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT o.*, p.nome AS paciente_nome FROM perfil_ocupacional o
         INNER JOIN pacientes p ON p.id = o.paciente_id
         WHERE p.terapeuta_id = ? ORDER BY o.id DESC`,
        [req.terapeuta.id]
    );
    res.json(rows);
}));

app.post('/perfil_ocupacional', executar(async (req, res) => {
    const campos = [
        'paciente_id',
        'data_avaliacao',
        'ambiental',
        'pessoal',
        'ocupacoes',
        'padroes_desempenho',
        'habilidade_interacao',
        'fatores_cliente',
        'desafios_participacao',
        'observacoes_finais',
        'coisas_irritam',
        'coisas_gosto',
        'como_comunico'
    ];

    if (!(await pacienteDoTerapeuta(req.body.paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    const valores = campos.map(campo => req.body[campo] ?? null);

    const [resultado] = await pool.execute(
        `INSERT INTO perfil_ocupacional
         (${campos.join(', ')})
         VALUES (${campos.map(() => '?').join(', ')})`,
        valores
    );

    res.status(201).json({ id: resultado.insertId });
}));

// AUTOCUIDADO PEDIÁTRICO
app.get('/pedi_autocuidado', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT x.*, p.nome AS paciente_nome FROM pedi_autocuidado x
         INNER JOIN pacientes p ON p.id = x.paciente_id
         WHERE p.terapeuta_id = ? ORDER BY x.id DESC`,
        [req.terapeuta.id]
    );
    res.json(rows);
}));

app.post('/pedi_autocuidado', executar(async (req, res) => {
    const {
        paciente_id,
        data_avaliacao,
        respostas,
        escore_total
    } = req.body;

    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    const itens = respostas?.itens;
    if (!Array.isArray(itens) || itens.length !== 73 || itens.some(item => ![0, 1].includes(Number(item.resposta)))) {
        return res.status(400).json({ erro: 'A avaliação PEDI precisa conter os 73 itens preenchidos como 0 ou 1.' });
    }
    const escoreCalculado = itens.reduce((total, item) => total + Number(item.resposta), 0);

    const [resultado] = await pool.execute(
        `INSERT INTO pedi_autocuidado
         (paciente_id, data_avaliacao, respostas, escore_total)
         VALUES (?, ?, ?, ?)`,
        [
            paciente_id,
            data_avaliacao || null,
            jsonSeguro(respostas),
            escoreCalculado
        ]
    );

    res.status(201).json({ id: resultado.insertId });
}));

// AVALIAÇÃO SENSORIAL
const camposSensoriais = [
    'contato_visual',
    'comunicacao_alternativa',
    'expressiva_linguagem',
    'receptiva_linguagem',
    'atencao_conjunta',
    'comportamento_exploratorio',
    'combinacoes',
    'uso_lapis',
    'higiene_pessoal',
    'vestuario',
    'uso_banheiro',
    'alimentacao',
    'motor_global',
    'motor_fino',
    'interacao_objetos',
    'interacao_bola',
    'resposta_emocional',
    'imitacoes',
    'tolerancia',
    'brincar'
];

app.get('/avaliacao_sensorial', executar(async (req, res) => {
    const [rows] = await pool.execute(
        `SELECT x.*, p.nome AS paciente_nome FROM avaliacao_sensorial x
         INNER JOIN pacientes p ON p.id = x.paciente_id
         WHERE p.terapeuta_id = ? ORDER BY x.id DESC`,
        [req.terapeuta.id]
    );
    res.json(rows);
}));

app.post('/avaliacao_sensorial', executar(async (req, res) => {
    const campos = [
        'paciente_id',
        'data_avaliacao',
        ...camposSensoriais
    ];

    if (!(await pacienteDoTerapeuta(req.body.paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }

    for (const campo of camposSensoriais) {
        const nota = Number(req.body[campo]);
        if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
            return res.status(400).json({ erro: 'As 20 habilidades devem receber notas inteiras de 1 a 10.' });
        }
    }

    const valores = campos.map(campo => camposSensoriais.includes(campo) ? Number(req.body[campo]) : req.body[campo] ?? null);

    const [resultado] = await pool.execute(
        `INSERT INTO avaliacao_sensorial
         (${campos.join(', ')})
         VALUES (${campos.map(() => '?').join(', ')})`,
        valores
    );

    res.status(201).json({ id: resultado.insertId });
}));

// MÓDULOS CLÍNICOS ADICIONAIS
// Os nomes de tabela e coluna abaixo são fixos e correspondem ao esquema já
// existente no banco. Nenhuma tabela é criada ou modificada por estas rotas.
function registrarColecaoPaciente({ rota, tabela, campos, camposJson = [], campoData, validarDados = null }) {
    app.get(rota, executar(async (req, res) => {
        const filtros = ['p.terapeuta_id = ?'];
        const valores = [req.terapeuta.id];

        if (req.query.paciente_id) {
            filtros.push('r.paciente_id = ?');
            valores.push(req.query.paciente_id);
        }

        const [rows] = await pool.execute(
            `SELECT r.*, p.nome AS paciente_nome
             FROM ${tabela} r
             INNER JOIN pacientes p ON p.id = r.paciente_id
             WHERE ${filtros.join(' AND ')}
             ORDER BY r.id DESC`,
            valores
        );
        res.json(rows);
    }));

    app.post(rota, executar(async (req, res) => {
        if (!req.body.paciente_id) {
            return res.status(400).json({ erro: 'O paciente é obrigatório.' });
        }

        if (!(await pacienteDoTerapeuta(req.body.paciente_id, req.terapeuta.id))) {
            return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
        }

        if (campoData && !req.body[campoData]) {
            return res.status(400).json({ erro: 'A data do registro é obrigatória.' });
        }

        const erroValidacao = validarDados?.(req.body);
        if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

        const valores = campos.map(campo => {
            const valor = req.body[campo];
            if (campo === campoData) return dataMySQL(valor);
            if (camposJson.includes(campo)) return jsonSeguro(valor);
            return valor ?? null;
        });

        const [resultado] = await pool.execute(
            `INSERT INTO ${tabela} (${campos.join(', ')})
             VALUES (${campos.map(() => '?').join(', ')})`,
            valores
        );
        res.status(201).json({ id: resultado.insertId });
    }));

    app.delete(`${rota}/:id`, executar(async (req, res) => {
        const [resultado] = await pool.execute(
            `DELETE r FROM ${tabela} r
             INNER JOIN pacientes p ON p.id = r.paciente_id
             WHERE r.id = ? AND p.terapeuta_id = ?`,
            [req.params.id, req.terapeuta.id]
        );
        res.json({ removido: resultado.affectedRows });
    }));
}

// Cada registro representa uma etapa independente; as notas iniciais ficam como fotografia clínica daquela data.
app.get('/copm/reavaliacoes', executar(async (req, res) => {
    const filtros = ['p.terapeuta_id = ?'];
    const valores = [req.terapeuta.id];
    if (req.query.paciente_id) {
        filtros.push('s.paciente_id = ?'); valores.push(req.query.paciente_id);
    }
    const [rows] = await pool.execute(
        `SELECT s.id AS sessao_id, s.paciente_id, p.nome AS paciente_nome,
                s.data_avaliacao_base, s.data_reavaliacao, s.observacoes AS observacoes_sessao,
                s.legado, s.criado_em, i.id AS item_id, i.copm_meta_id,
                i.atividade_problema, i.nivel_importancia, i.desempenho_inicial,
                i.satisfacao_inicial, i.reavaliacao_desempenho, i.reavaliacao_satisfacao,
                i.observacao_item
         FROM copm_reavaliacao_sessoes s
         INNER JOIN pacientes p ON p.id = s.paciente_id
         INNER JOIN copm_reavaliacao_itens i ON i.sessao_id = s.id
         WHERE ${filtros.join(' AND ')}
         ORDER BY s.data_reavaliacao DESC, s.id DESC, i.id ASC`,
        valores
    );
    res.json(rows);
}));

app.post('/copm/reavaliacoes', executar(async (req, res) => {
    const { paciente_id, data_avaliacao_base, data_reavaliacao, itens } = req.body || {};
    const dataValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
    if (!paciente_id || !dataValida(data_avaliacao_base) || !dataValida(data_reavaliacao) || !Array.isArray(itens)) {
        return res.status(400).json({ erro: 'Paciente, datas e itens da reavaliação são obrigatórios.' });
    }
    if (String(data_reavaliacao) < String(data_avaliacao_base)) {
        return res.status(400).json({ erro: 'A data da reavaliação deve ser igual ou posterior à avaliação inicial.' });
    }
    if (!itens.length || itens.length > 5) return res.status(400).json({ erro: 'Reavalie de 1 a 5 problemas ocupacionais.' });
    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }
    const ids = itens.map(item => Number(item.copm_meta_id));
    if (ids.some(id => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
        return res.status(400).json({ erro: 'Os problemas da reavaliação são inválidos ou estão duplicados.' });
    }
    for (const item of itens) {
        for (const campo of ['desempenho', 'satisfacao']) {
            const nota = Number(item[campo]);
            if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
                return res.status(400).json({ erro: 'Desempenho e satisfação precisam ser notas inteiras de 1 a 10.' });
            }
        }
    }
    const marcadores = ids.map(() => '?').join(', ');
    const [metas] = await pool.execute(
        `SELECT c.id, c.atividade_problema, c.nivel_importancia, c.desempenho_inicial, c.satisfacao_inicial
         FROM copm_metas c INNER JOIN pacientes p ON p.id = c.paciente_id
         WHERE c.paciente_id = ? AND p.terapeuta_id = ? AND c.data_avaliacao = ?
           AND c.id IN (${marcadores})`,
        [paciente_id, req.terapeuta.id, data_avaliacao_base, ...ids]
    );
    if (metas.length !== ids.length) {
        return res.status(400).json({ erro: 'Um ou mais problemas não pertencem à avaliação inicial selecionada.' });
    }
    const metasPorId = new Map(metas.map(meta => [String(meta.id), meta]));
    const conexao = await pool.getConnection();
    try {
        await conexao.beginTransaction();
        const [sessao] = await conexao.execute(
            `INSERT INTO copm_reavaliacao_sessoes (paciente_id, data_avaliacao_base, data_reavaliacao)
             VALUES (?, ?, ?)`,
            [paciente_id, data_avaliacao_base, data_reavaliacao]
        );
        for (const item of itens) {
            const meta = metasPorId.get(String(Number(item.copm_meta_id)));
            await conexao.execute(
                `INSERT INTO copm_reavaliacao_itens
                 (sessao_id, copm_meta_id, atividade_problema, nivel_importancia,
                  desempenho_inicial, satisfacao_inicial, reavaliacao_desempenho,
                  reavaliacao_satisfacao, observacao_item)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [sessao.insertId, meta.id, meta.atividade_problema, meta.nivel_importancia,
                    meta.desempenho_inicial, meta.satisfacao_inicial, Number(item.desempenho),
                    Number(item.satisfacao), String(item.observacao || '').trim() || null]
            );
        }
        await conexao.commit();
        res.status(201).json({ id: sessao.insertId, quantidade: metas.length });
    } catch (erro) {
        await conexao.rollback(); throw erro;
    } finally { conexao.release(); }
}));

registrarColecaoPaciente({
    rota: '/copm',
    tabela: 'copm_metas',
    campos: [
        'paciente_id', 'data_avaliacao', 'atividade_problema',
        'nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial',
        'desempenho_reavaliacao', 'satisfacao_reavaliacao'
    ],
    campoData: 'data_avaliacao'
});

app.post('/copm/lote', executar(async (req, res) => {
    const { paciente_id, data_avaliacao, itens } = req.body;
    if (!paciente_id || !data_avaliacao || !Array.isArray(itens)) {
        return res.status(400).json({ erro: 'Paciente, data e linhas COPM são obrigatórios.' });
    }
    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }
    const linhas = itens.filter(item => String(item.atividade_problema || '').trim());
    if (!linhas.length || linhas.length > 5) {
        return res.status(400).json({ erro: 'Informe de 1 a 5 problemas ocupacionais.' });
    }
    for (const item of linhas) {
        for (const campo of ['nivel_importancia', 'desempenho_inicial', 'satisfacao_inicial']) {
            const nota = Number(item[campo]);
            if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
                return res.status(400).json({ erro: 'Importância, desempenho inicial e satisfação inicial devem ser notas de 1 a 10.' });
            }
        }
        for (const campo of ['desempenho_reavaliacao', 'satisfacao_reavaliacao']) {
            if (item[campo] !== null && item[campo] !== '' && item[campo] !== undefined) {
                const nota = Number(item[campo]);
                if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
                    return res.status(400).json({ erro: 'As notas de reavaliação devem estar entre 1 e 10.' });
                }
            }
        }
    }

    const conexao = await pool.getConnection();
    const ids = [];
    try {
        await conexao.beginTransaction();
        for (const item of linhas) {
            const valores = [
                String(item.atividade_problema).trim(), Number(item.nivel_importancia),
                Number(item.desempenho_inicial), Number(item.satisfacao_inicial),
                item.desempenho_reavaliacao ? Number(item.desempenho_reavaliacao) : null,
                item.satisfacao_reavaliacao ? Number(item.satisfacao_reavaliacao) : null
            ];
            if (item.id) {
                const [pertence] = await conexao.execute(
                    `SELECT c.id FROM copm_metas c INNER JOIN pacientes p ON p.id = c.paciente_id
                     WHERE c.id = ? AND c.paciente_id = ? AND p.terapeuta_id = ? LIMIT 1`,
                    [item.id, paciente_id, req.terapeuta.id]
                );
                if (!pertence.length) throw Object.assign(new Error('Uma linha COPM não pertence a este paciente.'), { statusCode: 404 });
                await conexao.execute(
                    `UPDATE copm_metas SET atividade_problema = ?, nivel_importancia = ?,
                     desempenho_inicial = ?, satisfacao_inicial = ?, desempenho_reavaliacao = ?,
                     satisfacao_reavaliacao = ?, data_avaliacao = ? WHERE id = ?`,
                    [...valores, dataMySQL(data_avaliacao), item.id]
                );
                ids.push(item.id);
            } else {
                const [resultado] = await conexao.execute(
                    `INSERT INTO copm_metas
                     (paciente_id, data_avaliacao, atividade_problema, nivel_importancia,
                      desempenho_inicial, satisfacao_inicial, desempenho_reavaliacao, satisfacao_reavaliacao)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [paciente_id, dataMySQL(data_avaliacao), ...valores]
                );
                ids.push(resultado.insertId);
            }
        }
        await conexao.commit();
        res.status(201).json({ ids });
    } catch (erro) {
        await conexao.rollback();
        if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
        throw erro;
    } finally {
        conexao.release();
    }
}));

app.put('/copm/:id', executar(async (req, res) => {
    const campos = [
        'data_avaliacao', 'atividade_problema', 'nivel_importancia',
        'desempenho_inicial', 'satisfacao_inicial',
        'desempenho_reavaliacao', 'satisfacao_reavaliacao'
    ];
    const [existentes] = await pool.execute(
        `SELECT c.id FROM copm_metas c
         INNER JOIN pacientes p ON p.id = c.paciente_id
         WHERE c.id = ? AND p.terapeuta_id = ? LIMIT 1`,
        [req.params.id, req.terapeuta.id]
    );
    if (!existentes.length) return res.status(404).json({ erro: 'Registro COPM não encontrado nesta conta.' });

    const [resultado] = await pool.execute(
        `UPDATE copm_metas c
         INNER JOIN pacientes p ON p.id = c.paciente_id
         SET ${campos.map(campo => `c.${campo} = ?`).join(', ')}
         WHERE c.id = ? AND p.terapeuta_id = ?`,
        [...campos.map(campo => campo === 'data_avaliacao'
            ? dataMySQL(req.body[campo])
            : req.body[campo] ?? null), req.params.id, req.terapeuta.id]
    );
    res.json({ atualizado: true });
}));

registrarColecaoPaciente({
    rota: '/programacao',
    tabela: 'programacao_terapeutica',
    campos: [
        'paciente_id', 'terapeuta_responsavel', 'supervisora', 'programa',
        'objetivos', 'data_registro', 'tentativas', 'alcancado'
    ],
    campoData: 'data_registro'
});

app.post('/programacao/lote', executar(async (req, res) => {
    const { paciente_id, terapeuta_responsavel, supervisora, itens } = req.body;
    if (!paciente_id || !Array.isArray(itens)) {
        return res.status(400).json({ erro: 'Paciente e linhas da programação são obrigatórios.' });
    }
    if (!(await pacienteDoTerapeuta(paciente_id, req.terapeuta.id))) {
        return res.status(404).json({ erro: 'Paciente não encontrado nesta conta.' });
    }
    const linhas = itens.filter(item => String(item.programa || '').trim() || String(item.objetivos || '').trim());
    if (!linhas.length) return res.status(400).json({ erro: 'Adicione ao menos um programa ou objetivo.' });

    const conexao = await pool.getConnection();
    const ids = [];
    try {
        await conexao.beginTransaction();
        for (const item of linhas) {
            const [resultado] = await conexao.execute(
                `INSERT INTO programacao_terapeutica
                 (paciente_id, terapeuta_responsavel, supervisora, programa, objetivos, data_registro, tentativas, alcancado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [paciente_id, terapeuta_responsavel || null, supervisora || null,
                    item.programa || null, item.objetivos || null, dataMySQL(item.data_registro) || null,
                    item.tentativas || null, item.alcancado || null]
            );
            ids.push(resultado.insertId);
        }
        await conexao.commit();
        res.status(201).json({ ids });
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        conexao.release();
    }
}));

registrarColecaoPaciente({
    rota: '/plano_intervencao',
    tabela: 'plano_intervencao',
    campos: ['paciente_id', 'data_registro', 'profissional_responsavel', 'itens'],
    camposJson: ['itens'],
    campoData: 'data_registro'
});

registrarColecaoPaciente({
    rota: '/evolucao_terapeutica',
    tabela: 'evolucao_terapeutica',
    campos: [
        'paciente_id', 'data_registro', 'profissional', 'especialidade',
        'duracao', 'horario', 'programa_terapeutico', 'objetivo', 'evolucao',
        'desempenho', 'reforcadores', 'intercorrencias', 'conduta', 'devolutiva'
    ],
    campoData: 'data_registro'
});

registrarColecaoPaciente({
    rota: '/roda_vida',
    tabela: 'roda_vida',
    campos: [
        'paciente_id', 'data_avaliacao', 'vida_social', 'contribuicao',
        'familia', 'recursos_financeiros', 'profissional', 'amoroso',
        'criatividade_hobbies', 'plenitude_realizacao', 'equilibrio_emocional',
        'espiritualidade', 'saude_disposicao', 'desenvolvimento_pessoal',
        'observacoes'
    ],
    campoData: 'data_avaliacao',
    validarDados(dados) {
        const camposPontuados = [
            'vida_social', 'contribuicao', 'familia', 'recursos_financeiros', 'profissional', 'amoroso',
            'criatividade_hobbies', 'plenitude_realizacao', 'equilibrio_emocional', 'espiritualidade',
            'saude_disposicao', 'desenvolvimento_pessoal'
        ];
        return camposPontuados.every(campo => Number.isInteger(Number(dados[campo])) && Number(dados[campo]) >= 1 && Number(dados[campo]) <= 10)
            ? null
            : 'As 12 áreas da Roda da Vida devem receber notas inteiras de 1 a 10.';
    }
});

registrarColecaoPaciente({
    rota: '/ficha_observacao',
    tabela: 'ficha_observacao',
    campos: [
        'paciente_id', 'data_atendimento', 'atendimento_num', 'idade', 'duracao',
        'terapeuta', 'checkboxes', 'obs_1', 'obs_2', 'obs_3', 'obs_4', 'obs_5', 'obs_6', 'obs_7',
        'orientacoes_cuidador', 'sintese_desempenho',
        'sintese_faixa_etaria', 'sintese_acompanhar', 'sintese_conduta', 'sintese_encaminhamento'
    ],
    camposJson: ['checkboxes'],
    campoData: 'data_atendimento'
});

// TRATAMENTO DE ERROS
app.use((err, req, res, next) => {
    console.error('Erro inesperado:', err.message);

    if (!res.headersSent) {
        res.status(500).json({
            erro: 'Erro interno no servidor.'
        });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
async function iniciarServidor() {
    let conexao;

    if (!AUTH_SECRET || AUTH_SECRET.length < 64) {
        console.error('Configure AUTH_SECRET com pelo menos 64 caracteres no arquivo .env.');
        process.exitCode = 1;
        return;
    }

    if (SIGNUP_INVITE_CODE && SIGNUP_INVITE_CODE.length < 32) {
        console.error('SIGNUP_INVITE_CODE precisa ter pelo menos 32 caracteres.');
        process.exitCode = 1;
        return;
    }

    if (process.env.NODE_ENV === 'production' && process.env.DEV_LOGIN_ENABLED === 'true') {
        console.error('DEV_LOGIN_ENABLED não pode ficar ativo em produção.');
        process.exitCode = 1;
        return;
    }

    if (LOGIN_DESENVOLVIMENTO_ATIVO) {
        console.warn('Login local admin/admin habilitado somente para desenvolvimento.');
    }

    if (process.env.NODE_ENV === 'production' && ORIGENS_PERMITIDAS.size === 0) {
        console.error('Configure CORS_ORIGINS com o domínio do portal antes de iniciar em produção.');
        process.exitCode = 1;
        return;
    }

    try {
        conexao = await pool.getConnection();
        await conexao.query('SELECT 1');
        console.log('Conexão com MySQL confirmada!');
    } catch (erro) {
        console.error('Não foi possível conectar ao MySQL:', erro.message);
        process.exitCode = 1;
        return;
    } finally {
        if (conexao) conexao.release();
    }

    const host = LOGIN_DESENVOLVIMENTO_ATIVO ? '127.0.0.1' : '0.0.0.0';
    app.listen(PORT, host, () => {
        console.log(`Servidor rodando em http://${host}:${PORT}`);
    });
}

iniciarServidor();
