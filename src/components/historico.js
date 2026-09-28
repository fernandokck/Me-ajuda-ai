/**
 * Historico & Evolucao Financeira Component
 * Deep month-over-month financial comparison, evolution analytics,
 * eliminated/added expenses tracking, category trends, and historical charts.
 */

import Chart from 'chart.js/auto';
import {
  finance,
  fmtBRL,
  fmtCurrencyTx,
  curMonthKey,
  prevMonthKey,
  monthLabel,
  TAG_CLASSES,
  TAG_LABELS,
  getCategoryIcon
} from '../services/finance.js';
import { openTransactionsModal } from './transactionsModal.js';
import { openTransactionEditModal } from './transactionEditModal.js';
import { showToast } from './toast.js';

let historyBarChartInstance = null;
let categoryPieChartInstance = null;

export function renderHistoricoView(container, user, onDataChanged) {
  const userEmail = user.email;
  const availableMonths = finance.getAllAvailableMonths(userEmail);
  
  // Default selected month is the current month
  let selectedMonth = curMonthKey();
  if (!availableMonths.includes(selectedMonth) && availableMonths.length > 0) {
    selectedMonth = availableMonths[0];
  }

  function renderView() {
    const comparison = finance.getComparisonData(userEmail, selectedMonth);
    const categoryBreakdown = finance.getCategoryBreakdown(userEmail, selectedMonth);
    const monthlyHistory = finance.getMonthlyHistory(userEmail, 12);

    const {
      curKPIs,
      prevKPIs,
      deltaDespesa,
      deltaReceita,
      deltaSaldo,
      deltaInvest,
      categoryChanges,
      eliminated,
      reduced,
      increased,
      newExpenses,
      totalSavingsFromReductions,
      totalNewCostFromIncreases
    } = comparison;

    const isEconomy = deltaDespesa <= 0;
    const isRevenueUp = deltaReceita >= 0;
    const isSaldoUp = deltaSaldo >= 0;

    container.innerHTML = `
      <div id="tab-historico" class="view-content-wrapper">
        <!-- Header & Month Selection Bar -->
        <div class="card" style="margin-bottom: 16px; background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-hover) 100%);">
          <div class="hist-header-row">
            <div>
              <div class="full-view-kicker">HISTÓRICO & EVOLUÇÃO</div>
              <h2 style="font-size: 20px; font-weight: 800; margin: 4px 0 2px; color: var(--text-main);">
                📈 Evolução Financeira
              </h2>
              <div style="font-size: 12.5px; color: var(--text-muted);">
                Acompanhe o que foi eliminado, o que aumentou e compare seus resultados mês a mês.
              </div>
            </div>

            <!-- Month Picker -->
            <div class="hist-picker-wrap">
              <label for="hist-select-month" style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                Mês de Análise
              </label>
              <select id="hist-select-month" class="input hist-month-select">
                ${availableMonths
                  .map(
                    (m) => `
                  <option value="${m}" ${m === selectedMonth ? 'selected' : ''}>
                    ${monthLabel(m)} ${m === curMonthKey() ? '(Mês Atual)' : ''}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <!-- Quick Month Pills -->
          <div class="hist-month-pills">
            ${availableMonths
              .slice(0, 5)
              .map(
                (m) => `
              <button class="hist-month-pill-btn ${m === selectedMonth ? 'active' : ''}" data-month="${m}">
                ${monthLabel(m)}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Month vs Previous Summary Cards (4 Pillars) -->
        <div class="hist-summary-grid">
          <!-- Receitas -->
          <div class="card hist-kpi-card">
            <div class="hist-kpi-head">
              <span class="hist-kpi-title">💰 Receitas</span>
              <span class="hist-delta-pill ${isRevenueUp ? 'pos' : 'neg'}">
                ${isRevenueUp ? '▲ +' : '▼ -'}${fmtBRL(Math.abs(deltaReceita))}
              </span>
            </div>
            <strong class="hist-kpi-val" style="color: var(--green);">${fmtBRL(curKPIs.receita)}</strong>
            <div class="hist-kpi-sub">
              Anterior (${comparison.prevLabel}): <strong>${fmtBRL(prevKPIs.receita)}</strong>
            </div>
          </div>

          <!-- Despesas Totais -->
          <div class="card hist-kpi-card">
            <div class="hist-kpi-head">
              <span class="hist-kpi-title" title="Despesas Totais">📉 Despesas Totais</span>
              <span class="hist-delta-pill ${isEconomy ? 'pos' : 'neg'}">
                ${isEconomy ? '▼ -' : '▲ +'}${fmtBRL(Math.abs(deltaDespesa))}
              </span>
            </div>
            <strong class="hist-kpi-val" style="color: var(--red);">${fmtBRL(curKPIs.despesa)}</strong>
            <div class="hist-kpi-sub">
              Anterior (${comparison.prevLabel}): <strong>${fmtBRL(prevKPIs.despesa)}</strong>
            </div>
          </div>

          <!-- Investimentos -->
          <div class="card hist-kpi-card">
            <div class="hist-kpi-head">
              <span class="hist-kpi-title">🌱 Investimentos</span>
              <span class="hist-delta-pill ${deltaInvest >= 0 ? 'pos' : 'neutral'}">
                ${deltaInvest >= 0 ? '▲ +' : '▼ -'}${fmtBRL(Math.abs(deltaInvest))}
              </span>
            </div>
            <strong class="hist-kpi-val" style="color: var(--purple);">${fmtBRL(curKPIs.invest)}</strong>
            <div class="hist-kpi-sub">
              Anterior (${comparison.prevLabel}): <strong>${fmtBRL(prevKPIs.invest)}</strong>
            </div>
          </div>

          <!-- Saldo Líquido -->
          <div class="card hist-kpi-card">
            <div class="hist-kpi-head">
              <span class="hist-kpi-title">📊 Saldo Líquido</span>
              <span class="hist-delta-pill ${isSaldoUp ? 'pos' : 'neg'}">
                ${isSaldoUp ? '▲ +' : '▼ -'}${fmtBRL(Math.abs(deltaSaldo))}
              </span>
            </div>
            <strong class="hist-kpi-val" style="color: ${curKPIs.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">
              ${fmtBRL(curKPIs.saldo)}
            </strong>
            <div class="hist-kpi-sub">
              Anterior (${comparison.prevLabel}): <strong>${fmtBRL(prevKPIs.saldo)}</strong>
            </div>
          </div>
        </div>

        <!-- 2-Column Grid: O Que Mudou (Eliminações & Adições) -->
        <div class="dashboard-grid" style="margin-bottom: 16px;">
          <!-- Gastos Eliminados e Reduzidos -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 style="color: var(--green); display: flex; align-items: center; gap: 6px;">
                  <span>🎉</span> Gastos Reduzidos & Eliminados
                </h3>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                  Economia conquistada vs ${comparison.prevLabel}
                </div>
              </div>
              ${
                totalSavingsFromReductions > 0
                  ? `
                <span class="hist-badge-saving">
                  +${fmtBRL(totalSavingsFromReductions)} poupados
                </span>
              `
                  : ''
              }
            </div>

            ${
              eliminated.length === 0 && reduced.length === 0
                ? `
              <div class="empty-state">
                <span style="font-size: 28px; display: block; margin-bottom: 6px;">✨</span>
                Nenhum gasto reduzido ou eliminado em relação ao mês anterior.
              </div>
            `
                : `
              <div class="hist-changes-list">
                ${eliminated
                  .map(
                    (c) => `
                  <div class="hist-change-item eliminated">
                    <div class="hist-change-left">
                      <span class="hist-change-icon">${getCategoryIcon(c.category)}</span>
                      <div>
                        <strong>${c.category}</strong>
                        <span class="hist-tag-eliminated">Zerado / Eliminado!</span>
                      </div>
                    </div>
                    <div class="hist-change-right">
                      <strong style="color: var(--green);">- ${fmtBRL(c.prevVal)}</strong>
                      <span class="hist-change-sub">Era ${fmtBRL(c.prevVal)} → R$ 0,00</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}

                ${reduced
                  .map(
                    (c) => `
                  <div class="hist-change-item reduced">
                    <div class="hist-change-left">
                      <span class="hist-change-icon">${getCategoryIcon(c.category)}</span>
                      <div>
                        <strong>${c.category}</strong>
                        <span class="hist-tag-reduced">${c.pct}% de redução</span>
                      </div>
                    </div>
                    <div class="hist-change-right">
                      <strong style="color: var(--green);">- ${fmtBRL(Math.abs(c.diff))}</strong>
                      <span class="hist-change-sub">${fmtBRL(c.prevVal)} → ${fmtBRL(c.curVal)}</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
            }
          </div>

          <!-- Novos Gastos e Aumentos -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 style="color: var(--amber); display: flex; align-items: center; gap: 6px;">
                  <span>⚠️</span> Novos Gastos & Aumentos
                </h3>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                  Aumentos e novas despesas vs ${comparison.prevLabel}
                </div>
              </div>
              ${
                totalNewCostFromIncreases > 0
                  ? `
                <span class="hist-badge-increase">
                  +${fmtBRL(totalNewCostFromIncreases)} a mais
                </span>
              `
                  : ''
              }
            </div>

            ${
              newExpenses.length === 0 && increased.length === 0
                ? `
              <div class="empty-state">
                <span style="font-size: 28px; display: block; margin-bottom: 6px;">🛡️</span>
                Nenhum aumento de despesa registrado em relação ao mês anterior!
              </div>
            `
                : `
              <div class="hist-changes-list">
                ${newExpenses
                  .map(
                    (c) => `
                  <div class="hist-change-item new-exp">
                    <div class="hist-change-left">
                      <span class="hist-change-icon">${getCategoryIcon(c.category)}</span>
                      <div>
                        <strong>${c.category}</strong>
                        <span class="hist-tag-new">Novo neste mês</span>
                      </div>
                    </div>
                    <div class="hist-change-right">
                      <strong style="color: var(--red);">+ ${fmtBRL(c.curVal)}</strong>
                      <span class="hist-change-sub">Antes: R$ 0,00</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}

                ${increased
                  .map(
                    (c) => `
                  <div class="hist-change-item increased">
                    <div class="hist-change-left">
                      <span class="hist-change-icon">${getCategoryIcon(c.category)}</span>
                      <div>
                        <strong>${c.category}</strong>
                        <span class="hist-tag-increased">+${c.pct}% de aumento</span>
                      </div>
                    </div>
                    <div class="hist-change-right">
                      <strong style="color: var(--red);">+ ${fmtBRL(c.diff)}</strong>
                      <span class="hist-change-sub">${fmtBRL(c.prevVal)} → ${fmtBRL(c.curVal)}</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
            }
          </div>
        </div>

        <!-- Category Comparison & Trend Bars -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title-row">
            <div>
              <h3>📋 Comparativo Detalhado por Categoria</h3>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ${monthLabel(selectedMonth)} vs ${comparison.prevLabel}
              </div>
            </div>
          </div>

          ${
            categoryChanges.length === 0
              ? `<div class="empty-state">Nenhum gasto por categoria registrado nos meses comparados.</div>`
              : `
            <div class="hist-cat-bars-grid">
              ${categoryChanges
                .map((c) => {
                  const maxVal = Math.max(c.curVal, c.prevVal, 1);
                  const curPct = Math.round((c.curVal / maxVal) * 100);
                  const prevPct = Math.round((c.prevVal / maxVal) * 100);

                  let badgeColor = 'var(--text-muted)';
                  let badgeText = 'Sem alteração';
                  if (c.diff < 0) {
                    badgeColor = 'var(--green)';
                    badgeText = `▼ -${fmtBRL(Math.abs(c.diff))} (${Math.abs(c.pct)}%)`;
                  } else if (c.diff > 0) {
                    badgeColor = 'var(--red)';
                    badgeText = `▲ +${fmtBRL(c.diff)} (+${c.pct}%)`;
                  }

                  return `
                  <div class="hist-cat-compare-card">
                    <div class="hist-cat-compare-head">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${getCategoryIcon(c.category)}</span>
                        <strong style="font-size: 14px;">${c.category}</strong>
                      </div>
                      <span class="hist-cat-pill" style="color: ${badgeColor}; border: 1px solid ${badgeColor}33; background: ${badgeColor}12;">
                        ${badgeText}
                      </span>
                    </div>

                    <!-- Bars for current vs previous -->
                    <div class="hist-bar-group">
                      <div class="hist-bar-row">
                        <span class="hist-bar-lbl">${monthLabel(selectedMonth)}</span>
                        <div class="hist-bar-track">
                          <div class="hist-bar-fill cur" style="width: ${curPct}%;"></div>
                        </div>
                        <strong class="hist-bar-val">${fmtBRL(c.curVal)}</strong>
                      </div>

                      <div class="hist-bar-row">
                        <span class="hist-bar-lbl">${comparison.prevLabel}</span>
                        <div class="hist-bar-track">
                          <div class="hist-bar-fill prev" style="width: ${prevPct}%;"></div>
                        </div>
                        <strong class="hist-bar-val" style="color: var(--text-muted);">${fmtBRL(c.prevVal)}</strong>
                      </div>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>

        <!-- 2 Charts: Multi-Month Evolution & Category Breakdown -->
        <div class="dashboard-grid" style="margin-bottom: 16px;">
          <!-- Multi-Month Evolution Chart -->
          <div class="card">
            <div class="card-title-row">
              <h3>📊 Histórico dos Últimos Meses</h3>
            </div>
            <div class="chart-wrap" style="height: 250px;">
              <canvas id="histMultiMonthChart"></canvas>
            </div>
          </div>

          <!-- Category Doughnut Chart for Selected Month -->
          <div class="card">
            <div class="card-title-row">
              <h3>🍩 Distribuição de Gastos (${monthLabel(selectedMonth)})</h3>
            </div>
            <div class="chart-wrap" style="height: 250px;">
              <canvas id="histCategoryChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Complete Transactions of Selected Month -->
        <div class="card">
          <div class="card-title-row">
            <div>
              <h3>📝 Lançamentos do Mês (${monthLabel(selectedMonth)})</h3>
              <div style="font-size: 11.5px; color: var(--text-muted);">
                ${curKPIs.transactions.length} registros cadastrados
              </div>
            </div>
            <button id="btn-open-full-tx-hist" class="btn btn-secondary btn-xs">
              🔍 Ver Detalhes / Filtros
            </button>
          </div>

          ${
            curKPIs.transactions.length === 0
              ? `<div class="empty-state">Nenhum lançamento registrado no mês selecionado.</div>`
              : `
            <div class="table-wrap dash-scrollable-table">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo / Categoria</th>
                    <th style="text-align: right;">Valor</th>
                    <th style="width: 58px; text-align: right;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${curKPIs.transactions
                    .map(
                      (t) => `
                    <tr>
                      <td style="white-space: nowrap; font-size: 12px; color: var(--text-muted);">${t.data.split('-').reverse().join('/')}</td>
                      <td>
                        <strong>${t.desc}</strong>
                        ${t.recorrenteId ? `<span class="recurring-pill">🔁 Recorrente</span>` : ''}
                      </td>
                      <td>
                        <span class="tag ${TAG_CLASSES[t.tipo] || 'tag-gasto'}">${TAG_LABELS[t.tipo] || t.tipo}</span>
                        ${t.moeda && t.moeda !== 'BRL' ? `<span class="wallet-currency-pill ${t.moeda === 'USD' ? 'dollar' : 'eur'}" style="font-size: 9.5px; padding: 1px 5px; margin-left: 4px;">${t.moeda}</span>` : ''}
                        ${t.subcategoria ? `<span class="category-sub-pill">${getCategoryIcon(t.subcategoria)} ${t.subcategoria}</span>` : ''}
                      </td>
                      <td style="text-align: right; font-weight: 700; white-space: nowrap; color: ${t.tipo === 'salario' || t.tipo === 'freelance' ? 'var(--green)' : 'var(--text-main)'};">
                        ${t.tipo === 'salario' || t.tipo === 'freelance' ? '+' : '-'} ${fmtCurrencyTx(t.valor, t.moeda)}
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-action-icon btn-edit-tx-hist" data-id="${t.id}" title="Editar lançamento" style="margin-right: 4px;">✏️</button>
                        <button class="btn-del btn-del-tx-hist" data-id="${t.id}" title="Excluir lançamento">✕</button>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    // Bind Month selector change
    const selectMonthEl = container.querySelector('#hist-select-month');
    if (selectMonthEl) {
      selectMonthEl.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        renderView();
      });
    }

    // Bind Quick Month pills
    container.querySelectorAll('.hist-month-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedMonth = btn.dataset.month;
        renderView();
      });
    });

    // Bind Open Full Transactions Modal
    const btnOpenFull = container.querySelector('#btn-open-full-tx-hist');
    if (btnOpenFull) {
      btnOpenFull.addEventListener('click', () => {
        openTransactionsModal(user, selectedMonth, () => {
          renderView();
          if (onDataChanged) onDataChanged();
        });
      });
    }

    // Bind Edit transaction
    container.querySelectorAll('.btn-edit-tx-hist').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        const tx = curKPIs.transactions.find((item) => item.id === id || item.id === btn.dataset.id);
        if (tx) {
          openTransactionEditModal(user, tx, () => {
            renderView();
            if (onDataChanged) onDataChanged();
          });
        }
      });
    });

    // Bind Delete transaction
    container.querySelectorAll('.btn-del-tx-hist').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        await finance.deleteTransaction(userEmail, id);
        showToast('Lançamento removido.', 'info');
        renderView();
        if (onDataChanged) onDataChanged();
      });
    });

    // Render Multi-Month Chart
    const canvasMulti = container.querySelector('#histMultiMonthChart');
    if (canvasMulti && monthlyHistory.length > 0) {
      if (historyBarChartInstance) {
        historyBarChartInstance.destroy();
      }

      const labels = monthlyHistory.map((m) => m.label);
      const receitas = monthlyHistory.map((m) => m.receita);
      const despesas = monthlyHistory.map((m) => m.despesa);
      const saldos = monthlyHistory.map((m) => m.saldo);

      historyBarChartInstance = new Chart(canvasMulti, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Receitas',
              data: receitas,
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              type: 'bar',
              label: 'Despesas',
              data: despesas,
              backgroundColor: '#ef4444',
              borderRadius: 6
            },
            {
              type: 'line',
              label: 'Saldo Líquido',
              data: saldos,
              borderColor: '#3b5bfd',
              backgroundColor: '#3b5bfd22',
              tension: 0.3,
              borderWidth: 2.5,
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'Plus Jakarta Sans, Inter', size: 11, weight: 600 }
              }
            },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${fmtBRL(item.raw)}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              ticks: { callback: (v) => 'R$ ' + v },
              grid: { color: 'rgba(150, 150, 150, 0.1)' }
            }
          }
        }
      });
    }

    // Render Category Breakdown Doughnut Chart
    const canvasCat = container.querySelector('#histCategoryChart');
    if (canvasCat) {
      if (categoryPieChartInstance) {
        categoryPieChartInstance.destroy();
      }

      if (categoryBreakdown.length > 0) {
        const catLabels = categoryBreakdown.map((c) => c.category);
        const catValues = categoryBreakdown.map((c) => c.total);
        const palette = [
          '#3b5bfd', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
        ];

        categoryPieChartInstance = new Chart(canvasCat, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [
              {
                data: catValues,
                backgroundColor: palette.slice(0, catLabels.length),
                borderWidth: 2,
                borderColor: 'var(--surface-card)'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  boxWidth: 10,
                  font: { family: 'Plus Jakarta Sans, Inter', size: 11, weight: 600 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (item) => ` ${item.label}: ${fmtBRL(item.raw)}`
                }
              }
            },
            cutout: '62%'
          }
        });
      } else {
        const ctx = canvasCat.getContext('2d');
        ctx.font = '13px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Sem gastos no mês selecionado', canvasCat.width / 2, canvasCat.height / 2);
      }
    }
  }

  renderView();
}
