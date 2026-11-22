/**
 * Upgrade / Paywall Modal Component (⭐ Me ajuda aí PRO)
 * Displays benefits, plan options, pricing, and testing activation toggle.
 */

import { subscriptionService, SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS } from '../services/subscription.js';
import { showToast } from './toast.js';

export function openUpgradeModal(user, context = {}) {
  const existing = document.getElementById('upgrade-pro-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  const currentSub = subscriptionService.getSubscription(userEmail);

  const modal = document.createElement('div');
  modal.id = 'upgrade-pro-modal';
  modal.className = 'badge-modal-backdrop upgrade-backdrop';

  const triggerFeature = context.featureName || 'Recurso Exclusivo';
  const triggerReason = context.reason || 'Este recurso faz parte do plano Me ajuda aí PRO para acelerar sua independência financeira.';

  modal.innerHTML = `
    <div class="upgrade-modal-card">
      <button class="badge-modal-close" id="btn-close-upgrade-modal" title="Fechar">✕</button>

      <!-- HERO HEADER -->
      <div class="upgrade-hero-header">
        <div class="upgrade-crown-icon">👑</div>
        <span class="upgrade-kicker">PLANO ME AJUDA AÍ PRO</span>
        <h2 class="upgrade-title">Desbloqueie Todo o Seu Potencial Financeiro</h2>
        <p class="upgrade-subtitle">
          ${context.featureName ? `O recurso <strong>${triggerFeature}</strong> é exclusivo para assinantes PRO.` : triggerReason}
        </p>
      </div>

      <!-- HIGHLIGHT BENEFIT CARDS -->
      <div class="upgrade-benefits-grid">
        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">📊</div>
          <div>
            <strong>Relatórios Executivos em PDF & HTML</strong>
            <p>Dossiê financeiro completo com gráficos de desempenho, score e exportação em 1 clique.</p>
          </div>
        </div>

        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">🏦</div>
          <div>
            <strong>Carteiras Ilimitadas & Moedas Globais</strong>
            <p>Gerencie bancos, caixinhas, corretoras, Dólar (USD), Euro (EUR) e Criptomoedas juntos.</p>
          </div>
        </div>

        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">📈</div>
          <div>
            <strong>Histórico Completo Sem Restrições</strong>
            <p>Evolução financeira multimensal sem limite de tempo e comparativos mês a mês.</p>
          </div>
        </div>

        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">🎯</div>
          <div>
            <strong>Tetos & Metas Ilimitadas por Categoria</strong>
            <p>Defina metas em todas as categorias com alertas inteligentes antes de estourar o orçamento.</p>
          </div>
        </div>

        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">🧠</div>
          <div>
            <strong>Diagnóstico & Plano Estratégico em 3 Fases</strong>
            <p>Recomendações personalizadas da IA com metas para 30, 90 e 180 dias.</p>
          </div>
        </div>

        <div class="upgrade-benefit-item">
          <div class="upgrade-benefit-icon">☁️</div>
          <div>
            <strong>Sincronização & Backup Contínuo em Nuvem</strong>
            <p>Seus dados 100% seguros no Supabase, acessíveis de qualquer aparelho em tempo real.</p>
          </div>
        </div>
      </div>

      <!-- PRICING TIERS -->
      <div class="upgrade-pricing-grid">
        <!-- Annual Plan (Featured) -->
        <div class="upgrade-plan-card featured" id="card-plan-annual">
          <span class="upgrade-popular-badge">⭐ MAIS POPULAR · 25% OFF</span>
          <div class="upgrade-plan-name">Plano Anual</div>
          <div class="upgrade-plan-price">
            <span class="price-currency">R$</span>
            <span class="price-big">14</span>
            <span class="price-cents">,90</span>
            <span class="price-period">/ mês</span>
          </div>
          <div class="upgrade-plan-sub">Faturado anualmente (R$ 178,80/ano)</div>
          <button class="btn btn-primary btn-block upgrade-cta-btn" id="btn-subscribe-annual">
            🚀 Assinar Plano Anual PRO
          </button>
        </div>

        <!-- Monthly Plan -->
        <div class="upgrade-plan-card" id="card-plan-monthly">
          <div class="upgrade-plan-name">Plano Mensal</div>
          <div class="upgrade-plan-price">
            <span class="price-currency">R$</span>
            <span class="price-big">19</span>
            <span class="price-cents">,90</span>
            <span class="price-period">/ mês</span>
          </div>
          <div class="upgrade-plan-sub">Cobrança mensal · Cancele a qualquer momento</div>
          <button class="btn btn-secondary btn-block upgrade-cta-btn" id="btn-subscribe-monthly">
            Assinar Plano Mensal
          </button>
        </div>
      </div>

      <!-- LOCAL TESTING TOOLBAR (Dev Environment) -->
      <div class="upgrade-dev-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: var(--amber); letter-spacing: 0.04em;">🧪 AMBIENTE DE TESTES LOCAL</span>
          <span class="budget-status-pill" style="font-size: 10.5px;">Status Atual: <strong>${currentSub.isPro ? '⭐ PRO Ativo' : '🌱 Gratuito'}</strong></span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
          Utilize os botões abaixo para simular a assinatura ou o cancelamento do plano PRO instantaneamente na sua máquina:
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-dev-simulate-activate" class="btn btn-primary btn-xs" style="flex: 1;">
            ✨ Simular Ativação PRO
          </button>
          <button id="btn-dev-simulate-cancel" class="btn btn-secondary btn-xs" style="flex: 1;">
            🔒 Simular Bloqueio / Gratuito
          </button>
        </div>
      </div>

      <!-- SECURITY GUARANTEE FOOTER -->
      <div class="upgrade-guarantee-footer">
        <span>🔒 Pagamento 100% Seguro</span>
        <span>•</span>
        <span>⚡ Acesso Instantâneo</span>
        <span>•</span>
        <span>🛡️ 7 Dias de Garantia Incondicional</span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-upgrade-modal').addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Action: Subscribe Annual
  modal.querySelector('#btn-subscribe-annual').addEventListener('click', async () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await subscriptionService.setSubscription(userEmail, {
      tier: SUBSCRIPTION_TIERS.PRO,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiresAt: nextYear.toISOString()
    });

    showToast('🎉 Parabéns! Plano Anual PRO ativado com sucesso!', 'success');
    closeModal();
    if (context.onSubscribed) context.onSubscribed();
    else window.location.reload();
  });

  // Action: Subscribe Monthly
  modal.querySelector('#btn-subscribe-monthly').addEventListener('click', async () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await subscriptionService.setSubscription(userEmail, {
      tier: SUBSCRIPTION_TIERS.PRO,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiresAt: nextMonth.toISOString()
    });

    showToast('🎉 Parabéns! Plano Mensal PRO ativado com sucesso!', 'success');
    closeModal();
    if (context.onSubscribed) context.onSubscribed();
    else window.location.reload();
  });

  // Dev: Simulate Activate
  modal.querySelector('#btn-dev-simulate-activate').addEventListener('click', async () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await subscriptionService.setSubscription(userEmail, {
      tier: SUBSCRIPTION_TIERS.PRO,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiresAt: nextYear.toISOString()
    });

    showToast('🧪 Simulação: Modo PRO ATIVADO com sucesso!', 'success');
    closeModal();
    if (context.onSubscribed) context.onSubscribed();
    else window.location.reload();
  });

  // Dev: Simulate Cancel / Free
  modal.querySelector('#btn-dev-simulate-cancel').addEventListener('click', async () => {
    await subscriptionService.setSubscription(userEmail, {
      tier: SUBSCRIPTION_TIERS.FREE,
      status: SUBSCRIPTION_STATUS.NONE,
      expiresAt: null
    });

    showToast('🧪 Simulação: Modo GRATUITO ativado (Recursos PRO bloqueados).', 'info');
    closeModal();
    if (context.onSubscribed) context.onSubscribed();
    else window.location.reload();
  });
}
