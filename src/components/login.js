/**
 * Login Screen Component
 */

import { auth } from '../services/auth.js';
import { showToast } from './toast.js';

export function renderLogin(container, onLoginSuccess) {
  container.innerHTML = `
    <div id="login-screen">
      <div class="blob blob1"></div>
      <div class="blob blob2"></div>
      <div class="blob blob3"></div>
      
      <div class="login-card">
        <div class="logo-badge">🤝</div>
        <h1>Me ajuda aí</h1>
        <p class="subtext">Organize suas finanças, controle gastos recorrentes e conquiste sua liberdade financeira.</p>
        
        <button id="btn-google-login" class="btn btn-google btn-block">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Continuar com Google
        </button>
        
        <div class="divider">ou entre com e-mail</div>
        
        <form id="email-login-form">
          <div class="field">
            <label for="login-email">Seu E-mail</label>
            <input id="login-email" type="email" placeholder="exemplo@email.com" required autocomplete="email">
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            Entrar no App
          </button>
        </form>
        
        <p class="login-note">
          🔒 Seus dados ficam salvos de forma segura e local no seu aparelho. O app funciona offline como um aplicativo nativo!
        </p>
      </div>
    </div>
  `;

  // Bind Google login
  const btnGoogle = container.querySelector('#btn-google-login');
  btnGoogle.addEventListener('click', async () => {
    try {
      const user = await auth.loginWithGoogle();
      showToast(`Bem-vindo, ${user.name}!`, 'success');
      onLoginSuccess(user);
    } catch (e) {
      showToast(e.message || 'Erro ao entrar com Google', 'error');
    }
  });

  // Bind Email login
  const form = container.querySelector('#email-login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = container.querySelector('#login-email');
    try {
      const user = await auth.loginWithEmail(emailInput.value);
      showToast('Login realizado com sucesso!', 'success');
      onLoginSuccess(user);
    } catch (err) {
      showToast(err.message || 'Erro ao realizar login', 'error');
    }
  });
}
