/**
 * Full Transactions Modal Component
 * Displays complete list of transactions for any month with smooth search (no flickering),
 * type/nature filtering, category filtering (based on Novo Lançamento), summary KPIs, and deletion.
 */

import {
  finance,
  fmtBRL,
  fmtCurrencyTx,
  getBRLValue,
  curMonthKey,
  monthLabel,
  TAG_CLASSES,
  TAG_LABELS,
  CATEGORIES,
  getCategoryIcon
} from '../services/finance.js';
import { openTransactionEditModal } from './transactionEditModal.js';
import { showToast } from './toast.js';

export function openTransactionsModal(user, targetMonth = curMonthKey(), onDataChanged) {
  const existing = document.getElementById('transactions-full-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  let activeTypeFilter = 'all';
  let activeCategoryFilter = 'all';
  let searchQuery = '';

  const modal = document.createElement('div');
  modal.id = 'transactions-full-modal';
  modal.className = 'badge-modal-backdrop';

  // Get initial KPIs & transactions
  let kpis = finance.calculateMonthKPIs(userEmail, targetMonth);
  let allTransactions = kpis.transactions || [];

  // Collect any custom categories already in this month's transactions
  const standardCats = new Set([...CATEGORIES.gasto, ...CATEGORIES.investimento]);
  const extraCategories = [];
  allTransactions.forEach((t) => {
    if (t.subcategoria && !standardCats.has(t.subcategoria) && !extraCategories.includes(t.subcategoria)) {
      extraCategories.push(t.subcategoria);
    }
  });

  // Calculate type counts
  function getTypeCounts() {
    return {
      all: allTransactions.length,
      gastos: allTransactions.filter((t) => t.tipo === 'gasto' || t.tipo === 'contafixa').length,
      adicoes: allTransactions.filter((t) => t.tipo === 'salario' || t.tipo === 'freelance').length,
      contafixa: allTransactions.filter((t) => t.tipo === 'contafixa').length,
      gasto: allTransactions.filter((t) => t.tipo === 'gasto').length,
      investimento: allTransactions.filter((t) => t.tipo === 'investimento').length,
      salario: allTransactions.filter((t) => t.tipo === 'salario').length,
      freelance: allTransactions.filter((t) => t.tipo === 'freelance').length
    };
  }

  const typeCounts = getTypeCounts();

  // Render initial static modal shell (Created ONCE - input is NEVER destroyed on typing)
  modal.innerHTML = `
    <div class="full-view-modal-card">
      <!-- Modal Header -->
      <div class="full-view-header">
        <div>
          <div class="full-view-kicker">DETALHES COMPLETOS</div>
          <h3 class="full-view-title">📝 Lançamentos de ${monthLabel(targetMonth)}</h3>
        </div>
        <button class="badge-modal-close" id="btn-close-tx-modal" title="Fechar">✕</button>
      </div>

      <!-- KPI Mini Grid -->
      <div class="full-view-kpis" id="tx-modal-kpis-grid">
        <div class="full-view-kpi-item">
          <span class="lbl">Receitas</span>
          <strong style="color: var(--green);">${fmtBRL(kpis.receita)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">Fixas</span>
          <strong style="color: var(--red);">${fmtBRL(kpis.contafixa || 0)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">Variáveis</span>
          <strong style="color: var(--amber);">${fmtBRL(kpis.gastoVariavel || 0)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">Investido</span>
          <strong style="color: var(--purple);">${fmtBRL(kpis.invest)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">Saldo Líquido</span>
          <strong style="color: ${kpis.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(kpis.saldo)}</strong>
        </div>
      </div>

      <!-- Controls: Search, Type Filter Tabs & Category Filter -->
      <div class="full-view-controls">
        <div class="full-view-search-wrap">
          <span class="search-icon">🔍</span>
          <input 
            id="tx-modal-search" 
            type="text" 
            class="input full-view-search-input" 
            placeholder="Buscar por descrição ou categoria..."
            value=""
            autocomplete="off"
          >
        </div>

        <div class="full-view-filter-pills" id="tx-modal-type-pills">
          <button class="filter-pill-btn active" data-type="all">
            Todos (${typeCounts.all})
          </button>
          <button class="filter-pill-btn" data-type="gastos">
            💸 Gastos (${typeCounts.gastos})
          </button>
          <button class="filter-pill-btn" data-type="adicoes">
            💰 Adições (${typeCounts.adicoes})
          </button>
          <button class="filter-pill-btn" data-type="contafixa">
            Conta Fixa (${typeCounts.contafixa})
          </button>
          <button class="filter-pill-btn" data-type="gasto">
            Variável (${typeCounts.gasto})
          </button>
          <button class="filter-pill-btn" data-type="investimento">
            Investimento (${typeCounts.investimento})
          </button>
          <button class="filter-pill-btn" data-type="salario">
            Salário (${typeCounts.salario})
          </button>
          <button class="filter-pill-btn" data-type="freelance">
            Freelancer (${typeCounts.freelance})
          </button>
        </div>

        <div class="full-view-filter-row">
          <div class="full-view-cat-wrap">
            <select id="tx-modal-cat-filter" class="input full-view-cat-select">
              <option value="all">🏷️ Todas as Categorias (Filtro por Categoria)</option>
              <optgroup label="Categorias de Gastos e Contas Fixas">
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
                <optgroup label="Outras Categorias Registradas">
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

        <!-- Dynamic Category / Selection Summary Box -->
        <div id="tx-modal-summary-box" class="full-view-summary-box hidden"></div>
      </div>

      <!-- Transaction List Body -->
      <div class="full-view-table-container" id="tx-modal-table-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Modal Footer -->
      <div class="full-view-footer">
        <div id="tx-modal-footer-count" style="font-size: 12.5px; color: var(--text-muted);">
          Exibindo <strong>${allTransactions.length}</strong> de <strong>${allTransactions.length}</strong> lançamentos
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-footer-close-tx">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // DOM references
  const searchInput = modal.querySelector('#tx-modal-search');
  const catSelect = modal.querySelector('#tx-modal-cat-filter');
  const pillsContainer = modal.querySelector('#tx-modal-type-pills');
  const tableContainer = modal.querySelector('#tx-modal-table-container');
  const summaryBox = modal.querySelector('#tx-modal-summary-box');
  const footerCount = modal.querySelector('#tx-modal-footer-count');
  const kpisGrid = modal.querySelector('#tx-modal-kpis-grid');

  function updateFilteredView() {
    let list = [...allTransactions];

    // 1. Filter by Type / Nature
    if (activeTypeFilter === 'gastos') {
      list = list.filter((t) => t.tipo === 'gasto' || t.tipo === 'contafixa');
    } else if (activeTypeFilter === 'adicoes') {
      list = list.filter((t) => t.tipo === 'salario' || t.tipo === 'freelance');
    } else if (activeTypeFilter !== 'all') {
      list = list.filter((t) => t.tipo === activeTypeFilter);
    }

    // 2. Filter by Category
    if (activeCategoryFilter !== 'all') {
      list = list.filter((t) => {
        const itemCat = t.subcategoria || (t.tipo === 'contafixa' ? 'Moradia' : (t.tipo === 'salario' ? 'Salário / Renda' : 'Outros'));
        return itemCat === activeCategoryFilter || t.subcategoria === activeCategoryFilter;
      });
    }

    // 3. Filter by Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.desc && t.desc.toLowerCase().includes(q)) ||
          (t.subcategoria && t.subcategoria.toLowerCase().includes(q)) ||
          (TAG_LABELS[t.tipo] && TAG_LABELS[t.tipo].toLowerCase().includes(q))
      );
    }

    // Calculate totals for the filtered subset
    let filteredGastos = 0;
    let filteredReceitas = 0;
    list.forEach((t) => {
      const val = getBRLValue(t.valor, t.moeda);
      if (t.tipo === 'salario' || t.tipo === 'freelance') {
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
          <span>Total na categoria <strong>${activeCategoryFilter}</strong> no mês:</span>
        </div>
        <div class="full-view-summary-val" style="color: ${isIncomeCategory ? 'var(--green)' : 'var(--red)'};">
          ${fmtBRL(totalDisplay)}
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${list.length} ${list.length === 1 ? 'lançamento' : 'lançamentos'})
          </span>
        </div>
      `;
    } else if (activeTypeFilter === 'gastos') {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>💸 Total de Gastos (Fixos + Variáveis):</span>
        </div>
        <div class="full-view-summary-val" style="color: var(--red);">
          ${fmtBRL(filteredGastos)}
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${list.length} lançamentos)
          </span>
        </div>
      `;
    } else if (activeTypeFilter === 'adicoes') {
      summaryBox.classList.remove('hidden');
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>💰 Total de Adições / Entradas:</span>
        </div>
        <div class="full-view-summary-val" style="color: var(--green);">
          ${fmtBRL(filteredReceitas)}
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${list.length} lançamentos)
          </span>
        </div>
      `;
    } else if (q) {
      summaryBox.classList.remove('hidden');
      const net = filteredReceitas - filteredGastos;
      summaryBox.innerHTML = `
        <div class="full-view-summary-title">
          <span>🔍 Busca por "${searchQuery}":</span>
        </div>
        <div class="full-view-summary-val" style="color: ${net >= 0 ? 'var(--green)' : 'var(--red)'};">
          ${fmtBRL(Math.abs(net))} ${net >= 0 ? '(Entrada líquida)' : '(Saída)'}
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">
            (${list.length} encontrados)
          </span>
        </div>
      `;
    } else {
      summaryBox.classList.add('hidden');
    }

    // Render Table Body
    if (list.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px 10px;">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔍</span>
          <strong>Nenhum lançamento encontrado</strong>
          <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
            Tente alterar os filtros de tipo, categoria ou o termo de busca acima.
          </div>
        </div>
      `;
    } else {
      tableContainer.innerHTML = `
        <table class="dash-table full-tx-table">
          <thead>
            <tr>
              <th style="width: 85px;">Data</th>
              <th>Descrição</th>
              <th>Categoria / Tipo</th>
              <th style="text-align: right;">Valor</th>
              <th style="width: 60px; text-align: right;"></th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((t) => {
                const isIncome = t.tipo === 'salario' || t.tipo === 'freelance';
                const icon = t.subcategoria ? getCategoryIcon(t.subcategoria) : (isIncome ? '💰' : '📦');
                return `
                <tr>
                  <td style="white-space: nowrap; font-size: 12px; color: var(--text-muted); font-weight: 600;">
                    ${t.data.split('-').reverse().join('/')}
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">
                      ${t.desc}
                    </div>
                    ${t.recorrenteId ? `<span class="recurring-pill">🔁 Recorrente</span>` : ''}
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span class="tag ${TAG_CLASSES[t.tipo] || 'tag-gasto'}">
                        ${TAG_LABELS[t.tipo] || t.tipo}
                      </span>
                      ${
                        t.moeda && t.moeda !== 'BRL'
                          ? `<span class="wallet-currency-pill ${t.moeda === 'USD' ? 'dollar' : 'eur'}" style="font-size: 9.5px; padding: 1px 5px;">${t.moeda}</span>`
                          : ''
                      }
                      ${
                        t.subcategoria
                          ? `<span class="category-sub-pill">${icon} ${t.subcategoria}</span>`
                          : ''
                      }
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 800; font-size: 13.5px; white-space: nowrap; color: ${isIncome ? 'var(--green)' : 'var(--text-main)'};">
                    ${isIncome ? '+' : '-'} ${fmtCurrencyTx(t.valor, t.moeda)}
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn-action-icon btn-modal-edit-tx" data-id="${t.id}" title="Editar lançamento" style="margin-right: 4px;">✏️</button>
                    <button class="btn-del btn-modal-del-tx" data-id="${t.id}" title="Excluir lançamento">✕</button>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }

    // Update Footer Count
    footerCount.innerHTML = `Exibindo <strong>${list.length}</strong> de <strong>${allTransactions.length}</strong> lançamentos`;

    // Rebind table item actions
    tableContainer.querySelectorAll('.btn-modal-edit-tx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        const tx = allTransactions.find((item) => item.id === id || String(item.id) === String(btn.dataset.id));
        if (tx) {
          openTransactionEditModal(user, tx, () => {
            refreshData();
            if (onDataChanged) onDataChanged();
          });
        }
      });
    });

    tableContainer.querySelectorAll('.btn-modal-del-tx').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        await finance.deleteTransaction(userEmail, id);
        showToast('Lançamento removido.', 'info');
        refreshData();
        if (onDataChanged) onDataChanged();
      });
    });
  }

  function refreshData() {
    kpis = finance.calculateMonthKPIs(userEmail, targetMonth);
    allTransactions = kpis.transactions || [];

    // Update Top KPIs Grid
    kpisGrid.innerHTML = `
      <div class="full-view-kpi-item">
        <span class="lbl">Receitas</span>
        <strong style="color: var(--green);">${fmtBRL(kpis.receita)}</strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">Fixas</span>
        <strong style="color: var(--red);">${fmtBRL(kpis.contafixa || 0)}</strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">Variáveis</span>
        <strong style="color: var(--amber);">${fmtBRL(kpis.gastoVariavel || 0)}</strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">Investido</span>
        <strong style="color: var(--purple);">${fmtBRL(kpis.invest)}</strong>
      </div>
      <div class="full-view-kpi-item">
        <span class="lbl">Saldo Líquido</span>
        <strong style="color: ${kpis.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(kpis.saldo)}</strong>
      </div>
    `;

    // Update pill counts
    const updatedCounts = getTypeCounts();
    pillsContainer.querySelectorAll('.filter-pill-btn').forEach((btn) => {
      const type = btn.dataset.type;
      const count = updatedCounts[type] !== undefined ? updatedCounts[type] : 0;
      let label = 'Todos';
      if (type === 'gastos') label = '💸 Gastos';
      else if (type === 'adicoes') label = '💰 Adições';
      else if (type === 'contafixa') label = 'Conta Fixa';
      else if (type === 'gasto') label = 'Variável';
      else if (type === 'investimento') label = 'Investimento';
      else if (type === 'salario') label = 'Salário';
      else if (type === 'freelance') label = 'Freelancer';
      btn.textContent = `${label} (${count})`;
    });

    updateFilteredView();
  }

  // Bind Listeners
  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-tx-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-footer-close-tx').addEventListener('click', closeModal);

  // Search input: ONLY updates the list, NEVER recreates the input DOM -> Eliminates blinking!
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    updateFilteredView();
  });

  // Category filter select
  catSelect.addEventListener('change', (e) => {
    activeCategoryFilter = e.target.value;
    updateFilteredView();
  });

  // Type & Nature filter pills
  pillsContainer.querySelectorAll('.filter-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      pillsContainer.querySelectorAll('.filter-pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTypeFilter = btn.dataset.type;
      updateFilteredView();
    });
  });

  // Initial render of filtered list
  updateFilteredView();
}
