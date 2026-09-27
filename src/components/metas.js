/**
 * Metas de Gastos View Component with Responsive Mobile Layout
 * and Interactive Custom Category Goal Addition
 */

import { budgetService } from '../services/budget.js';
import { fmtBRL, curMonthKey } from '../services/finance.js';
import { openAddBudgetModal } from './budgetModal.js';
import { showToast } from './toast.js';

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
      <!-- Metas Hero Summary Card (Calibrated for Mobile & Desktop) -->
      <div class="card metas-hero-card" style="margin-bottom: 18px;">
        <div class="metas-hero-header">
          <div>
            <span class="metas-hero-kicker">Controle Orçamentário</span>
            <h2 class="metas-hero-title">🎯 Metas de Gastos do Mês</h2>
          </div>
          <button id="btn-add-meta-hero" class="btn btn-primary btn-sm metas-hero-btn">
            <span>➕</span> Nova Meta
          </button>
        </div>

        <div class="metas-hero-numbers">
          <span class="metas-hero-spent" style="color: ${overallColor};">${fmtBRL(budgetData.totalSpent)}</span>
          <span class="metas-hero-limit">de ${fmtBRL(budgetData.totalLimit)} (${budgetData.totalPct}%)</span>
        </div>

        <div class="progress-bar" style="height: 8px; margin: 10px 0 8px;">
          <div class="progress-bar-inner" style="width: ${Math.min(100, budgetData.totalPct)}%; background: ${overallColor};"></div>
        </div>

        <div class="metas-hero-status" style="color: ${overallColor};">
          ${budgetData.hasBudgets ? overallStatus : 'Nenhuma meta de categoria adicionada ainda.'}
        </div>
      </div>

      <!-- Categories Section -->
      <div class="card" style="margin-bottom: 18px;">
        <div class="card-title-row">
          <div>
            <h3 style="font-size: 15px;">📋 Progresso por Categoria</h3>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              ${budgetData.categoryList.length} ${budgetData.categoryList.length === 1 ? 'meta ativa' : 'metas ativas'}
            </div>
          </div>
          ${
            budgetData.hasBudgets
              ? `
            <button id="btn-add-meta-list" class="btn btn-secondary btn-sm">
              <span>➕</span> Adicionar
            </button>
          `
              : ''
          }
        </div>

        ${
          !budgetData.hasBudgets
            ? `
          <!-- Empty State CTA Box -->
          <div class="metas-empty-box">
            <div class="metas-empty-icon">🎯</div>
            <h4 style="font-size: 15px; font-weight: 800; margin: 8px 0 4px; color: var(--text-main);">
              Adicione seu progresso para sua gestão financeira
            </h4>
            <p style="font-size: 12.5px; color: var(--text-muted); max-width: 380px; margin: 0 auto 16px; line-height: 1.4;">
              Defina limites de gastos para categorias como Lazer, Comida e Transporte para acompanhar em tempo real e receber alertas antes de estourar.
            </p>
            <button id="btn-add-meta-empty" class="btn btn-primary" style="padding: 11px 22px; font-size: 14px;">
              <span>➕</span> Adicionar Meta de Gasto
            </button>
          </div>
        `
            : `
          <!-- Active Categories Grid -->
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
                      <span style="font-size: 18px;">${getCatIcon(item.category)}</span>
                      <strong style="font-size: 13.5px;">${item.category}</strong>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span class="budget-status-pill" style="color: ${badgeColor}; background: ${badgeColor}15; border: 1px solid ${badgeColor}33;">
                        ${badgeText}
                      </span>
                      <button class="btn-del btn-del-budget" data-cat="${item.category}" title="Excluir meta">✕</button>
                    </div>
                  </div>

                  <div class="progress-bar" style="margin: 8px 0 6px; height: 7px;">
                    <div class="progress-bar-inner" style="width: ${Math.min(100, item.pct)}%; background: ${progressColor};"></div>
                  </div>

                  <div class="budget-item-footer">
                    <span>Gasto: <strong>${fmtBRL(item.spent)}</strong></span>
                    <span>Meta: <strong>${fmtBRL(item.limit)}</strong></span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size: 11px;">
                    <span style="color: var(--text-muted);">
                      Restam: <strong style="color: ${item.remaining > 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(item.remaining)}</strong>
                    </span>
                    <button class="btn-edit-budget" data-cat="${item.category}" style="color:var(--brand); font-weight:700; font-size:11px;">
                      Editar meta ✏️
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>

      <!-- Tips Card -->
      <div class="card">
        <div class="card-title-row">
          <h3 style="font-size: 14.5px;">💡 Dica de Gestão Financeira</h3>
        </div>
        <div style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5;">
          Definir metas por categoria ajuda seu cérebro a criar limites claros. Ao registrar uma despesa, se você estiver próximo de 80%, o app te avisará na hora para poupar o restante!
        </div>
      </div>
    </div>
  `;

  // Bind Add Meta buttons
  const openModalHandler = () => {
    openAddBudgetModal(userEmail, '', () => {
      renderMetasView(container, user, onDataChanged);
      if (onDataChanged) onDataChanged();
    });
  };

  const btnHero = container.querySelector('#btn-add-meta-hero');
  if (btnHero) btnHero.addEventListener('click', openModalHandler);

  const btnList = container.querySelector('#btn-add-meta-list');
  if (btnList) btnList.addEventListener('click', openModalHandler);

  const btnEmpty = container.querySelector('#btn-add-meta-empty');
  if (btnEmpty) btnEmpty.addEventListener('click', openModalHandler);

  // Bind Edit buttons
  container.querySelectorAll('.btn-edit-budget').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      openAddBudgetModal(userEmail, cat, () => {
        renderMetasView(container, user, onDataChanged);
        if (onDataChanged) onDataChanged();
      });
    });
  });

  // Bind Delete buttons
  container.querySelectorAll('.btn-del-budget').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      budgetService.removeCategoryBudget(userEmail, cat);
      showToast(`Meta de ${cat} removida.`, 'info');
      renderMetasView(container, user, onDataChanged);
      if (onDataChanged) onDataChanged();
    });
  });
}
