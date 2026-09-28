/**
 * Bottom Navigation Dock Component (Clean, Subtle App Bar with 5 tabs)
 */

export function renderBottomNav(container, activeTab, onTabChange) {
  const tabs = [
    { id: 'dash', label: 'Painel', icon: '📊' },
    { id: 'carteira', label: 'Carteira', icon: '💼' },
    { id: 'historico', label: 'Evolução', icon: '📈' },
    { id: 'metas', label: 'Metas', icon: '🎯' },
    { id: 'score', label: 'Score', icon: '⚡' },
    { id: 'ach', label: 'Conquistas', icon: '🏆' },
    { id: 'perfil', label: 'Perfil', icon: '👤' }
  ];

  container.innerHTML = `
    <nav class="bottom-app-dock">
      <div class="bottom-dock-inner">
        ${tabs
          .map(
            (t) => `
          <button class="dock-tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}" title="${t.label}">
            <span class="dock-tab-icon">${t.icon}</span>
            <span class="dock-tab-label">${t.label}</span>
          </button>
        `
          )
          .join('')}
      </div>
    </nav>
  `;

  container.querySelectorAll('.dock-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      container.querySelectorAll('.dock-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onTabChange(tabId);
    });
  });
}
