window.addEventListener('DOMContentLoaded', () => {
    const credentials = window.DEMO_CREDENTIALS;
    const user = document.getElementById('login_usuario');
    const password = document.getElementById('login_senha');
    if (user && password && credentials) {
        user.value = credentials.user;
        password.value = credentials.password;
    }
    const badge = document.createElement('div');
    badge.className = 'demo-public-badge';
    badge.textContent = 'PORTFÓLIO · DADOS 100% FICTÍCIOS · ALTERAÇÕES NÃO SÃO SALVAS';
    document.body.appendChild(badge);
});
