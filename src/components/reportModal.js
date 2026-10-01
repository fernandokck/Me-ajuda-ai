/**
 * Executive Financial Report Generator & Modal
 * Generates a comprehensive, professional financial dossier with KPI summaries,
 * interactive/printable performance charts, category breakdowns, score radar,
 * recurring commitments, wealth allocation, and personalized AI action plan.
 */

import Chart from 'chart.js/auto';
import { finance, fmtBRL, monthKey, curMonthKey, monthLabel, prevMonthKey, getCategoryIcon } from '../services/finance.js';
import { gamification, computeLevelInfo } from '../services/gamification.js';
import { scoreEngine } from '../services/score.js';
import { budgetService } from '../services/budget.js';
import { walletService, fmtCurrency } from '../services/wallet.js';
import { showToast } from './toast.js';

let reportEvolutionChartInstance = null;
let reportCategoryChartInstance = null;
let reportScoreRadarChartInstance = null;

export function openFinancialReportModal(user) {
  const existing = document.getElementById('financial-report-modal');
  if (existing) {
    if (reportEvolutionChartInstance) {
      reportEvolutionChartInstance.destroy();
      reportEvolutionChartInstance = null;
    }
    if (reportCategoryChartInstance) {
      reportCategoryChartInstance.destroy();
      reportCategoryChartInstance = null;
    }
    if (reportScoreRadarChartInstance) {
      reportScoreRadarChartInstance.destroy();
      reportScoreRadarChartInstance = null;
    }
    existing.remove();
  }

  const userObj = user || {};
  const userEmail = (userObj.email || (typeof user === 'string' ? user : '')).trim().toLowerCase();
  const profile = gamification.getProfile(userEmail) || {};
  const badge = profile.badge || { nome: 'Iniciante', icone: '🌱', cor: '#8b5cf6', desc: 'Em início de jornada financeira.' };
  const scoreData = scoreEngine.calculateScore(userEmail);
  const achievements = gamification.calculateAchievements(userEmail);
  const levelInfo = computeLevelInfo(achievements.unlockedCount, achievements.totalCount);
  const targetMonth = curMonthKey();
  const kpis = finance.calculateMonthKPIs(userEmail, targetMonth);
  const yearlySavings = finance.calculateYearlySavingsProgress(userEmail);
  const categoryBreakdown = finance.getCategoryBreakdown(userEmail, targetMonth);
  const recurringList = finance.getRecurring(userEmail);
  const budgetData = budgetService.calculateCategoryProgress(userEmail, targetMonth);
  const wallets = walletService.getWallets(userEmail);
  const walletSummary = walletService.getSummary(userEmail);
  const allTx = finance.getTransactions(userEmail);

  // Calculate 6-month historical trajectory
  const availableMonths = finance.getAllAvailableMonths(userEmail).slice(0, 6).reverse();
  if (availableMonths.length === 0) availableMonths.push(targetMonth);

  const historyData = availableMonths.map((mKey) => {
    const mk = finance.calculateMonthKPIs(userEmail, mKey);
    return {
      month: mKey,
      label: monthLabel(mKey),
      receita: mk.receita,
      despesa: mk.despesa,
      invest: mk.invest,
      saldo: mk.saldo
    };
  });

  const now = new Date();
  const emissionDateFormatted = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const reportCode = `MAA-${now.getFullYear()}-${Math.abs(hashString(userEmail + targetMonth)).toString().slice(0, 6)}`;

  // Savings rate
  const savingsRate = kpis.receita > 0 ? ((kpis.saldo / kpis.receita) * 100).toFixed(1) : '0.0';
  const investRate = kpis.receita > 0 ? ((kpis.invest / kpis.receita) * 100).toFixed(1) : '0.0';

  const modal = document.createElement('div');
  modal.id = 'financial-report-modal';
  modal.className = 'badge-modal-backdrop report-backdrop';

  modal.innerHTML = `
    <div class="report-modal-wrapper">
      <!-- Sticky Action Control Bar -->
      <div class="report-action-bar no-print">
        <div class="report-action-left">
          <div class="report-action-icon">📊</div>
          <div>
            <h3 class="report-action-title">Relatório Financeiro Executivo</h3>
            <div class="report-action-subtitle">Dossiê completo consolidado · ${monthLabel(targetMonth)}</div>
          </div>
        </div>

        <div class="report-action-buttons">
          <button id="btn-print-report" class="btn btn-primary btn-sm" title="Imprimir ou Salvar em PDF">
            🖨️ Imprimir / Salvar PDF
          </button>
          <button id="btn-download-html-report" class="btn btn-secondary btn-sm" title="Baixar arquivo HTML autônomo">
            📥 Baixar HTML
          </button>
          <button id="btn-export-csv-report" class="btn btn-secondary btn-sm" title="Baixar dados em planilha CSV">
            📑 Exportar CSV
          </button>
          <button id="btn-close-report-modal" class="badge-modal-close" style="position: static;" title="Fechar">✕</button>
        </div>
      </div>

      <!-- Printable Document Container -->
      <div class="report-sheet-container" id="report-sheet-content">
        
        <!-- REPORT HEADER & IDENTITY -->
        <div class="report-header-banner">
          <div class="report-header-top">
            <div class="report-brand">
              <span class="report-brand-logo">🤝</span>
              <div>
                <h1 class="report-brand-title">Me ajuda aí Finanças</h1>
                <p class="report-brand-tagline">Relatório Executivo de Diagnóstico & Performance Financeira</p>
              </div>
            </div>
            <div class="report-meta-box">
              <div class="report-meta-item">
                <span class="report-meta-lbl">Protocolo:</span>
                <strong class="report-meta-val">#${reportCode}</strong>
              </div>
              <div class="report-meta-item">
                <span class="report-meta-lbl">Emissão:</span>
                <strong class="report-meta-val">${emissionDateFormatted}</strong>
              </div>
              <div class="report-meta-item">
                <span class="report-meta-lbl">Competência:</span>
                <strong class="report-meta-val">${monthLabel(targetMonth)}</strong>
              </div>
            </div>
          </div>

          <!-- USER IDENTITY STRIP -->
          <div class="report-user-card">
            <div class="report-user-left">
              <div class="report-user-avatar">
                ${
                  profile.avatarUrl || userObj.avatar
                    ? `<img src="${profile.avatarUrl || userObj.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                    : `<span>${(profile.nome || userObj.name || userEmail || 'U')[0].toUpperCase()}</span>`
                }
              </div>
              <div>
                <div class="report-user-name">${profile.nome || userObj.name || (userEmail ? userEmail.split('@')[0] : 'Titular da Conta')}</div>
                <div class="report-user-sub">${userEmail || 'Usuário Local'} · Faixa: <strong>${profile.faixa || 'Não informada'}</strong> · Cadastrado em: <strong>${profile.dataCadastro || 'Recente'}</strong></div>
              </div>
            </div>

            <div class="report-user-badges">
              <div class="report-badge-chip" style="border-color: ${badge.cor}; background: ${badge.cor}12;">
                <span class="report-badge-icon">${badge.icone}</span>
                <div>
                  <div class="report-badge-tag">Perfil Inicial</div>
                  <strong class="report-badge-name" style="color: ${badge.cor};">${badge.nome}</strong>
                </div>
              </div>

              <div class="report-badge-chip" style="border-color: var(--brand); background: var(--brand-light);">
                <span class="report-badge-icon">💎</span>
                <div>
                  <div class="report-badge-tag">Gamificação</div>
                  <strong class="report-badge-name" style="color: var(--brand);">${levelInfo.nome} (${achievements.unlockedCount}/${achievements.totalCount})</strong>
                </div>
              </div>

              <div class="report-badge-chip" style="border-color: ${scoreData.tier.cor}; background: ${scoreData.tier.cor}12;">
                <span class="report-badge-icon">${scoreData.tier.icone}</span>
                <div>
                  <div class="report-badge-tag">Score Financeiro</div>
                  <strong class="report-badge-name" style="color: ${scoreData.tier.cor};">${scoreData.score} pts · ${scoreData.tier.nome}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 1: EXECUTIVE KPIS & SUMMARY -->
        <div class="report-section">
          <div class="report-section-header">
            <h2 class="report-section-title">📌 1. Sumário Executivo & Indicadores do Mês</h2>
            <span class="report-section-kicker">Visão Consolidada</span>
          </div>

          <div class="report-kpi-grid">
            <div class="report-kpi-card kpi-green">
              <span class="report-kpi-lbl">🟢 Receitas Totais</span>
              <div class="report-kpi-val">${fmtBRL(kpis.receita)}</div>
              <div class="report-kpi-sub">Salário: ${fmtBRL(kpis.salario)} · Extras: ${fmtBRL(kpis.freelance)}</div>
            </div>

            <div class="report-kpi-card kpi-red">
              <span class="report-kpi-lbl">🔴 Despesas Totais</span>
              <div class="report-kpi-val">${fmtBRL(kpis.despesa)}</div>
              <div class="report-kpi-sub">Fixas: ${fmtBRL(kpis.contafixa)} · Variáveis: ${fmtBRL(kpis.gastoVariavel)}</div>
            </div>

            <div class="report-kpi-card kpi-purple">
              <span class="report-kpi-lbl">🟣 Aportes & Investimentos</span>
              <div class="report-kpi-val">${fmtBRL(kpis.invest)}</div>
              <div class="report-kpi-sub">${investRate}% da renda aportada no período</div>
            </div>

            <div class="report-kpi-card kpi-brand">
              <span class="report-kpi-lbl">💎 Saldo Líquido do Mês</span>
              <div class="report-kpi-val" style="color: ${kpis.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">
                ${fmtBRL(kpis.saldo)}
              </div>
              <div class="report-kpi-sub">Taxa de Poupança: <strong>${savingsRate}%</strong> (${kpis.health.badge})</div>
            </div>
          </div>

          <!-- Secondary KPI highlights (Wallets & Yearly Goal) -->
          <div class="report-kpi-dual-row">
            <div class="report-dual-card">
              <div class="report-dual-head">
                <span class="report-dual-title">🏦 Patrimônio Total em Carteiras</span>
                <strong class="report-dual-badge">${wallets.length} Contas / Ativos</strong>
              </div>
              <div class="report-dual-val">${fmtCurrency(walletSummary.totalApproxBRL, 'BRL')}</div>
              <div class="report-dual-breakdown">
                <span>🇧🇷 BRL: ${fmtCurrency(walletSummary.byCurrency.BRL, 'BRL')}</span>
                <span>🇺🇸 USD: ${fmtCurrency(walletSummary.byCurrency.USD + walletSummary.byCurrency.USDT + walletSummary.byCurrency.USDC, 'USD')}</span>
                <span>🇪🇺 EUR: ${fmtCurrency(walletSummary.byCurrency.EUR, 'EUR')}</span>
              </div>
            </div>

            <div class="report-dual-card">
              <div class="report-dual-head">
                <span class="report-dual-title">🎯 Meta de Economia Anual</span>
                <strong class="report-dual-badge" style="color: var(--green);">${yearlySavings.pct}% Conquistado</strong>
              </div>
              <div class="report-dual-val">${fmtBRL(yearlySavings.totalAccumulated)} <span style="font-size: 14px; font-weight:600; color: var(--text-muted);">de ${profile.meta ? fmtBRL(profile.meta) : 'R$ 0,00'}</span></div>
              <div class="report-dual-progress">
                <div class="report-dual-bar" style="width: ${yearlySavings.pct}%;"></div>
              </div>
              <div class="report-dual-sub">${yearlySavings.remainingToNextMilestone > 0 ? `Faltam ${fmtBRL(yearlySavings.remainingToNextMilestone)} para o próximo marco (${yearlySavings.nextMilestonePct}%)` : '🎉 Meta anual cumprida com sucesso!'}</div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: PERFORMANCE CHARTS (GRÁFICOS DE DESEMPENHO) -->
        <div class="report-section">
          <div class="report-section-header">
            <h2 class="report-section-title">📈 2. Gráficos de Desempenho & Evolução Histórica</h2>
            <span class="report-section-kicker">Análise Visual</span>
          </div>

          <div class="report-charts-grid">
            <!-- Chart 1: Evolution -->
            <div class="report-chart-box">
              <div class="report-chart-head">
                <span class="report-chart-title">📊 Evolução Mensal (Receitas vs Despesas vs Investimentos)</span>
                <span class="report-chart-sub">Últimos meses registrados</span>
              </div>
              <div class="report-chart-canvas-wrap">
                <canvas id="reportEvolutionChart"></canvas>
              </div>
            </div>

            <!-- Chart 2: Category Breakdown -->
            <div class="report-chart-box">
              <div class="report-chart-head">
                <span class="report-chart-title">🍩 Composição de Despesas por Categoria</span>
                <span class="report-chart-sub">${monthLabel(targetMonth)}</span>
              </div>
              <div class="report-chart-canvas-wrap">
                <canvas id="reportCategoryChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Score Radar & Factors Grid -->
          <div class="report-charts-grid" style="margin-top: 16px;">
            <div class="report-chart-box">
              <div class="report-chart-head">
                <span class="report-chart-title">🎯 Raio-X dos 4 Pilares do Score Financeiro</span>
                <span class="report-chart-sub">Avaliação dos hábitos e consistência</span>
              </div>
              <div class="report-chart-canvas-wrap">
                <canvas id="reportScoreRadarChart"></canvas>
              </div>
            </div>

            <div class="report-chart-box" style="display: flex; flex-direction: column; justify-content: center;">
              <div class="report-chart-head">
                <span class="report-chart-title">📋 Detalhamento dos Pilares de Pontuação</span>
                <span class="report-chart-sub">Total: <strong>${scoreData.score} / 1000 pontos</strong></span>
              </div>
              <div class="report-factors-list">
                ${scoreData.factors
                  .map((f) => {
                    const pct = Math.min(100, Math.round((f.points / f.max) * 100));
                    return `
                    <div class="report-factor-item">
                      <div class="report-factor-header">
                        <span>${f.icon} <strong>${f.label}</strong></span>
                        <span><strong>${f.points}</strong> / ${f.max} pts (${pct}%)</span>
                      </div>
                      <div class="report-factor-track">
                        <div class="report-factor-fill" style="width: ${pct}%; background: ${pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--brand)' : 'var(--amber)'};"></div>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: CATEGORY ANALYSIS & BUDGET GOALS -->
        <div class="report-section page-break-before">
          <div class="report-section-header">
            <h2 class="report-section-title">🏷️ 3. Detalhamento de Despesas por Categoria & Metas</h2>
            <span class="report-section-kicker">Distribuição de Gastos</span>
          </div>

          ${
            categoryBreakdown.length === 0
              ? `<div class="report-empty-state">Nenhuma despesa registrada para o período selecionado.</div>`
              : `
            <div class="report-table-wrapper">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style="text-align: center;">Qtd. Lançamentos</th>
                    <th style="text-align: right;">Gasto Total (R$)</th>
                    <th style="text-align: right;">% da Despesa</th>
                    <th style="text-align: right;">Meta / Teto</th>
                    <th style="text-align: center;">Status do Teto</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryBreakdown
                    .map((cat) => {
                      const pct = kpis.despesa > 0 ? ((cat.total / kpis.despesa) * 100).toFixed(1) : '0.0';
                      const budgetItem = budgetData.categoryList.find((b) => b.category === cat.category);
                      let statusPill = '<span class="report-status-badge neutral">Sem Teto</span>';
                      let limitStr = '—';

                      if (budgetItem) {
                        limitStr = fmtBRL(budgetItem.limit);
                        if (budgetItem.status === 'exceeded') {
                          statusPill = `<span class="report-status-badge danger">⚠️ Excedido (${budgetItem.pct}%)</span>`;
                        } else if (budgetItem.status === 'warning') {
                          statusPill = `<span class="report-status-badge warning">⚡ Atenção (${budgetItem.pct}%)</span>`;
                        } else {
                          statusPill = `<span class="report-status-badge success">✅ No Limite (${budgetItem.pct}%)</span>`;
                        }
                      }

                      return `
                      <tr>
                        <td>
                          <span class="report-cat-cell">
                            <span class="report-cat-icon">${getCategoryIcon(cat.category)}</span>
                            <strong>${cat.category}</strong>
                          </span>
                        </td>
                        <td style="text-align: center;">${cat.count}</td>
                        <td style="text-align: right; font-weight: 700;">${fmtBRL(cat.total)}</td>
                        <td style="text-align: right;">${pct}%</td>
                        <td style="text-align: right;">${limitStr}</td>
                        <td style="text-align: center;">${statusPill}</td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>

        <!-- SECTION 4: RECURRING EXPENSES & WEALTH ASSETS -->
        <div class="report-section">
          <div class="report-section-header">
            <h2 class="report-section-title">🔁 4. Contas Recorrentes & Posição de Carteiras</h2>
            <span class="report-section-kicker">Compromissos e Alocação</span>
          </div>

          <div class="report-dual-tables-grid">
            <!-- Recurring rules table -->
            <div class="report-table-box">
              <div class="report-table-box-head">
                <span class="report-table-box-title">🔁 Contas Fixas & Recorrências</span>
                <span class="report-table-box-count">${recurringList.length} ativas</span>
              </div>
              ${
                recurringList.length === 0
                  ? `<div class="report-empty-state" style="padding: 16px;">Nenhuma conta recorrente cadastrada.</div>`
                  : `
                <table class="report-table compact">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Venc.</th>
                      <th>Categoria</th>
                      <th style="text-align: right;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recurringList
                      .map(
                        (r) => `
                      <tr>
                        <td><strong>${r.desc || r.descricao}</strong></td>
                        <td>Dia ${r.diaVencimento || 1}</td>
                        <td>${r.subcategoria ? `${getCategoryIcon(r.subcategoria)} ${r.subcategoria}` : 'Fixa'}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--red);">${fmtBRL(Number(r.valor))}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              `
              }
            </div>

            <!-- Wallets table -->
            <div class="report-table-box">
              <div class="report-table-box-head">
                <span class="report-table-box-title">🏦 Posição de Carteiras & Saldos</span>
                <span class="report-table-box-count">${wallets.length} contas</span>
              </div>
              ${
                wallets.length === 0
                  ? `<div class="report-empty-state" style="padding: 16px;">Nenhuma carteira cadastrada.</div>`
                  : `
                <table class="report-table compact">
                  <thead>
                    <tr>
                      <th>Conta / Ativo</th>
                      <th>Tipo</th>
                      <th>Moeda</th>
                      <th style="text-align: right;">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${wallets
                      .map(
                        (w) => `
                      <tr>
                        <td><strong>${w.nome}</strong></td>
                        <td><span class="report-tag">${w.tipo || 'Conta'}</span></td>
                        <td>${w.moeda || 'BRL'}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--green);">${fmtCurrency(w.saldo, w.moeda)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              `
              }
            </div>
          </div>
        </div>

        <!-- SECTION 5: AI DIAGNOSTIC & STRATEGIC 3-PHASE ACTION PLAN -->
        <div class="report-section">
          <div class="report-section-header">
            <h2 class="report-section-title">🧠 5. Diagnóstico Comportamental & Plano de Ação Estratégico</h2>
            <span class="report-section-kicker">Recomendações da IA Financeira</span>
          </div>

          <div class="report-diagnostic-summary-grid">
            <div class="report-diag-card">
              <span class="report-diag-lbl">⚠️ Maior Desafio Declarado</span>
              <div class="report-diag-val">${profile.dificuldade || 'Organização geral das contas'}</div>
            </div>
            <div class="report-diag-card">
              <span class="report-diag-lbl">📊 Sobra no Fim do Mês (0 a 10)</span>
              <div class="report-diag-val">${profile.sobra !== undefined && profile.sobra !== null ? profile.sobra : '—'} / 10</div>
            </div>
            <div class="report-diag-card">
              <span class="report-diag-lbl">🔍 Clareza sobre Gastos</span>
              <div class="report-diag-val">${profile.sabeParaOnde || 'Em evolução'}</div>
            </div>
            <div class="report-diag-card">
              <span class="report-diag-lbl">🌱 Conhecimento em Investimentos</span>
              <div class="report-diag-val">${profile.sabeInvestir || 'Iniciante'}</div>
            </div>
          </div>

          <!-- 3-Phase Action Plan -->
          <div class="report-action-plan-grid">
            <div class="report-plan-card phase-1">
              <div class="report-plan-badge">FASE 1 · PRÓXIMOS 30 DIAS</div>
              <h4 class="report-plan-title">🛡️ Blindagem & Controle Imediato</h4>
              <ul class="report-plan-list">
                <li>Defina tetos de gastos nas categorias mais sensíveis (ex: Lanches, Compras, Supermercado).</li>
                <li>Mantenha 100% dos lançamentos diários registrados no app para não perder pequenos vazamentos.</li>
                <li>Garanta que as contas recorrentes estejam com datas de vencimento alinhadas com o recebimento.</li>
              </ul>
            </div>

            <div class="report-plan-card phase-2">
              <div class="report-plan-badge">FASE 2 · 90 DIAS</div>
              <h4 class="report-plan-title">🏦 Reserva de Emergência</h4>
              <ul class="report-plan-list">
                <li>Direcione no mínimo 10% a 15% de cada receita diretamente para uma conta de alta liquidez (CDB 100% CDI).</li>
                <li>Revise assinaturas e serviços de TV/Internet/Celular para renegociar tarifas e planos.</li>
                <li>Acompanhe o termômetro da Meta Anual para garantir que o acumulado esteja no ritmo previsto.</li>
              </ul>
            </div>

            <div class="report-plan-card phase-3">
              <div class="report-plan-badge">FASE 3 · 180+ DIAS</div>
              <h4 class="report-plan-title">🚀 Expansão de Patrimônio</h4>
              <ul class="report-plan-list">
                <li>Com a reserva construída, diversifique em Renda Fixa e ativos de valorização (FIIs, Ações ou Dólar).</li>
                <li>Automatize seus aportes mensais no início do mês ("Pague-se Primeiro").</li>
                <li>Mantenha a pontuação de Score acima de 850 para conservar hábitos de Maestria Financeira.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- REPORT FOOTER -->
        <div class="report-footer-banner">
          <div class="report-footer-left">
            <strong>Me ajuda aí Finanças</strong> · Gestão Financeira Inteligente, Gamificada e Descomplicada.<br>
            <span style="font-size: 11px; color: var(--text-muted);">Relatório gerado com confidencialidade e segurança no seu dispositivo.</span>
          </div>
          <div class="report-footer-right">
            <span>Autenticação: <code>${reportCode}</code></span>
            <span>Dossiê Oficial Consolidado</span>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const closeModal = () => {
    if (reportEvolutionChartInstance) {
      reportEvolutionChartInstance.destroy();
      reportEvolutionChartInstance = null;
    }
    if (reportCategoryChartInstance) {
      reportCategoryChartInstance.destroy();
      reportCategoryChartInstance = null;
    }
    if (reportScoreRadarChartInstance) {
      reportScoreRadarChartInstance.destroy();
      reportScoreRadarChartInstance = null;
    }
    modal.remove();
  };

  modal.querySelector('#btn-close-report-modal').addEventListener('click', closeModal);

  // Close on backdrop click (outside the report sheet)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Print Handler
  modal.querySelector('#btn-print-report').addEventListener('click', () => {
    window.print();
  });

  // Standalone HTML Download Handler
  modal.querySelector('#btn-download-html-report').addEventListener('click', () => {
    downloadStandaloneHtmlReport(user, profile, {
      reportCode,
      emissionDateFormatted,
      targetMonth,
      badge,
      levelInfo,
      scoreData,
      achievements,
      kpis,
      yearlySavings,
      categoryBreakdown,
      recurringList,
      wallets,
      walletSummary,
      historyData,
      budgetData
    });
  });

  // CSV Export Handler
  modal.querySelector('#btn-export-csv-report').addEventListener('click', () => {
    const currentTx = finance.getTransactions(userEmail);
    exportTransactionsCSV(userEmail, currentTx);
  });

  // Render Chart.js visual charts
  setTimeout(() => {
    if (!document.getElementById('financial-report-modal')) return;
    renderReportCharts(modal, {
      historyData,
      categoryBreakdown,
      scoreData
    });
  }, 100);
}

/**
 * Render Chart.js instances inside the report modal
 */
function renderReportCharts(container, { historyData, categoryBreakdown, scoreData }) {
  // 1. Evolution Multi-Month Chart
  const canvasEvolution = container.querySelector('#reportEvolutionChart');
  if (canvasEvolution) {
    const existingChart = Chart.getChart(canvasEvolution);
    if (existingChart) existingChart.destroy();
    if (reportEvolutionChartInstance) {
      reportEvolutionChartInstance.destroy();
      reportEvolutionChartInstance = null;
    }

    const labels = historyData.map((d) => d.label);
    const receitas = historyData.map((d) => d.receita);
    const despesas = historyData.map((d) => d.despesa);
    const invests = historyData.map((d) => d.invest);

    reportEvolutionChartInstance = new Chart(canvasEvolution, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Receitas (R$)',
            data: receitas,
            backgroundColor: '#10b981',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Despesas (R$)',
            data: despesas,
            backgroundColor: '#ef4444',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Investimentos (R$)',
            data: invests,
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'inherit', weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtBRL(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => 'R$ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
            }
          }
        }
      }
    });
  }

  // 2. Category Breakdown Doughnut Chart
  const canvasCategory = container.querySelector('#reportCategoryChart');
  if (canvasCategory) {
    const existingCat = Chart.getChart(canvasCategory);
    if (existingCat) existingCat.destroy();
    if (reportCategoryChartInstance) {
      reportCategoryChartInstance.destroy();
      reportCategoryChartInstance = null;
    }

    const topCats = categoryBreakdown.slice(0, 7);
    const labels = topCats.map((c) => c.category);
    const dataVals = topCats.map((c) => c.total);

    const palette = [
      '#3b5bfd',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#64748b'
    ];

    reportCategoryChartInstance = new Chart(canvasCategory, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Sem despesas'],
        datasets: [
          {
            data: dataVals.length > 0 ? dataVals : [1],
            backgroundColor: dataVals.length > 0 ? palette.slice(0, labels.length) : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff'
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
              font: { size: 10.5, family: 'inherit', weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${fmtBRL(ctx.raw)}`
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // 3. Score Radar / Pillars Chart
  const canvasScoreRadar = container.querySelector('#reportScoreRadarChart');
  if (canvasScoreRadar) {
    const existingRadar = Chart.getChart(canvasScoreRadar);
    if (existingRadar) existingRadar.destroy();
    if (reportScoreRadarChartInstance) {
      reportScoreRadarChartInstance.destroy();
      reportScoreRadarChartInstance = null;
    }

    const factorLabels = scoreData.factors.map((f) => f.label);
    const factorScores = scoreData.factors.map((f) => Math.round((f.points / f.max) * 100));

    reportScoreRadarChartInstance = new Chart(canvasScoreRadar, {
      type: 'radar',
      data: {
        labels: factorLabels,
        datasets: [
          {
            label: 'Aproveitamento (%)',
            data: factorScores,
            backgroundColor: 'rgba(59, 91, 253, 0.2)',
            borderColor: '#3b5bfd',
            pointBackgroundColor: '#3b5bfd',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3b5bfd',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw}% atingido`
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, display: false },
            pointLabels: {
              font: { size: 10.5, family: 'inherit', weight: '600' }
            }
          }
        }
      }
    });
  }
}

