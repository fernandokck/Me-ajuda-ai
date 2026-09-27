/**
 * Score Financeiro Component (1 to 1000 points)
 */

import { scoreEngine } from '../services/score.js';

export function renderScoreView(container, user) {
  const result = scoreEngine.calculateScore(user.email);
  const { score, tier, factors, tips } = result;

  const scorePct = Math.min(100, Math.round((score / 1000) * 100));

  container.innerHTML = `
    <div id="tab-score">
      <!-- Main Score Hero Card -->
      <div class="card score-hero-card" style="margin-bottom: 20px;">
        <div class="score-hero-header">
          <div>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
              Seu Diagnóstico Contínuo
            </span>
            <h2 style="font-size: 24px; font-weight: 800; margin: 4px 0;">Score Financeiro</h2>
          </div>
          <span class="score-tier-badge" style="background: ${tier.cor}18; color: ${tier.cor}; border: 1.5px solid ${tier.cor};">
            ${tier.icone} ${tier.nome}
          </span>
        </div>

        <div class="score-meter-container">
          <div class="score-number-display">
            <span class="score-big-val" style="color: ${tier.cor};">${score}</span>
            <span class="score-max-val">/ 1000 pts</span>
          </div>

          <div class="score-track-bar">
            <div class="score-track-fill" style="width: ${scorePct}%; background: linear-gradient(90deg, #3b5bfd 0%, ${tier.cor} 100%);"></div>
          </div>
          
          <div class="score-track-labels">
            <span>0</span>
            <span>450 (Médio)</span>
            <span>650 (Bom)</span>
            <span>850 (Excelente)</span>
            <span>1000</span>
          </div>
        </div>

        <p class="score-hero-desc">${tier.desc}</p>
      </div>

      <!-- 2-Column Grid: Factors & Evolution Tips -->
      <div class="dashboard-grid">
        <!-- Factor Breakdown -->
        <div class="card">
          <div class="card-title-row">
            <h3>📊 Composição do seu Score</h3>
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">4 pilares</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${factors
              .map((f) => {
                const pct = Math.round((f.points / f.max) * 100);
                return `
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13.5px;">
                    <span style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                      <span>${f.icon}</span> ${f.label}
                    </span>
                    <strong style="color: var(--text-main);">${f.points} / ${f.max} pts</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-bar-inner" style="width: ${pct}%;"></div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <!-- Tips to Level Up -->
        <div class="card">
          <div class="card-title-row">
            <h3>🚀 Como Aumentar seu Score</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Ações recomendadas para você alcançar o próximo nível financeiro:
          </p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${tips
              .map(
                (t) => `
              <div class="score-tip-item">
                <span style="font-size: 20px;">${t.icon}</span>
                <span style="font-size: 13.5px; font-weight: 500; color: var(--text-main); line-height: 1.4;">${t.text}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
