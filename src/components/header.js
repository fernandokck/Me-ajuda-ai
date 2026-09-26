/**
 * Header Component
 */

import { pwa } from '../services/pwa.js';
import { curMonthKey, monthLabel } from '../services/finance.js';

export function renderHeader(container, { user, profile, onLogout, onThemeToggle, isDark }) {
  const initial = (profile?.nome || user?.name || user?.email || 'U')[0].toUpperCase();
  const userName = profile?.nome || user?.name || user?.email;
  const currentMonthStr = monthLabel(curMonthKey());

  container.innerHTML = `
    <header class="top-header">
      <div class="header-user">
        <div class="avatar">${initial}</div>
        <div class="header-user-info">
          <h2>${userName}</h2>
          <span>Painel de ${currentMonthStr}</span>
        </div>
      </div>
      <div class="header-actions">
        <button id="btn-pwa-install" class="btn btn-secondary btn-sm hidden">
          <span>📲</span> Instalar App
        </button>
        <button id="btn-theme-toggle" class="theme-toggle-btn" title="Alternar tema">
          ${isDark ? '☀️' : '🌙'}
        </button>
        <button id="btn-logout" class="btn btn-ghost btn-sm" title="Sair da conta">
          Sair
        </button>
      </div>
    </header>
  `;

  // Bind actions
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', onLogout);

  const btnTheme = container.querySelector('#btn-theme-toggle');
  if (btnTheme) btnTheme.addEventListener('click', onThemeToggle);

  const btnPwa = container.querySelector('#btn-pwa-install');
  if (btnPwa) {
    pwa.onInstallAvailabilityChange((available) => {
      if (available && !pwa.isStandalone()) {
        btnPwa.classList.remove('hidden');
      } else {
        btnPwa.classList.add('hidden');
      }
    });

    btnPwa.addEventListener('click', async () => {
      await pwa.promptInstall();
    });
  }
}
