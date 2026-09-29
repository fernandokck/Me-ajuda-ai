import { gamification } from '../services/gamification.js';
import { storage } from '../services/storage.js';
import { finance, fmtBRL } from '../services/finance.js';
import { walletService } from '../services/wallet.js';
import { showToast } from './toast.js';
import { openProfileModal } from './profileModal.js';
import { showBadgeModal3D } from './badgeModal.js';
import { openFinancialReportModal } from './reportModal.js';
import { SOCIAL_ICONS } from './icons.js';

export function renderProfile(container, user, onResetOnboarding, onProfileUpdated) {
  const profile = gamification.getProfile(user.email);
  if (!profile) return;

  const badge = profile.badge;
  const socials = profile.socials || {};
  const savings = finance.calculateYearlySavingsProgress(user.email);

  let savingsColor = 'var(--brand)';
  if (savings.pct >= 100) savingsColor = 'var(--green)';
  else if (savings.pct >= 50) savingsColor = 'var(--brand)';
  else if (savings.pct >= 20) savingsColor = 'var(--purple)';

  container.innerHTML = `
    <div id="tab-perfil" class="view-content-wrapper">
      <!-- 📊 Executive Financial Report Card -->
      <div class="card" style="margin-bottom: 16px; border: 1.5px solid rgba(59, 91, 253, 0.35); background: linear-gradient(135deg, var(--surface) 0%, var(--brand-light) 100%);">
        <div class="card-title-row">
          <div>
            <span class="full-view-kicker" style="color: var(--brand);">DOSSIÊ EXECUTIVO</span>
            <h3 style="margin-top: 2px; font-size: 16.5px;">📊 Relatório Financeiro Completo</h3>
          </div>
          <span class="budget-status-pill" style="background: var(--brand); color: #ffffff; font-weight: 800; font-size: 11px;">
            PDF / HTML
          </span>
        </div>

        <p style="font-size: 13px; color: var(--text-muted); margin: 6px 0 16px; line-height: 1.5;">
          Gere seu dossiê executivo completo com gráficos de desempenho, raio-x do score, metas, histórico multimensal consolidado e plano de ação em 3 fases para imprimir ou salvar em PDF.
        </p>

        <button id="btn-open-financial-report" class="btn btn-primary btn-sm btn-block" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 800;">
          📥 Baixar / Visualizar Relatório Financeiro
        </button>
      </div>

      <!-- Profile Header / Card -->
      <div class="card" style="margin-bottom: 16px;">
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

        <!-- Social Badges Preview with Official Logos -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
          ${socials.instagram ? `<span class="social-pill">${SOCIAL_ICONS.instagram} ${socials.instagram}</span>` : ''}
          ${socials.linkedin ? `<span class="social-pill">${SOCIAL_ICONS.linkedin} LinkedIn</span>` : ''}
          ${socials.youtube ? `<span class="social-pill">${SOCIAL_ICONS.youtube} YouTube</span>` : ''}
          ${socials.tiktok ? `<span class="social-pill">${SOCIAL_ICONS.tiktok} TikTok</span>` : ''}
          ${socials.whatsapp ? `<span class="social-pill">${SOCIAL_ICONS.whatsapp} WhatsApp</span>` : ''}
          ${socials.twitter ? `<span class="social-pill">${SOCIAL_ICONS.twitter} Twitter</span>` : ''}
          ${!socials.instagram && !socials.linkedin && !socials.youtube && !socials.tiktok && !socials.whatsapp && !socials.twitter ? `<span style="font-size: 12px; color: var(--text-muted);">Nenhuma rede social conectada ainda. Clique em Editar para conectar!</span>` : ''}
        </div>
      </div>

      <!-- 🎯 Yearly Savings Goal Progress Card -->
      <div class="card" style="margin-bottom: 16px; background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-hover) 100%);">
        <div class="card-title-row">
          <div>
            <span class="full-view-kicker">EVOLUÇÃO ANUAL</span>
            <h3 style="margin-top: 2px; font-size: 16px;">🎯 Meta de Economia para o Ano</h3>
          </div>
          <button id="btn-share-savings-goal" class="btn btn-secondary btn-xs" title="Compartilhar progresso da meta">
            🚀 Compartilhar
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px; margin: 6px 0 2px;">
          <div>
            <span style="font-size: 26px; font-weight: 900; color: ${savingsColor};">
              ${fmtBRL(savings.totalAccumulated)}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">
              de ${profile.meta ? fmtBRL(profile.meta) : 'R$ 0,00'}
            </span>
          </div>
          <span class="budget-status-pill" style="color: ${savingsColor}; background: ${savingsColor}15; border: 1px solid ${savingsColor}33; font-size: 12px;">
            ${savings.pct}% conquistado
          </span>
        </div>

        <div class="progress-bar" style="height: 8px; margin: 10px 0 8px;">
          <div class="progress-bar-inner" style="width: ${savings.pct}%; background: ${savingsColor};"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted);">
          <span>Próximo marco: <strong>${savings.nextMilestonePct}%</strong></span>
          ${
            savings.remainingToNextMilestone > 0
              ? `<span>Faltam <strong>${fmtBRL(savings.remainingToNextMilestone)}</strong> para o próximo marco</span>`
              : `<span>🎉 Meta anual 100% atingida!</span>`
          }
        </div>
      </div>

      <!-- Badge Card -->
      <div class="card" style="margin-bottom: 16px;">
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

      <!-- Diagnostic Summary Card (Alinhamento calibrado com 2 colunas) -->
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-title-row">
          <h3>📋 Respostas do Diagnóstico</h3>
          <button id="btn-redo-onboarding" class="btn btn-secondary btn-sm">Refazer Diagnóstico</button>
        </div>
        <div class="profile-diagnostic-list">
          <div class="profile-row">
            <span class="profile-row-label">Nome ou Apelido</span>
            <strong class="profile-row-val">${profile.nome || '—'}</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Faixa Etária</span>
            <strong class="profile-row-val">${profile.faixa || '—'}</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Sobra no Fim do Mês (0-10)</span>
            <strong class="profile-row-val">${profile.sobra} / 10</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Maior Dificuldade</span>
            <strong class="profile-row-val">${profile.dificuldade || '—'}</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Meta de Economia Anual</span>
            <strong class="profile-row-val" style="color: var(--green);">${profile.meta ? fmtBRL(profile.meta) : '—'}</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Clareza sobre os Gastos</span>
            <strong class="profile-row-val">${profile.sabeParaOnde || '—'}</strong>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Conhecimento sobre Investimentos</span>
            <strong class="profile-row-val">${profile.sabeInvestir || '—'}</strong>
          </div>
        </div>
      </div>

      <!-- Backup and Data Management Card -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title-row">
          <h3>💾 Backup & Sincronização de Dados</h3>
          <span class="budget-status-pill" style="background: #10b98115; color: var(--green); border: 1px solid #10b98133; font-weight: 700;">
            Disponível
          </span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px; line-height: 1.5;">
          Você pode baixar uma cópia completa dos seus lançamentos locais em arquivo JSON ou restaurar seus dados em outro aparelho e sincronizar diretamente com o Supabase.
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button id="btn-export-backup" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
              📥 Baixar Backup (JSON)
            </button>
            <button id="btn-import-backup" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
              📤 Restaurar Backup
            </button>
          </div>
          <input id="input-import-file" type="file" accept=".json,application/json" style="display: none;" />

          <button id="btn-sync-cloud-now" class="btn btn-primary btn-sm btn-block" style="margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            🔄 Forçar Sincronização com o Supabase
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind open financial report modal
  const btnOpenReport = container.querySelector('#btn-open-financial-report');
  if (btnOpenReport) {
    btnOpenReport.addEventListener('click', () => {
      openFinancialReportModal(user);
    });
  }

  // Bind edit profile modal
  const btnEditPf = container.querySelector('#btn-open-pf-edit');
  if (btnEditPf) {
    btnEditPf.addEventListener('click', () => {
      openProfileModal(user, profile, (up) => {
        if (onProfileUpdated) onProfileUpdated(up);
      });
    });
  }

  // Bind share yearly savings goal
  const btnShareGoal = container.querySelector('#btn-share-savings-goal');
  if (btnShareGoal) {
    btnShareGoal.addEventListener('click', () => {
      showBadgeModal3D({
        nome: `Meta de Economia: ${savings.pct}% Conquistado!`,
        titulo: `🎯 ${savings.pct}% da Meta de Economia Anual!`,
        desc: `Já acumulei ${fmtBRL(savings.totalAccumulated)} da minha meta de ${fmtBRL(savings.targetMeta)} neste ano! Rumo ao topo financeiro!`,
        icone: '🚀',
        cor: savingsColor
      }, user);
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

  // Bind Export Backup
  const btnExport = container.querySelector('#btn-export-backup');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const jsonStr = storage.exportData(user.email);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `me-ajuda-ai-backup-${(user.email || 'user').split('@')[0]}-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup baixado com sucesso!', 'success');
    });
  }

  // Bind Import Backup
  const inputImport = container.querySelector('#input-import-file');
  const btnImport = container.querySelector('#btn-import-backup');
  if (btnImport && inputImport) {
    btnImport.addEventListener('click', () => {
      inputImport.click();
    });

    inputImport.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const res = storage.importData(user.email, event.target.result);
          if (res.success) {
            showToast('Dados restaurados! Sincronizando com a nuvem...', 'success');
            await Promise.all([
              finance.syncWithCloud(user),
              gamification.syncProfileFromCloud(user),
              walletService.syncWithCloud(user)
            ]);
            const updatedProfile = gamification.getProfile(user.email);
            if (onProfileUpdated && updatedProfile) {
              onProfileUpdated(updatedProfile);
            }
            showToast('Tudo sincronizado com sucesso!', 'success');
          } else {
            showToast('Arquivo de backup inválido: ' + (res.error || ''), 'error');
          }
        } catch (err) {
          showToast('Erro ao ler arquivo: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Bind Force Cloud Sync Now
  const btnSyncNow = container.querySelector('#btn-sync-cloud-now');
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      const origText = btnSyncNow.innerHTML;
      btnSyncNow.disabled = true;
      btnSyncNow.innerHTML = '⏳ Sincronizando com Supabase...';
      try {
        await Promise.all([
          finance.syncWithCloud(user),
          gamification.syncProfileFromCloud(user),
          walletService.syncWithCloud(user)
        ]);
        const txs = finance.getTransactions(user.email);
        const wls = walletService.getWallets(user.email);
        showToast(`Sincronizado! ${txs.length} lançamentos e ${wls.length} carteiras atualizados.`, 'success');
        const updatedProfile = gamification.getProfile(user.email);
        if (onProfileUpdated && updatedProfile) {
          onProfileUpdated(updatedProfile);
        }
      } catch (err) {
        showToast('Erro ao sincronizar: ' + err.message, 'error');
      } finally {
        btnSyncNow.disabled = false;
        btnSyncNow.innerHTML = origText;
      }
    });
  }
}

