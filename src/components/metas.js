/**
 * Metas de Gastos View Component (Dedicated Screen for Monthly Budgets)
 */

import { budgetService } from '../services/budget.js';
import { fmtBRL, curMonthKey } from '../services/finance.js';
import { openBudgetModal } from './budgetModal.js';

function getCatIcon(cat) {
  const map = {
    'Alimentação': '🛒',
    'Lanches/Besteiras': '🍔',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '💊',
    'Educação': '📚',
    'Outros': '📦'
  };
  return map[cat] || '🏷️';
}

export function renderMetasView(container, user, onDataChanged) {
  const userEmail = user.email;
  const budgetData = budgetService.calculateCategoryProgress(userEmail, curMonthKey());

  let overallColor = 'var(--brand)';
  let overallStatus = 'Dentro do planejado';
  if (budgetData.totalPct >= 100) {
    overallColor = 'var(--red)';
    overallStatus = 'Teto total mensal excedido!';
  } else if (budgetData.totalPct >= 80) {
    overallColor = 'var(--amber)';
    overallStatus = 'Próximo do limite mensal (80%+)';
  }

  container.innerHTML = `
    <div id="tab-metas" class="view-content-wrapper">
      <!-- Metas Hero Summary Card -->
      <div class="card score-hero-card" style="margin-bottom: 20px;">
        <div class="score-hero-header">
          <div>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
              Controle Orçamentário
            </span>
            <h2 style="font-size: 24px; font-weight: 800; margin: 4px 0;">🎯 Metas de Gastos do Mês</h2>
          </div>
          <button id="btn-adjust-metas-view" class="btn btn-primary btn-sm">
            ⚙️ Ajustar Limites
          </button>
        </div>

        <div class="score-number-display" style="margin: 8px 0 12px;">
          <span class="score-big-val" style="color: ${overallColor};">${fmtBRL(budgetData.totalSpent)}</span>
          <span class="score-max-val">/ ${fmtBRL(budgetData.totalLimit)} (${budgetData.totalPct}%)</span>
        </div>

        <div class="score-track-bar">
          <div class="score-track-fill" style="width: ${Math.min(100, budgetData.totalPct)}%; background: ${overallColor};"></div>
        </div>

        <p class="score-hero-desc" style="font-weight: 600; color: ${overallColor}; margin-top: 8px;">
          ${overallStatus}
        </p>
      </div>

      <!-- Categories Detailed Grid -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-title-row">
          <h3>📋 Progresso por Categoria</h3>
          <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
            ${budgetData.categoryList.length} categorias monitoradas
          </span>
        </div>

        <div class="budget-items-grid">
          ${budgetData.categoryList
            .map((item) => {
              let badgeColor = 'var(--brand)';
              let badgeText = `${item.pct}%`;
              let progressColor = 'var(--brand)';

              if (item.status === 'exceeded') {
                badgeColor = 'var(--red)';
                progressColor = 'var(--red)';
                badgeText = `🚨 Excedido (${item.pct}%)`;
              } else if (item.status === 'warning') {
                badgeColor = 'var(--amber)';
                progressColor = 'var(--amber)';
                badgeText = `⚠️ 80%+ (${item.pct}%)`;
              }

              return `
              <div class="budget-item-card ${item.status}">
                <div class="budget-item-head">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size: 20px;">${getCatIcon(item.category)}</span>
                    <strong style="font-size: 14px;">${item.category}</strong>
                  </div>
                  <span class="budget-status-pill" style="color: ${badgeColor}; background: ${badgeColor}15; border: 1px solid ${badgeColor}33;">
                    ${badgeText}
                  </span>
                </div>

                <div class="progress-bar" style="margin: 10px 0 8px; height: 8px;">
                  <div class="progress-bar-inner" style="width: ${Math.min(100, item.pct)}%; background: ${progressColor};"></div>
                </div>

                <div class="budget-item-footer">
                  <span>Gasto: <strong>${fmtBRL(item.spent)}</strong></span>
                  <span>Meta: <strong>${fmtBRL(item.limit)}</strong></span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; text-align: right;">
                  Restam: <strong style="color: ${item.remaining > 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(item.remaining)}</strong>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <!-- Tips Card -->
      <div class="card">
        <div class="card-title-row">
          <h3>💡 Como as Metas Ajudam suas Finanças</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; color: var(--text-muted);">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <span style="font-size:18px;">🔔</span>
            <div><strong>Alertas Instantâneos:</strong> O app te avisa antes de estourar o orçamento para você evitar surpresas no fim do mês.</div>
          </div>
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <span style="font-size:18px;">⚡</span>
            <div><strong>Impulsiona seu Score:</strong> Manter seus gastos dentro das metas aumenta seus pontos no Score Financeiro todo mês.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Adjust limits button
  const btnAdjust = container.querySelector('#btn-adjust-metas-view');
  if (btnAdjust) {
    btnAdjust.addEventListener('click', () => {
      openBudgetModal(userEmail, () => {
        if (onDataChanged) onDataChanged();
      });
    });
  }
}
