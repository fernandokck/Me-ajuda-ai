/**
 * Full Recurring Rules Modal Component
 * Displays complete list of recurring expenses with breakdown of Income vs Fixed Costs,
 * due dates, category filtering, search without flicker, and deletion/management.
 */

import {
  finance,
  fmtBRL,
  TAG_CLASSES,
  TAG_LABELS,
  CATEGORIES,
  getCategoryIcon
} from '../services/finance.js';
import { showToast } from './toast.js';

export function openRecurringModal(user, onDataChanged) {
  const existing = document.getElementById('recurring-full-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  let activeFilter = 'all'; // 'all', 'gastos', 'receitas', 'contafixa', 'investimento'
  let activeCategoryFilter = 'all';
  let searchQuery = '';

  const modal = document.createElement('div');
  modal.id = 'recurring-full-modal';
  modal.className = 'badge-modal-backdrop';

  let list = finance.getRecurring(userEmail) || [];

  // Collect any custom categories in recurring rules
  const standardCats = new Set([...CATEGORIES.gasto, ...CATEGORIES.investimento]);
  const extraCategories = [];
  list.forEach((r) => {
    if (r.subcategoria && !standardCats.has(r.subcategoria) && !extraCategories.includes(r.subcategoria)) {
      extraCategories.push(r.subcategoria);
    }
  });

  function calculateTotals() {
    const receitas = list.filter((r) => r.tipo === 'salario' || r.tipo === 'freelance');
    const custosFixos = list.filter((r) => r.tipo !== 'salario' && r.tipo !== 'freelance');

    const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.valor), 0);
    const totalCustosFixos = custosFixos.reduce((sum, r) => sum + Number(r.valor), 0);
    const saldoPrevisto = totalReceitas - totalCustosFixos;

    return {
      receitas,
      custosFixos,
      totalReceitas,
      totalCustosFixos,
      saldoPrevisto,
      contafixaCount: list.filter((r) => r.tipo === 'contafixa').length,
      investimentoCount: list.filter((r) => r.tipo === 'investimento').length
    };
  }

  const totals = calculateTotals();

  // Render static modal shell ONCE (Prevents blinking when typing)
  modal.innerHTML = `
    <div class="full-view-modal-card">
      <!-- Modal Header -->
      <div class="full-view-header">
        <div>
          <div class="full-view-kicker">GESTÃO DE RECORRÊNCIA</div>
          <h3 class="full-view-title">🔁 Todas as Contas Recorrentes</h3>
        </div>
        <button class="badge-modal-close" id="btn-close-rec-modal" title="Fechar">✕</button>
      </div>

      <!-- Separador de Compromisso Mensal: Salário vs Custo Fixo vs Saldo Livre -->
      <div class="full-view-kpis" id="rec-modal-kpis-grid">
        <div class="full-view-kpi-item">
          <span class="lbl">💵 Salário / Renda Prevista</span>
          <strong style="color: var(--green);">${fmtBRL(totals.totalReceitas)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">📑 Custo Mensal Fixo (A Pagar)</span>
          <strong style="color: var(--red);">${fmtBRL(totals.totalCustosFixos)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">✨ Saldo Livre Previsto</span>
          <strong style="color: ${totals.saldoPrevisto >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(totals.saldoPrevisto)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
        </div>
      </div>

      <!-- Controls: Search & Separador de Filtro (Gastos vs Salários vs Categorias) -->
      <div class="full-view-controls">
        <div class="full-view-search-wrap" style="width: 100%;">
          <span class="search-icon">🔍</span>
          <input 
            id="rec-modal-search" 
            type="text" 
            class="input full-view-search-input" 
            placeholder="Buscar conta recorrente por nome ou categoria..."
            value=""
            autocomplete="off"
          >
        </div>

        <!-- Separador de Filtro: Todos vs Custo Fixo vs Salário -->
        <div class="full-view-filter-pills" id="rec-modal-filter-pills">
          <button class="filter-pill-btn active" data-filter="all">
            Todos (${list.length})
          </button>
          <button class="filter-pill-btn" data-filter="gastos">
            📑 Custo Fixo / A Pagar (${totals.custosFixos.length})
          </button>
          <button class="filter-pill-btn" data-filter="receitas">
            💵 Salário / Entradas (${totals.receitas.length})
          </button>
          <button class="filter-pill-btn" data-filter="contafixa">
            Contas Fixas (${totals.contafixaCount})
          </button>
          <button class="filter-pill-btn" data-filter="investimento">
            Investimentos (${totals.investimentoCount})
          </button>
        </div>

        <!-- Filtro por Categoria (baseado em Novo Lançamento) -->
        <div class="full-view-filter-row">
          <div class="full-view-cat-wrap">
            <select id="rec-modal-cat-filter" class="input full-view-cat-select">
              <option value="all">🏷️ Todas as Categorias (Filtro por Categoria)</option>
              <optgroup label="Categorias de Contas Fixas e Gastos">
                ${CATEGORIES.gasto
                  .map((c) => `<option value="${c}">${getCategoryIcon(c)} ${c}</option>`)
                  .join('')}
              </optgroup>
              <optgroup label="Categorias de Investimentos">
                ${CATEGORIES.investimento
                  .map((c) => `<option value="${c}">${getCategoryIcon(c)} ${c}</option>`)
                  .join('')}
              </optgroup>
              ${
                extraCategories.length > 0
                  ? `
                <optgroup label="Outras Categorias">
                  ${extraCategories
                    .map((c) => `<option value="${c}">${getCategoryIcon(c)} ${c}</option>`)
                    .join('')}
                </optgroup>
              `
                  : ''
              }
            </select>
          </div>
        </div>

        <!-- Dynamic Category / Filter Summary Box -->
        <div id="rec-modal-summary-box" class="full-view-summary-box hidden"></div>
      </div>

      <!-- Recurring List Body -->
      <div class="full-view-table-container" id="rec-modal-list-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Modal Footer -->
      <div class="full-view-footer">
        <div id="rec-modal-footer-count" style="font-size: 12.5px; color: var(--text-muted);">
          Repete todo mês automaticamente no dia do vencimento.
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-footer-close-rec">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // DOM elements
  const searchInput = modal.querySelector('#rec-modal-search');
  const catSelect = modal.querySelector('#rec-modal-cat-filter');
  const pillsContainer = modal.querySelector('#rec-modal-filter-pills');
  const listContainer = modal.querySelector('#rec-modal-list-container');
  const summaryBox = modal.querySelector('#rec-modal-summary-box');
  const footerCount = modal.querySelector('#rec-modal-footer-count');
  const kpisGrid = modal.querySelector('#rec-modal-kpis-grid');

  function updateFilteredView() {
    let filtered = [...list];

    // 1. Filter by Nature / Separator
    if (activeFilter === 'gastos') {
      filtered = filtered.filter((r) => r.tipo !== 'salario' && r.tipo !== 'freelance');
    } else if (activeFilter === 'receitas') {
      filtered = filtered.filter((r) => r.tipo === 'salario' || r.tipo === 'freelance');
    } else if (activeFilter === 'contafixa') {
      filtered = filtered.filter((r) => r.tipo === 'contafixa');
    } else if (activeFilter === 'investimento') {
      filtered = filtered.filter((r) => r.tipo === 'investimento');
    }

    // 2. Filter by Category
    if (activeCategoryFilter !== 'all') {
      filtered = filtered.filter((r) => {
        const itemCat = r.subcategoria || (r.tipo === 'contafixa' ? 'Moradia' : (r.tipo === 'salario' ? 'Salário / Renda' : 'Outros'));
        return itemCat === activeCategoryFilter || r.subcategoria === activeCategoryFilter;
      });
    }

    // 3. Filter by Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (r) =>
          (r.desc && r.desc.toLowerCase().includes(q)) ||
          (r.subcategoria && r.subcategoria.toLowerCase().includes(q)) ||
          (TAG_LABELS[r.tipo] && TAG_LABELS[r.tipo].toLowerCase().includes(q))
      );
    }

    // Calculate totals for filtered subset
    let filteredGastos = 0;
    let filteredReceitas = 0;
    filtered.forEach((r) => {
      const val = Number(r.valor) || 0;
      if (r.tipo === 'salario' || r.tipo === 'freelance') {
        filteredReceitas += val;
      } else {
        filteredGastos += val;
      }
    });

    // Update Summary Box
    if (activeCategoryFilter !== 'all') {
      const isIncomeCategory = activeCategoryFilter.toLowerCase().includes('salário') || activeCategoryFilter.toLowerCase().includes('freelance');
      const totalDisplay = isIncomeCategory ? filteredReceitas : (filteredGastos > 0 ? filteredGastos : filteredReceitas);
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span style="font-size: 16px;">${getCategoryIcon(activeCategoryFilter)}</span>
          <span>Custo mensal recorrente em <strong>${activeCategoryFilter}</strong>:</span>
        </div>
        <div class="full-view-summary-val" style="color: ${isIncomeCategory ? 'var(--green)' : 'var(--red)'};">
          ${fmtBRL(totalDisplay)} / mês
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${filtered.length} ${filtered.length === 1 ? 'conta' : 'contas'})
          </span>
        </div>
      `;
    } else if (activeFilter === 'gastos') {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>📑 Custo Mensal Fixo Filtrado (A Pagar):</span>
        </div>
        <div class="full-view-summary-val" style="color: var(--red);">
          ${fmtBRL(filteredGastos)} / mês
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${filtered.length} contas ativas)
          </span>
        </div>
      `;
    } else if (activeFilter === 'receitas') {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>💵 Salário / Entradas Recorrentes Filtradas:</span>
        </div>
        <div class="full-view-summary-val" style="color: var(--green);">
          ${fmtBRL(filteredReceitas)} / mês
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${filtered.length} entradas)
          </span>
        </div>
      `;
    } else if (q) {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>🔍 Busca por "${searchQuery}":</span>
        </div>
        <div class="full-view-summary-val" style="color: var(--text-main);">
          ${fmtBRL(filteredGastos > 0 ? filteredGastos : filteredReceitas)} / mês
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${filtered.length} encontradas)
          </span>
        </div>
      `;
    } else {
      summaryBox.classList.add('hidden');
    }

    // Render list
    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px 10px;">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔁</span>
          <strong>Nenhuma conta recorrente encontrada</strong>
          <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
            Tente alterar os filtros ou a busca acima.
          </div>
        </div>
      `;
    } else {
      listContainer.innerHTML = `
        <div class="full-rec-list">
          ${filtered
            .map((r) => {
              const isIncome = r.tipo === 'salario' || r.tipo === 'freelance';
              const icon = r.subcategoria ? getCategoryIcon(r.subcategoria) : (isIncome ? '💰' : '🔁');
              return `
              <div class="full-rec-card">
                <div class="full-rec-left">
                  <div class="full-rec-icon">${icon}</div>
                  <div>
                    <strong class="full-rec-title">${r.desc}</strong>
                    <div class="full-rec-meta">
                      <span class="recurring-day-pill">📅 Vence todo dia ${r.diaVencimento}</span>
                      <span class="tag ${TAG_CLASSES[r.tipo] || 'tag-contafixa'}">
                        ${TAG_LABELS[r.tipo] || r.tipo}
                      </span>
                      ${
                        r.subcategoria
                          ? `<span class="category-sub-pill">${icon} ${r.subcategoria}</span>`
                          : ''
                      }
                    </div>
                  </div>
                </div>
                <div class="full-rec-right">
                  <strong class="full-rec-val" style="color: ${isIncome ? 'var(--green)' : 'var(--text-main)'};">
                    ${isIncome ? '+' : '-'} ${fmtBRL(r.valor)}
                  </strong>
                  <button class="btn-del btn-modal-del-rec" data-id="${r.id}" title="Excluir regra de recorrência">✕</button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;
    }

    // Update footer count
    footerCount.innerHTML = `Exibindo <strong>${filtered.length}</strong> de <strong>${list.length}</strong> regras recorrentes`;

    // Rebind deletion buttons
    listContainer.querySelectorAll('.btn-modal-del-rec').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        await finance.deleteRecurring(userEmail, id);
        showToast('Regra de recorrência removida.', 'info');
        refreshData();
        if (onDataChanged) onDataChanged();
      });
    });
  }

  function refreshData() {
    list = finance.getRecurring(userEmail) || [];
    const updatedTotals = calculateTotals();

    // Update top KPI cards
    kpisGrid.innerHTML = `
      <div class="full-view-kpi-item">
        <span class="lbl">💵 Salário / Renda Prevista</span>
        <strong style="color: var(--green);">${fmtBRL(updatedTotals.totalReceitas)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">📑 Custo Mensal Fixo (A Pagar)</span>
        <strong style="color: var(--red);">${fmtBRL(updatedTotals.totalCustosFixos)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">✨ Saldo Livre Previsto</span>
        <strong style="color: ${updatedTotals.saldoPrevisto >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(updatedTotals.saldoPrevisto)} <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
      </div>
    `;

    // Update pill labels
    pillsContainer.querySelectorAll('.filter-pill-btn').forEach((btn) => {
      const f = btn.dataset.filter;
      if (f === 'all') btn.textContent = `Todos (${list.length})`;
      else if (f === 'gastos') btn.textContent = `📑 Custo Fixo / A Pagar (${updatedTotals.custosFixos.length})`;
      else if (f === 'receitas') btn.textContent = `💵 Salário / Entradas (${updatedTotals.receitas.length})`;
      else if (f === 'contafixa') btn.textContent = `Contas Fixas (${updatedTotals.contafixaCount})`;
      else if (f === 'investimento') btn.textContent = `Investimentos (${updatedTotals.investimentoCount})`;
    });

    updateFilteredView();
  }

  // Bind Listeners
  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-rec-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-footer-close-rec').addEventListener('click', closeModal);

  // Search input without flicker
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    updateFilteredView();
  });

  // Category filter select
  catSelect.addEventListener('change', (e) => {
    activeCategoryFilter = e.target.value;
    updateFilteredView();
  });

  // Filter pills
  pillsContainer.querySelectorAll('.filter-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      pillsContainer.querySelectorAll('.filter-pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      updateFilteredView();
    });
  });

  // Initial render of filtered list
  updateFilteredView();
}
