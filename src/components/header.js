/**
 * Header Component with Clickable Avatar Profile Modal Trigger
 */

import { pwa } from '../services/pwa.js';
import { curMonthKey, monthLabel, finance } from '../services/finance.js';
import { gamification } from '../services/gamification.js';
import { walletService } from '../services/wallet.js';
import { showToast } from './toast.js';
import { openProfileModal } from './profileModal.js';

export function renderHeader(container, { user, profile, onLogout, onThemeToggle, isDark, onProfileUpdated }) {
  const initial = (profile?.nome || user?.name || user?.email || 'U')[0].toUpperCase();
  const userName = profile?.nome || user?.name || user?.email;
  const avatarUrl = profile?.avatarUrl || user?.avatar || '';
  const currentMonthStr = monthLabel(curMonthKey());

  container.innerHTML = `
    <header class="top-header">
      <div class="header-user clickable-profile" id="btn-open-profile-header" title="Clique para ver e editar seu perfil e redes sociais">
        <div class="avatar">
          ${
            avatarUrl
              ? `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
              : initial
          }
        </div>
        <div class="header-user-info">
          <h2>${userName} <span class="profile-edit-indicator">✏️</span></h2>
          <span>Painel de ${currentMonthStr}</span>
        </div>
      </div>
      <div class="header-actions">
        <button id="btn-header-sync" class="theme-toggle-btn" title="Sincronizar com a nuvem agora" style="font-size: 14px;">
          🔄
        </button>
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

  // Bind avatar click to open profile modal
  const btnOpenProfile = container.querySelector('#btn-open-profile-header');
  if (btnOpenProfile) {
    btnOpenProfile.addEventListener('click', () => {
      openProfileModal(user, profile, (updatedProfile) => {
        if (onProfileUpdated) onProfileUpdated(updatedProfile);
      });
    });
  }

  // Bind Quick Cloud Sync button
  const btnHeaderSync = container.querySelector('#btn-header-sync');
  if (btnHeaderSync) {
    btnHeaderSync.addEventListener('click', async () => {
      btnHeaderSync.style.transition = 'transform 0.8s ease';
      btnHeaderSync.style.transform = 'rotate(360deg)';
      btnHeaderSync.disabled = true;
      try {
        await Promise.all([
          finance.syncWithCloud(user),
          gamification.syncProfileFromCloud(user),
          walletService.syncWithCloud(user)
        ]);
        const txs = finance.getTransactions(user.email);
        const wls = walletService.getWallets(user.email);
        showToast(`Sincronizado com Supabase! (${txs.length} lançamentos)`, 'success');
        const updatedProfile = gamification.getProfile(user.email);
        if (onProfileUpdated && updatedProfile) {
          onProfileUpdated(updatedProfile);
        }
      } catch (err) {
        showToast('Erro ao sincronizar: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          btnHeaderSync.style.transform = 'none';
          btnHeaderSync.disabled = false;
        }, 800);
      }
    });
  }

  // Bind actions
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', onLogout);

  const btnTheme = container.querySelector('#btn-theme-toggle');
  if (btnTheme) btnTheme.addEventListener('click', onThemeToggle);

  const btnPwa = container.querySelector('#btn-pwa-install');
  if (btnPwa) {
    pwa.onInstallAvailabilityChange((available) => {
      if (available && !pwa.isStandalone() && !pwa.isDismissedOrInstalled()) {
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