/**
 * Download Standalone HTML Executive Report File
 */
function downloadStandaloneHtmlReport(user, profile, data) {
  const {
    reportCode,
    emissionDateFormatted,
    targetMonth,
    badge,
    levelInfo,
    scoreData,
    achievements,
    kpis,
    yearlySavings,
    categoryBreakdown,
    recurringList,
    wallets,
    walletSummary,
    historyData,
    budgetData
  } = data;

  const userObj = user || {};
  const userEmail = (userObj.email || (typeof user === 'string' ? user : '')).trim().toLowerCase();
  const userName = profile?.nome || userObj?.name || (userEmail ? userEmail.split('@')[0] : 'Titular');

  const savingsRate = kpis.receita > 0 ? ((kpis.saldo / kpis.receita) * 100).toFixed(1) : '0.0';
  const investRate = kpis.receita > 0 ? ((kpis.invest / kpis.receita) * 100).toFixed(1) : '0.0';

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Financeiro Executivo · ${userName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --brand: #3b5bfd;
      --brand-light: #eff3ff;
      --green: #10b981;
      --red: #ef4444;
      --amber: #f59e0b;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 30px 20px;
    }
    .wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { font-size: 34px; }
    .brand-title { font-size: 22px; font-weight: 800; color: var(--text); }
    .brand-sub { font-size: 13px; color: var(--muted); }
    .meta-box {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 12px;
      text-align: right;
    }
    .user-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--brand-light);
      border: 1px solid rgba(59,91,253,0.2);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 28px;
      gap: 14px;
      flex-wrap: wrap;
    }
    .user-info { display: flex; align-items: center; gap: 12px; }
    .user-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      background: var(--brand); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 800;
    }
    .chips-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      border-top: 4px solid var(--brand);
    }
    .kpi-card.green { border-top-color: var(--green); }
    .kpi-card.red { border-top-color: var(--red); }
    .kpi-card.purple { border-top-color: var(--purple); }
    .kpi-lbl { font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: var(--muted); }
    .kpi-val { font-size: 24px; font-weight: 900; margin: 4px 0 2px; }
    .kpi-sub { font-size: 11.5px; color: var(--muted); }
    
    .section-title {
      font-size: 16px; font-weight: 800; margin: 28px 0 14px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid var(--border); padding-bottom: 8px;
    }
    table {
      width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;
    }
    th, td {
      padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left;
    }
    th {
      background: var(--bg); font-weight: 700; color: var(--muted); font-size: 11.5px; text-transform: uppercase;
    }
    .status-pill {
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
    }
    .plan-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 14px;
    }
    .plan-box {
      border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--bg);
    }
    .plan-badge { font-size: 10.5px; font-weight: 800; color: var(--brand); text-transform: uppercase; margin-bottom: 4px; }
    .plan-box h4 { font-size: 14px; font-weight: 800; margin-bottom: 8px; }
    .plan-box ul { padding-left: 18px; font-size: 12px; color: var(--muted); line-height: 1.6; }
    .footer {
      margin-top: 32px; padding-top: 18px; border-top: 1px solid var(--border);
      font-size: 11.5px; color: var(--muted); display: flex; justify-content: space-between; align-items: center;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .wrapper { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-icon">🤝</div>
        <div>
          <div class="brand-title">Me ajuda aí Finanças</div>
          <div class="brand-sub">Relatório Executivo & Diagnóstico Pessoal</div>
        </div>
      </div>
      <div class="meta-box">
        <div><strong>Protocolo:</strong> #${reportCode}</div>
        <div><strong>Emissão:</strong> ${emissionDateFormatted}</div>
        <div><strong>Competência:</strong> ${monthLabel(targetMonth)}</div>
      </div>
    </div>

    <!-- User Strip -->
    <div class="user-strip">
      <div class="user-info">
        <div class="user-avatar">${userName[0].toUpperCase()}</div>
        <div>
          <div style="font-size: 17px; font-weight: 800;">${userName}</div>
          <div style="font-size: 12.5px; color: var(--muted);">${userEmail || 'Usuário Local'} · Faixa: ${profile.faixa || '—'}</div>
        </div>
      </div>
      <div class="chips-row">
        <span class="chip">${badge.icone} ${badge.nome}</span>
        <span class="chip">💎 Score ${scoreData.score} pts</span>
        <span class="chip">🏆 Nível ${levelInfo.nome}</span>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card green">
        <div class="kpi-lbl">Receitas Totais</div>
        <div class="kpi-val">${fmtBRL(kpis.receita)}</div>
        <div class="kpi-sub">Salário + Free Lancer</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-lbl">Despesas Totais</div>
        <div class="kpi-val">${fmtBRL(kpis.despesa)}</div>
        <div class="kpi-sub">Fixas (${fmtBRL(kpis.contafixa)}) + Variáveis (${fmtBRL(kpis.gastoVariavel)})</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-lbl">Aportes / Investimentos</div>
        <div class="kpi-val">${fmtBRL(kpis.invest)}</div>
        <div class="kpi-sub">${investRate}% da renda total</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Saldo Líquido</div>
        <div class="kpi-val" style="color: ${kpis.saldo >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtBRL(kpis.saldo)}</div>
        <div class="kpi-sub">Taxa de Poupança: ${savingsRate}%</div>
      </div>
    </div>

    <!-- Category Table -->
    <div class="section-title">
      <span>🏷️ Despesas por Categoria (${monthLabel(targetMonth)})</span>
      <span style="font-size: 12px; color: var(--muted); font-weight: 600;">Total: ${fmtBRL(kpis.despesa)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Categoria</th>
          <th style="text-align: right;">Total Gasto</th>
          <th style="text-align: right;">% da Despesa</th>
        </tr>
      </thead>
      <tbody>
        ${
          categoryBreakdown.length === 0
            ? '<tr><td colspan="3" style="text-align:center; color:var(--muted);">Nenhum gasto registrado</td></tr>'
            : categoryBreakdown
                .map((cat) => {
                  const pct = kpis.despesa > 0 ? ((cat.total / kpis.despesa) * 100).toFixed(1) : '0.0';
                  return `
            <tr>
              <td>${getCategoryIcon(cat.category)} <strong>${cat.category}</strong> (${cat.count} lançamentos)</td>
              <td style="text-align: right; font-weight: 700;">${fmtBRL(cat.total)}</td>
              <td style="text-align: right;">${pct}%</td>
            </tr>
          `;
                })
                .join('')
        }
      </tbody>
    </table>

    <!-- Recurring & Wallets -->
    <div class="section-title">
      <span>🔁 Compromissos Recorrentes & Carteiras</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <div>
        <h4 style="font-size: 13px; font-weight: 800; margin-bottom: 6px;">Contas Recorrentes (${recurringList.length})</h4>
        <table>
          <thead>
            <tr><th>Descrição</th><th>Venc.</th><th style="text-align:right;">Valor</th></tr>
          </thead>
          <tbody>
            ${
              recurringList.length === 0
                ? '<tr><td colspan="3" style="color:var(--muted);">Nenhuma conta fixa</td></tr>'
                : recurringList
                    .map(
                      (r) => `
              <tr>
                <td>${r.desc || r.descricao}</td>
                <td>Dia ${r.diaVencimento || 1}</td>
                <td style="text-align:right; font-weight:700; color:var(--red);">${fmtBRL(Number(r.valor))}</td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 800; margin-bottom: 6px;">Carteiras & Ativos (${wallets.length})</h4>
        <table>
          <thead>
            <tr><th>Conta</th><th>Moeda</th><th style="text-align:right;">Saldo</th></tr>
          </thead>
          <tbody>
            ${
              wallets.length === 0
                ? '<tr><td colspan="3" style="color:var(--muted);">Nenhuma carteira</td></tr>'
                : wallets
                    .map(
                      (w) => `
              <tr>
                <td>${w.nome}</td>
                <td>${w.moeda || 'BRL'}</td>
                <td style="text-align:right; font-weight:700; color:var(--green);">${fmtCurrency(w.saldo, w.moeda)}</td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- AI Plan -->
    <div class="section-title">
      <span>🧠 Diagnóstico & Plano de Ação Estratégico</span>
    </div>
    <div class="plan-grid">
      <div class="plan-box">
        <div class="plan-badge">Fase 1 · Próximos 30 Dias</div>
        <h4>🛡️ Blindagem Imediata</h4>
        <ul>
          <li>Defina tetos de gastos nas categorias mais pesadas.</li>
          <li>Registre despesas diariamente para evitar pequenos vazamentos.</li>
        </ul>
      </div>
      <div class="plan-box">
        <div class="plan-badge">Fase 2 · 90 Dias</div>
        <h4>🏦 Reserva de Emergência</h4>
        <ul>
          <li>Guarde de 10% a 15% de cada receita em CDB 100% CDI.</li>
          <li>Renegocie contas de telecom, celular e serviços recorrentes.</li>
        </ul>
      </div>
      <div class="plan-box">
        <div class="plan-badge">Fase 3 · 180+ Dias</div>
        <h4>🚀 Expansão Patrimonial</h4>
        <ul>
          <li>Inicie aportes diversificados em FIIs, Ações e Renda Fixa.</li>
          <li>Mantenha o Score acima de 850 para consolidar a maestria.</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>Me ajuda aí Finanças</strong> · Gestão Inteligente</div>
      <div>Autenticação: <code>${reportCode}</code> · Emissão Oficial</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedName = userName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `relatorio-financeiro-me-ajuda-ai-${sanitizedName}-${targetMonth}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Relatório HTML baixado com sucesso!', 'success');
}

/**
 * Export Transactions as CSV
 */
function exportTransactionsCSV(userEmail, allTx) {
  if (!allTx || allTx.length === 0) {
    showToast('Nenhum lançamento encontrado para exportar.', 'warning');
    return;
  }

  const sorted = [...allTx].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const header = ['ID', 'Data', 'Tipo', 'Categoria/Subcategoria', 'Descricao', 'Moeda', 'Valor', 'Recorrente'];
  
  const rows = sorted.map((t) => {
    return [
      `"${t.id || ''}"`,
      `"${t.data || ''}"`,
      `"${t.tipo || ''}"`,
      `"${t.subcategoria || ''}"`,
      `"${String(t.desc || t.descricao || '').replace(/"/g, '""')}"`,
      `"${t.moeda || 'BRL'}"`,
      `"${Number(t.valor || 0).toFixed(2)}"`,
      `"${t.recorrenteId ? 'Sim' : 'Nao'}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `extrato-me-ajuda-ai-${(userEmail || 'user').split('@')[0]}-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Extrato CSV baixado com sucesso!', 'success');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
