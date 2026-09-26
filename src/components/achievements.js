/**
 * Achievements Component
 */

import { gamification } from '../services/gamification.js';
import { fmtBRL } from '../services/finance.js';

export function renderAchievements(container, user) {
  const result = gamification.calculateAchievements(user.email);
  const { achievements, unlockedCount, totalCount, level } = result;

  const progressPct = Math.round((unlockedCount / totalCount) * 100);

  container.innerHTML = `
    <div id="tab-ach">
      <!-- Level Banner -->
      <div class="card level-card">
        <div class="level-icon">${level.icone}</div>
        <div style="flex: 1;">
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
            Nível de Conquistas
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-main); margin: 2px 0 4px;">
            ${level.nome} · ${unlockedCount}/${totalCount} desbloqueadas (${progressPct}%)
          </div>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">
            ${level.desc}
          </p>
        </div>
      </div>

      <!-- Achievements Grid -->
      <div class="ach-grid">
        ${achievements
          .map((a) => {
            const pct = Math.min(100, Math.round((a.current / a.target) * 100));
            const curFormatted = a.money ? fmtBRL(a.current) : a.current;
            const tgtFormatted = a.money ? fmtBRL(a.target) : a.target;

            return `
            <div class="ach-card ${a.unlocked ? 'done' : ''}">
              <div class="ach-head">
                <span class="ico">${a.icone}</span>
                <span style="font-size: 14px;">${a.unlocked ? '✅ Concluída' : '🔒 Em andamento'}</span>
              </div>
              <h4>${a.titulo}</h4>
              <p>${a.desc}</p>
              <div class="progress-bar">
                <div class="progress-bar-inner" style="width: ${pct}%;"></div>
              </div>
              <small>${curFormatted} / ${tgtFormatted} (${pct}%)</small>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>
  `;
}
