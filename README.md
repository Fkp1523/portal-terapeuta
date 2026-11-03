# Portal da Terapeuta

Sistema de gestão clínica criado para apoiar o trabalho de terapeutas ocupacionais. O projeto reúne cadastro e acompanhamento de pacientes, agenda, avaliações, prontuário longitudinal e relatórios em uma interface responsiva para computador, tablet e celular.

> Repositório de portfólio. Não contém prontuários, dados de pacientes, credenciais, backups, chaves de assinatura nem o banco utilizado em atendimentos.

## Demonstração do front-end

[Abrir o Portal da Terapeuta](https://portal-terapeuta-fernando.recentbadge4.chatgpt.site)

- Usuário: `demo`
- Senha: `Portfolio@2026`
- Os dados exibidos são fictícios e as alterações são descartadas ao recarregar a página.

## Principais recursos

- Cadastro e acompanhamento de pacientes
- Agenda clínica e painel de atendimentos
- Anamnese e perfil ocupacional
- COPM com avaliação inicial e histórico de reavaliações
- PEDI, avaliação sensorial e Roda da Vida
- Ficha de observação e plano de intervenção
- Evolução terapêutica e prontuário completo
- Relatórios para impressão e envio aos convênios
- Tema claro e escuro e layout responsivo
- Versão Android offline com banco local criptografado e backup protegido

## Tecnologias

- Front-end: HTML, CSS e JavaScript
- API: Node.js e Express
- Banco web: MySQL
- Aplicativo Android: Capacitor e SQLite/SQLCipher
- Implantação web: Docker Compose e Caddy

## Estrutura

```text
├── index.html, style.css, app.js   # portal web
├── server.js                       # API Node.js
├── schema.sql e migrations/        # estrutura do banco
├── compose.yaml e Dockerfile       # implantação
└── android-offline/                 # versão instalada no tablet
```

## Executar a versão web localmente

1. Instale Node.js e MySQL.
2. Copie `.env.example` para `.env` e preencha apenas com credenciais locais.
3. Importe `schema.sql` em um banco vazio.
4. Execute `npm install` e depois `npm start`.
5. Acesse `http://localhost:3000`.

Nunca use dados reais de pacientes em uma instalação de demonstração.

## Privacidade e segurança

Dados clínicos são sensíveis. A publicação deste código não inclui dados operacionais. Antes de qualquer uso profissional, a instalação deve ter controle de acesso, backup testado, HTTPS, política de privacidade e revisão jurídica e de segurança adequada à operação.

## Autoria e uso

Projeto desenvolvido por Fernando da Silva como produto e portfólio de desenvolvimento. Todos os direitos reservados. Consulte [LICENSE](LICENSE) antes de reutilizar qualquer parte do código.
