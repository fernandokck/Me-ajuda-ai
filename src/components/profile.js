/**
 * Profile & Settings Component
 */

import { gamification } from '../services/gamification.js';
import { storage } from '../services/storage.js';
import { fmtBRL } from '../services/finance.js';
import { showToast } from './toast.js';
import { openProfileModal } from './profileModal.js';
import { showBadgeModal3D } from './badgeModal.js';

export function renderProfile(container, user, onResetOnboarding, onProfileUpdated) {
  const profile = gamification.getProfile(user.email);
  if (!profile) return;

  const badge = profile.badge;
  const socials = profile.socials || {};

  container.innerHTML = `
    <div id="tab-perfil" class="view-content-wrapper">
      <!-- Profile Header / Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title-row">
          <h3>👤 Seus Dados & Conexões</h3>
          <button id="btn-open-pf-edit" class="btn btn-primary btn-sm">
            ✏️ Editar Perfil & Redes
          </button>
        </div>
        <div class="level-card" style="margin-bottom: 14px;">
          <div class="level-icon" style="background: var(--brand-light); border-color: var(--brand); overflow: hidden; width: 64px; height: 64px;">
            ${
              profile.avatarUrl || user.avatar
                ? `<img src="${profile.avatarUrl || user.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:18px;">`
                : `<span style="font-size: 26px; font-weight:800; color:var(--brand);">${(profile.nome || user.name || 'U')[0].toUpperCase()}</span>`
            }
          </div>
          <div>
            <div style="font-size: 19px; font-weight: 800; color: var(--text-main);">
              ${profile.nome || user.name || 'Usuário'}
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              ${user.email}
            </div>
          </div>
        </div>

        <!-- Social Badges Preview -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
          ${socials.instagram ? `<span class="social-pill">📸 ${socials.instagram}</span>` : ''}
          ${socials.linkedin ? `<span class="social-pill">💼 LinkedIn</span>` : ''}
          ${socials.youtube ? `<span class="social-pill">🎥 YouTube</span>` : ''}
          ${socials.tiktok ? `<span class="social-pill">🎵 TikTok</span>` : ''}
          ${socials.twitter ? `<span class="social-pill">𝕏 Twitter</span>` : ''}
          ${!socials.instagram && !socials.linkedin && !socials.youtube && !socials.tiktok && !socials.twitter ? `<span style="font-size: 12px; color: var(--text-muted);">Nenhuma rede social conectada ainda. Clique em Editar para conectar!</span>` : ''}
        </div>
      </div>

      <!-- Badge Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title-row">
          <h3>🎖️ Seu Ponto de Partida</h3>
          <button id="btn-share-start-badge" class="btn btn-secondary btn-sm">
            🚀 Compartilhar Badge
          </button>
        </div>
        <div class="level-card" style="margin-bottom: 0;">
          <div class="level-icon" style="background: ${badge.cor}18; border-color: ${badge.cor}; font-size: 32px;">
            ${badge.icone}
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 800; color: ${badge.cor};">
              ${badge.nome}
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
              ${badge.desc}
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnostic Summary Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title-row">
          <h3>📋 Respostas do Diagnóstico</h3>
          <button id="btn-redo-onboarding" class="btn btn-secondary btn-sm">Refazer Diagnóstico</button>
        </div>
        <div>
          <div class="profile-row">
            <span>Nome ou Apelido</span>
            <strong>${profile.nome || '—'}</strong>
          </div>
          <div class="profile-row">
            <span>Faixa Etária</span>
            <strong>${profile.faixa || '—'}</strong>
          </div>
          <div class="profile-row">
            <span>Sobra no Fim do Mês (0-10)</span>
            <strong>${profile.sobra} / 10</strong>
          </div>
          <div class="profile-row">
            <span>Maior Dificuldade</span>
            <strong>${profile.dificuldade || '—'}</strong>
          </div>
          <div class="profile-row">
            <span>Meta de Economia Anual</span>
            <strong style="color: var(--green);">${profile.meta ? fmtBRL(profile.meta) : '—'}</strong>
          </div>
          <div class="profile-row">
            <span>Clareza sobre os Gastos</span>
            <strong>${profile.sabeParaOnde || '—'}</strong>
          </div>
          <div class="profile-row">
            <span>Conhecimento sobre Investimentos</span>
            <strong>${profile.sabeInvestir || '—'}</strong>
          </div>
        </div>
      </div>

      <!-- Backup and Data Management Card -->
      <div class="card">
        <div class="card-title-row">
          <h3>💾 Gerenciamento de Dados & Backup</h3>
        </div>
        <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">
          Seus dados estão sincronizados na nuvem e salvos no aparelho. Faça backup local em JSON sempre que desejar.
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button id="btn-export-data" class="btn btn-secondary">
            <span>📥</span> Baixar Backup (JSON)
          </button>
          <label class="btn btn-secondary" style="cursor: pointer;">
            <span>📤</span> Restaurar Backup
            <input id="input-import-data" type="file" accept=".json" style="display: none;">
          </label>
        </div>
      </div>
    </div>
  `;

  // Bind edit profile modal
  const btnEditPf = container.querySelector('#btn-open-pf-edit');
  if (btnEditPf) {
    btnEditPf.addEventListener('click', () => {
      openProfileModal(user, profile, (up) => {
        if (onProfileUpdated) onProfileUpdated(up);
      });
    });
  }

  // Bind share badge
  const btnShareBadge = container.querySelector('#btn-share-start-badge');
  if (btnShareBadge) {
    btnShareBadge.addEventListener('click', () => {
      showBadgeModal3D(badge, user);
    });
  }

  // Bind redo onboarding
  const btnRedo = container.querySelector('#btn-redo-onboarding');
  if (btnRedo) {
    btnRedo.addEventListener('click', onResetOnboarding);
  }

  // Export Data
  const btnExport = container.querySelector('#btn-export-data');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = storage.exportData(user.email);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_meajuda_${user.email}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup baixado com sucesso!', 'success');
    });
  }

  // Import Data
  const inputImport = container.querySelector('#input-import-data');
  if (inputImport) {
    inputImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = storage.importData(user.email, event.target.result);
        if (ok) {
          showToast('Dados restaurados com sucesso!', 'success');
          window.location.reload();
        } else {
          showToast('Arquivo de backup inválido.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }
}
