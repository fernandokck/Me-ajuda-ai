/**
 * Dashboard Component with Compact Budget Goals Card and Tab Navigation
 */

import Chart from 'chart.js/auto';
import {
  finance,
  fmtBRL,
  curMonthKey,
  todayKey,
  CATEGORIES,
  TAG_CLASSES,
  TAG_LABELS
} from '../services/finance.js';
import { budgetService } from '../services/budget.js';
import { gamification } from '../services/gamification.js';
import { pwa } from '../services/pwa.js';
import { showToast } from './toast.js';
import { showBadgeModal3D } from './badgeModal.js';

let historyChartInstance = null;

export function renderDashboard(container, user, onDataChanged, onNavigateTab) {
  const userEmail = user.email;
  const kpis = finance.calculateMonthKPIs(userEmail, curMonthKey());
  const recorrentes = finance.getRecurring(userEmail);
  const monthlyHistory = finance.getMonthlyHistory(userEmail, 6);
  const budgetData = budgetService.calculateCategoryProgress(userEmail, curMonthKey());

  const showPwaBanner = !pwa.isDismissedOrInstalled();

  let budgetBarColor = 'var(--brand)';
  if (budgetData.totalPct >= 100) budgetBarColor = 'var(--red)';
  else if (budgetData.totalPct >= 80) budgetBarColor = 'var(--amber)';

  container.innerHTML = `
    <div id="tab-dash" class="view-content-wrapper">
      ${
        showPwaBanner
          ? `
        <div id="pwa-banner" class="pwa-install-banner hidden">
          <div class="pwa-install-banner-text">
            <span class="icon">📲</span>
            <div>
              <strong>Instale o app no seu iPhone ou Android</strong>
              <div style="font-size: 11.5px; font-weight: 400; color: var(--text-muted);">Acesse direto da sua tela inicial, rápido e sem barras do navegador.</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="btn-banner-install" class="btn btn-primary btn-sm">Instalar</button>
            <button id="btn-banner-dismiss" class="btn btn-ghost btn-sm" title="Dispensar">✕</button>
          </div>
        </div>
      `
          : ''
      }

      <!-- KPIs Row -->
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-icon">💰</div>
          <span class="kpi-title">Receitas do mês</span>
          <strong style="color: var(--green);">${fmtBRL(kpis.receita)}</strong>
        </div>
        <div class="kpi">
          <div class="kpi-icon" style="background: var(--red-bg); color: var(--red);">📉</div>
          <span class="kpi-title">Despesas do mês</span>
          <strong style="color: var(--red);">${fmtBRL(kpis.despesa)}</strong>
        </div>
        <div class="kpi">
          <div class="kpi-icon" style="background: var(--purple-bg); color: var(--purple);">🌱</div>
          <span class="kpi-title">Investido no mês</span>
          <strong style="color: var(--purple);">${fmtBRL(kpis.invest)}</strong>
        </div>
        <div class="kpi ${kpis.saldo >= 0 ? 'pos' : 'neg'}">
          <div class="kpi-icon" style="background: ${kpis.saldo >= 0 ? 'var(--green-bg)' : 'var(--red-bg)'}; color: ${kpis.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">📊</div>
          <span class="kpi-title">Saldo líquido</span>
          <strong>${fmtBRL(kpis.saldo)}</strong>
        </div>
      </div>

      <!-- Health Score -->
      <div class="health-box">
        <span class="health-badge" style="background: ${kpis.health.cor};">${kpis.health.badge}</span>
        <p class="health-desc">${kpis.health.text}</p>
      </div>

      <!-- 🎯 Compact Metas de Gastos Card (Clean Banner with 1-click Navigation) -->
      <div class="card compact-budget-banner" id="btn-goto-metas-dash" title="Clique para ver seu progresso de gastos do mês">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="budget-mini-icon">🎯</div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="font-size: 14.5px; color: var(--text-main);">Metas de Gastos do Mês</strong>
                <span class="budget-status-pill" style="color: ${budgetBarColor}; background: ${budgetBarColor}18; border: 1px solid ${budgetBarColor}33;">
                  ${budgetData.totalPct}% do teto
                </span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                ${fmtBRL(budgetData.totalSpent)} gastos do limite de ${fmtBRL(budgetData.totalLimit)}
              </div>
            </div>
          </div>
          <div class="compact-budget-cta">
            <span>Clique e veja seu progresso de gastos →</span>
          </div>
        </div>
        <div class="progress-bar" style="margin-top: 10px; height: 6px;">
          <div class="progress-bar-inner" style="width: ${Math.min(100, budgetData.totalPct)}%; background: ${budgetBarColor};"></div>
        </div>
      </div>

      <!-- 2-Column Responsive Dashboard Grid (Uniform on iPhone & Desktop) -->
      <div class="dashboard-grid">
        <!-- Coluna 1: Formulário e Listas -->
        <div class="dashboard-column">
          <!-- Novo Lançamento -->
          <div class="card card-dash-section">
            <div class="card-title-row">
              <h3>➕ Novo Lançamento</h3>
            </div>
            <form id="form-add-tx">
              <div class="form-row">
                <div class="form-field-wrapper">
                  <label for="tx-tipo">Tipo</label>
                  <select id="tx-tipo" class="input">
                    <option value="salario">Salário / Renda</option>
                    <option value="contafixa">Conta Fixa</option>
                    <option value="gasto" selected>Gasto Variável</option>
                    <option value="investimento">Investimento</option>
                  </select>
                </div>
                <div class="form-field-wrapper">
                  <label for="tx-data">Data</label>
                  <input id="tx-data" type="date" class="input input-date-clean" value="${todayKey()}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field-wrapper">
                  <label for="tx-desc">Descrição</label>
                  <input id="tx-desc" type="text" class="input" placeholder="Ex: Supermercado, Aluguel..." required>
                </div>
                <div class="form-field-wrapper">
                  <label for="tx-valor">Valor (R$)</label>
                  <input id="tx-valor" type="number" step="0.01" min="0.01" class="input" placeholder="0,00" required>
                </div>
              </div>

              <div class="form-row" id="row-subcategoria">
                <div class="form-field-wrapper" style="grid-column: 1 / -1;">
                  <label for="tx-subcat">Categoria</label>
                  <select id="tx-subcat" class="input">
                    ${CATEGORIES.gasto.map((c) => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="check-row">
                <input type="checkbox" id="tx-recorrente">
                <label for="tx-recorrente">Conta recorrente (repete automaticamente todo mês)</label>
              </div>

              <div class="form-row hidden" id="row-vencimento">
                <div class="form-field-wrapper" style="grid-column: 1 / -1;">
                  <label for="tx-vencimento">Dia do vencimento (1 a 31)</label>
                  <input id="tx-vencimento" type="number" min="1" max="31" class="input" placeholder="Ex: 10">
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" style="margin-top: 6px;">
                Adicionar Lançamento
              </button>
            </form>
          </div>

          <!-- Contas Recorrentes -->
          <div class="card card-dash-section">
            <div class="card-title-row">
              <h3>🔁 Contas Recorrentes</h3>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${recorrentes.length} ativas</span>
            </div>
            <div id="recurring-list" class="dash-scrollable-list">
              ${
                recorrentes.length === 0
                  ? `<div class="empty-state">Nenhuma conta recorrente. Ao cadastrar contas fixas com recorrência, elas aparecem automaticamente em todo novo mês!</div>`
                  : recorrentes
                      .map(
                        (r) => `
                    <div class="recurring-item-row">
                      <div class="recurring-item-info">
                        <strong>${r.desc}</strong>
                        <div class="recurring-item-sub">Todo dia ${r.diaVencimento} · ${TAG_LABELS[r.tipo] || r.tipo}</div>
                      </div>
                      <div class="recurring-item-action">
                        <strong style="color: var(--text-main); font-size: 13.5px;">${fmtBRL(r.valor)}</strong>
                        <button class="btn-del btn-del-rec" data-id="${r.id}" title="Excluir regra de recorrência">✕</button>
                      </div>
                    </div>
                  `
                      )
                      .join('')
              }
            </div>
          </div>

          <!-- Lançamentos do Mês -->
          <div class="card card-dash-section">
            <div class="card-title-row">
              <h3>📝 Lançamentos do Mês</h3>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${kpis.transactions.length} registros</span>
            </div>
            ${
              kpis.transactions.length === 0
                ? `<div class="empty-state">Nenhum lançamento registrado neste mês. Use o formulário acima para adicionar.</div>`
                : `
              <div class="table-wrap">
                <table class="dash-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th style="width: 28px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${kpis.transactions
                      .map(
                        (t) => `
                      <tr>
                        <td style="white-space: nowrap; font-size: 12px;">${t.data.split('-').reverse().join('/')}</td>
                        <td>
                          <strong>${t.desc}</strong>
                          ${t.subcategoria ? `<div style="font-size: 11px; color: var(--text-muted);">${t.subcategoria}</div>` : ''}
                        </td>
                        <td><span class="tag ${TAG_CLASSES[t.tipo] || 'tag-gasto'}">${TAG_LABELS[t.tipo] || t.tipo}</span></td>
                        <td style="font-weight: 700; white-space: nowrap; color: ${t.tipo === 'salario' ? 'var(--green)' : 'var(--text-main)'};">
                          ${t.tipo === 'salario' ? '+' : '-'} ${fmtBRL(t.valor)}
                        </td>
                        <td><button class="btn-del btn-del-tx" data-id="${t.id}" title="Excluir lançamento">✕</button></td>
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

        <!-- Coluna 2: Gráficos e Resumos -->
        <div class="dashboard-column">
          <!-- Histórico Comparativo (Gráfico) -->
          <div class="card card-dash-section">
            <div class="card-title-row">
              <h3>📊 Histórico Comparativo</h3>
            </div>
            <div class="chart-wrap">
              <canvas id="monthlyChart"></canvas>
            </div>
          </div>

          <!-- Resumo dos Últimos Meses -->
          <div class="card card-dash-section">
            <div class="card-title-row">
              <h3>📅 Resumo dos Últimos Meses</h3>
            </div>
            <div class="table-wrap">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    monthlyHistory.length === 0
                      ? `<tr><td colspan="4" class="empty-state">Sem dados históricos acumulados.</td></tr>`
                      : monthlyHistory
                          .slice()
                          .reverse()
                          .map(
                            (m) => `
                        <tr>
                          <td><strong>${m.label}</strong></td>
                          <td style="color: var(--green); font-weight: 600; white-space: nowrap;">${fmtBRL(m.receita)}</td>
                          <td style="color: var(--red); font-weight: 600; white-space: nowrap;">${fmtBRL(m.despesa)}</td>
                          <td style="color: ${m.saldo >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight: 700; white-space: nowrap;">
                            ${fmtBRL(m.saldo)}
                          </td>
                        </tr>
                      `
                          )
                          .join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Compact Budget card click to navigate to 'metas' tab
  const btnGotoMetas = container.querySelector('#btn-goto-metas-dash');
  if (btnGotoMetas && onNavigateTab) {
    btnGotoMetas.addEventListener('click', () => {
      onNavigateTab('metas');
    });
  }

  // PWA banner installation & dismiss
  const pwaBanner = container.querySelector('#pwa-banner');
  if (pwaBanner) {
    pwa.onInstallAvailabilityChange((available) => {
      if (available && !pwa.isDismissedOrInstalled()) {
        pwaBanner.classList.remove('hidden');
      } else {
        pwaBanner.classList.add('hidden');
      }
    });

    const btnInstallBanner = container.querySelector('#btn-banner-install');
    if (btnInstallBanner) {
      btnInstallBanner.addEventListener('click', async () => {
        await pwa.promptInstall();
      });
    }

    const btnDismissBanner = container.querySelector('#btn-banner-dismiss');
    if (btnDismissBanner) {
      btnDismissBanner.addEventListener('click', () => {
        pwa.dismissBanner();
        pwaBanner.classList.add('hidden');
      });
    }
  }

  // Form interactivity: Tipo change
  const selectTipo = container.querySelector('#tx-tipo');
  const rowSubcat = container.querySelector('#row-subcategoria');
  const selectSubcat = container.querySelector('#tx-subcat');

  selectTipo.addEventListener('change', () => {
    const val = selectTipo.value;
    if (val === 'gasto' || val === 'investimento') {
      rowSubcat.classList.remove('hidden');
      const cats = CATEGORIES[val] || [];
      selectSubcat.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join('');
    } else {
      rowSubcat.classList.add('hidden');
    }
  });

  // Recurring checkbox
  const checkRecorrente = container.querySelector('#tx-recorrente');
  const rowVencimento = container.querySelector('#row-vencimento');
  checkRecorrente.addEventListener('change', () => {
    rowVencimento.classList.toggle('hidden', !checkRecorrente.checked);
  });

  // Add transaction submit with 3D Badge Unlock & Budget Threshold Notification!
  const formAdd = container.querySelector('#form-add-tx');
  formAdd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = selectTipo.value;
    const data = container.querySelector('#tx-data').value;
    const desc = container.querySelector('#tx-desc').value.trim();
    const valor = container.querySelector('#tx-valor').value;
    const subcategoria = !rowSubcat.classList.contains('hidden') ? selectSubcat.value : '';
    const recorrente = checkRecorrente.checked;
    const diaVencimento = container.querySelector('#tx-vencimento')?.value;

    const achBefore = gamification.calculateAchievements(userEmail).achievements;

    try {
      await finance.addTransaction(userEmail, {
        tipo,
        data,
        desc,
        valor,
        subcategoria,
        recorrente,
        diaVencimento
      });
      showToast('Lançamento adicionado com sucesso!', 'success');

      // Check Budget Alert for this category
      if (tipo === 'gasto' && subcategoria) {
        budgetService.checkBudgetAlert(userEmail, subcategoria);
      }

      // Check for newly unlocked achievement
      const achAfter = gamification.calculateAchievements(userEmail).achievements;
      const newlyUnlocked = achAfter.find((a, i) => a.unlocked && !achBefore[i]?.unlocked);
      if (newlyUnlocked) {
        setTimeout(() => {
          showBadgeModal3D(newlyUnlocked, user);
        }, 400);
      }

      onDataChanged();
    } catch (err) {
      showToast(err.message || 'Erro ao adicionar', 'error');
    }
  });

  // Delete transaction buttons
  container.querySelectorAll('.btn-del-tx').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
      await finance.deleteTransaction(userEmail, id);
      showToast('Lançamento removido.', 'info');
      onDataChanged();
    });
  });

  // Delete recurring rule buttons
  container.querySelectorAll('.btn-del-rec').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
      await finance.deleteRecurring(userEmail, id);
      showToast('Regra de recorrência removida.', 'info');
      onDataChanged();
    });
  });

  // Render Chart with Chart.js
  const canvas = container.querySelector('#monthlyChart');
  if (canvas && monthlyHistory.length > 0) {
    if (historyChartInstance) {
      historyChartInstance.destroy();
    }

    const labels = monthlyHistory.map((m) => m.label);
    const receitas = monthlyHistory.map((m) => m.receita);
    const despesas = monthlyHistory.map((m) => m.despesa);

    historyChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receitas (R$)',
            data: receitas,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Despesas (R$)',
            data: despesas,
            backgroundColor: '#ef4444',
            borderRadius: 6
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
              font: { family: 'Plus Jakarta Sans, Inter', size: 12, weight: 600 }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${fmtBRL(item.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            ticks: {
              callback: (v) => 'R$ ' + v
            },
            grid: {
              color: 'rgba(150, 150, 150, 0.1)'
            }
          }
        }
      }
    });
  }
}
