/**
 * Dashboard Component
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
import { pwa } from '../services/pwa.js';
import { showToast } from './toast.js';

let historyChartInstance = null;

export function renderDashboard(container, user, onDataChanged) {
  const userEmail = user.email;
  const kpis = finance.calculateMonthKPIs(userEmail, curMonthKey());
  const recorrentes = finance.getRecurring(userEmail);
  const monthlyHistory = finance.getMonthlyHistory(userEmail, 6);

  const showPwaBanner = !pwa.isStandalone();

  container.innerHTML = `
    <div id="tab-dash">
      ${
        showPwaBanner
          ? `
        <div id="pwa-banner" class="pwa-install-banner hidden">
          <div class="pwa-install-banner-text">
            <span class="icon">📲</span>
            <div>
              <strong>Instale o app no seu dispositivo</strong>
              <div style="font-size: 12px; font-weight: 400; color: var(--text-muted);">Acesse direto da sua tela inicial, rápido e sem barra de navegação.</div>
            </div>
          </div>
          <button id="btn-banner-install" class="btn btn-primary btn-sm">Instalar</button>
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

      <!-- 2-Column Grid -->
      <div class="dashboard-grid">
        <!-- Left: Form & Transactions -->
        <div>
          <!-- New Transaction Form -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title-row">
              <h3>➕ Novo Lançamento</h3>
            </div>
            <form id="form-add-tx">
              <div class="form-row">
                <div>
                  <label for="tx-tipo">Tipo</label>
                  <select id="tx-tipo" class="input">
                    <option value="salario">Salário / Renda</option>
                    <option value="contafixa">Conta Fixa</option>
                    <option value="gasto" selected>Gasto Variável</option>
                    <option value="investimento">Investimento</option>
                  </select>
                </div>
                <div>
                  <label for="tx-data">Data</label>
                  <input id="tx-data" type="date" class="input" value="${todayKey()}" required>
                </div>
              </div>

              <div class="form-row">
                <div>
                  <label for="tx-desc">Descrição</label>
                  <input id="tx-desc" type="text" class="input" placeholder="Ex: Supermercado, Aluguel..." required>
                </div>
                <div>
                  <label for="tx-valor">Valor (R$)</label>
                  <input id="tx-valor" type="number" step="0.01" min="0.01" class="input" placeholder="0,00" required>
                </div>
              </div>

              <div class="form-row" id="row-subcategoria">
                <div>
                  <label for="tx-subcat">Categoria</label>
                  <select id="tx-subcat" class="input">
                    ${CATEGORIES.gasto.map((c) => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
                <div></div>
              </div>

              <div class="check-row">
                <input type="checkbox" id="tx-recorrente">
                <label for="tx-recorrente">Conta recorrente (repete automaticamente todo mês)</label>
              </div>

              <div class="form-row hidden" id="row-vencimento">
                <div>
                  <label for="tx-vencimento">Dia do vencimento (1 a 31)</label>
                  <input id="tx-vencimento" type="number" min="1" max="31" class="input" placeholder="Ex: 10">
                </div>
                <div></div>
              </div>

              <button type="submit" class="btn btn-primary btn-block">
                Adicionar Lançamento
              </button>
            </form>
          </div>

          <!-- Recurring Accounts -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title-row">
              <h3>🔁 Contas Recorrentes Automáticas</h3>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${recorrentes.length} ativas</span>
            </div>
            <div id="recurring-list">
              ${
                recorrentes.length === 0
                  ? `<div class="empty-state">Nenhuma conta recorrente cadastrada. Ao cadastrar contas fixas como água, luz ou assinaturas com recorrência, elas aparecem automaticamente em todo novo mês!</div>`
                  : recorrentes
                      .map(
                        (r) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13.5px;">
                      <div>
                        <strong>${r.desc}</strong>
                        <div style="font-size: 12px; color: var(--text-muted);">Todo dia ${r.diaVencimento} · ${TAG_LABELS[r.tipo] || r.tipo}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <strong style="color: var(--text-main);">${fmtBRL(r.valor)}</strong>
                        <button class="btn-del btn-del-rec" data-id="${r.id}" title="Excluir regra de recorrência">✕</button>
                      </div>
                    </div>
                  `
                      )
                      .join('')
              }
            </div>
          </div>

          <!-- Month Transactions -->
          <div class="card">
            <div class="card-title-row">
              <h3>📝 Lançamentos deste Mês</h3>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${kpis.transactions.length} registros</span>
            </div>
            ${
              kpis.transactions.length === 0
                ? `<div class="empty-state">Nenhum lançamento adicionado neste mês. Use o formulário acima para registrar.</div>`
                : `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th style="width: 32px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${kpis.transactions
                      .map(
                        (t) => `
                      <tr>
                        <td>${t.data.split('-').reverse().join('/')}</td>
                        <td>
                          <strong>${t.desc}</strong>
                          ${t.subcategoria ? `<div style="font-size: 11px; color: var(--text-muted);">${t.subcategoria}</div>` : ''}
                        </td>
                        <td><span class="tag ${TAG_CLASSES[t.tipo] || 'tag-gasto'}">${TAG_LABELS[t.tipo] || t.tipo}</span></td>
                        <td style="font-weight: 700; color: ${t.tipo === 'salario' ? 'var(--green)' : 'var(--text-main)'};">
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

        <!-- Right: Charts & Monthly Summary -->
        <div>
          <!-- Chart -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title-row">
              <h3>📊 Histórico Comparativo</h3>
            </div>
            <div class="chart-wrap">
              <canvas id="monthlyChart"></canvas>
            </div>
          </div>

          <!-- Monthly Aggregates Table -->
          <div class="card">
            <div class="card-title-row">
              <h3>📅 Resumo dos Últimos Meses</h3>
            </div>
            <div class="table-wrap">
              <table>
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
                          <td style="color: var(--green); font-weight: 600;">${fmtBRL(m.receita)}</td>
                          <td style="color: var(--red); font-weight: 600;">${fmtBRL(m.despesa)}</td>
                          <td style="color: ${m.saldo >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight: 700;">
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

  // PWA banner installation
  const pwaBanner = container.querySelector('#pwa-banner');
  if (pwaBanner) {
    pwa.onInstallAvailabilityChange((available) => {
      if (available && !pwa.isStandalone()) {
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

  // Add transaction submit
  const formAdd = container.querySelector('#form-add-tx');
  formAdd.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = selectTipo.value;
    const data = container.querySelector('#tx-data').value;
    const desc = container.querySelector('#tx-desc').value.trim();
    const valor = container.querySelector('#tx-valor').value;
    const subcategoria = !rowSubcat.classList.contains('hidden') ? selectSubcat.value : '';
    const recorrente = checkRecorrente.checked;
    const diaVencimento = container.querySelector('#tx-vencimento')?.value;

    try {
      finance.addTransaction(userEmail, {
        tipo,
        data,
        desc,
        valor,
        subcategoria,
        recorrente,
        diaVencimento
      });
      showToast('Lançamento adicionado com sucesso!', 'success');
      onDataChanged();
    } catch (err) {
      showToast(err.message || 'Erro ao adicionar', 'error');
    }
  });

  // Delete transaction buttons
  container.querySelectorAll('.btn-del-tx').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      finance.deleteTransaction(userEmail, id);
      showToast('Lançamento removido.', 'info');
      onDataChanged();
    });
  });

  // Delete recurring rule buttons
  container.querySelectorAll('.btn-del-rec').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      finance.deleteRecurring(userEmail, id);
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
              font: { family: 'Inter', size: 12, weight: 600 }
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
