/**
 * Full Transactions Modal Component
 * Displays complete list of transactions for any month with search,
 * type filtering, category filtering, summary KPIs, and deletion.
 */

import {
  finance,
  fmtBRL,
  fmtCurrencyTx,
  curMonthKey,
  monthLabel,
  TAG_CLASSES,
  TAG_LABELS,
  getCategoryIcon
} from '../services/finance.js';
import { openTransactionEditModal } from './transactionEditModal.js';
import { showToast } from './toast.js';

export function openTransactionsModal(user, targetMonth = curMonthKey(), onDataChanged) {
  const existing = document.getElementById('transactions-full-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  let activeTypeFilter = 'all';
  let searchQuery = '';

  const modal = document.createElement('div');
  modal.id = 'transactions-full-modal';
  modal.className = 'badge-modal-backdrop';

  function renderModalBody() {
    const kpis = finance.calculateMonthKPIs(userEmail, targetMonth);
    let list = kpis.transactions;

    if (activeTypeFilter !== 'all') {
      list = list.filter((t) => t.tipo === activeTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          (t.desc && t.desc.toLowerCase().includes(q)) ||
          (t.subcategoria && t.subcategoria.toLowerCase().includes(q))
      );
    }

    const totalFiltered = list.reduce(
      (sum, t) => sum + (t.tipo === 'salario' ? t.valor : -t.valor),
      0
    );

    const typeCounts = {
      all: kpis.transactions.length,
      salario: kpis.transactions.filter((t) => t.tipo === 'salario').length,
      freelance: kpis.transactions.filter((t) => t.tipo === 'freelance').length,
      contafixa: kpis.transactions.filter((t) => t.tipo === 'contafixa').length,
      gasto: kpis.transactions.filter((t) => t.tipo === 'gasto').length,
      investimento: kpis.transactions.filter((t) => t.tipo === 'investimento').length
    };

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
        <div class="full-view-kpis">
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

        <!-- Controls: Search & Type Filter Tabs -->
        <div class="full-view-controls">
          <div class="full-view-search-wrap">
            <span class="search-icon">🔍</span>
            <input 
              id="tx-modal-search" 
              type="text" 
              class="input full-view-search-input" 
              placeholder="Buscar por descrição ou categoria..."
              value="${searchQuery}"
            >
          </div>

          <div class="full-view-filter-pills">
            <button class="filter-pill-btn ${activeTypeFilter === 'all' ? 'active' : ''}" data-type="all">
              Todos (${typeCounts.all})
            </button>
            <button class="filter-pill-btn ${activeTypeFilter === 'salario' ? 'active' : ''}" data-type="salario">
              Salário (${typeCounts.salario})
            </button>
            <button class="filter-pill-btn ${activeTypeFilter === 'freelance' ? 'active' : ''}" data-type="freelance">
              Free Lancer (${typeCounts.freelance})
            </button>
            <button class="filter-pill-btn ${activeTypeFilter === 'contafixa' ? 'active' : ''}" data-type="contafixa">
              Conta Fixa (${typeCounts.contafixa})
            </button>
            <button class="filter-pill-btn ${activeTypeFilter === 'gasto' ? 'active' : ''}" data-type="gasto">
              Variável (${typeCounts.gasto})
            </button>
            <button class="filter-pill-btn ${activeTypeFilter === 'investimento' ? 'active' : ''}" data-type="investimento">
              Investimento (${typeCounts.investimento})
            </button>
          </div>
        </div>

        <!-- Transaction List Body -->
        <div class="full-view-table-container">
          ${
            list.length === 0
              ? `
            <div class="empty-state" style="padding: 40px 10px;">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔍</span>
              <strong>Nenhum lançamento encontrado</strong>
              <div style="font-size: 12px; margin-top: 4px;">Tente alterar os filtros ou a busca acima.</div>
            </div>
          `
              : `
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
          `
          }
        </div>

        <!-- Modal Footer -->
        <div class="full-view-footer">
          <div style="font-size: 12.5px; color: var(--text-muted);">
            Exibindo <strong>${list.length}</strong> de <strong>${kpis.transactions.length}</strong> lançamentos
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-footer-close-tx">Fechar</button>
        </div>
      </div>
    `;

    // Bind events
    const btnClose = modal.querySelector('#btn-close-tx-modal');
    if (btnClose) btnClose.addEventListener('click', () => modal.remove());

    const btnFooterClose = modal.querySelector('#btn-footer-close-tx');
    if (btnFooterClose) btnFooterClose.addEventListener('click', () => modal.remove());

    const searchInput = modal.querySelector('#tx-modal-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderModalBody();
        const nextInput = modal.querySelector('#tx-modal-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    modal.querySelectorAll('.filter-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTypeFilter = btn.dataset.type;
        renderModalBody();
      });
    });

    modal.querySelectorAll('.btn-modal-edit-tx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        const tx = list.find((item) => item.id === id || item.id === btn.dataset.id);
        if (tx) {
          openTransactionEditModal(user, tx, () => {
            if (onDataChanged) onDataChanged();
            renderModalBody();
          });
        }
      });
    });

    modal.querySelectorAll('.btn-modal-del-tx').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        await finance.deleteTransaction(userEmail, id);
        showToast('Lançamento removido.', 'info');
        if (onDataChanged) onDataChanged();
        renderModalBody();
      });
    });
  }

  renderModalBody();
  document.body.appendChild(modal);
}
