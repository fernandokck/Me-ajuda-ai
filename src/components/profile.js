/**
 * Profile & Settings Component
 */

import { gamification } from '../services/gamification.js';
import { storage } from '../services/storage.js';
import { fmtBRL } from '../services/finance.js';
import { showToast } from './toast.js';

export function renderProfile(container, user, onResetOnboarding) {
  const profile = gamification.getProfile(user.email);
  if (!profile) return;

  const badge = profile.badge;

  container.innerHTML = `
    <div id="tab-perfil">
      <!-- Badge Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title-row">
          <h3>🎖️ Seu Ponto de Partida</h3>
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
          <h3>📋 Suas Respostas do Diagnóstico</h3>
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
          Seus dados financeiros ficam gravados no navegador. Faça backup das suas informações a qualquer momento em arquivo JSON para restaurar em outro dispositivo.
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
