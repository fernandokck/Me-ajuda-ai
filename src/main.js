/**
 * Main Application Orchestrator
 */

import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';

import { auth } from './services/auth.js';
import { gamification } from './services/gamification.js';
import { finance } from './services/finance.js';
import { pwa } from './services/pwa.js';
import { storage } from './services/storage.js';

import { renderLogin } from './components/login.js';
import { renderOnboarding } from './components/onboarding.js';
import { renderBadgeReveal } from './components/badgeReveal.js';
import { renderHeader } from './components/header.js';
import { renderDashboard } from './components/dashboard.js';
import { renderAchievements } from './components/achievements.js';
import { renderProfile } from './components/profile.js';

class App {
  constructor() {
    this.root = document.getElementById('app-root');
    this.currentTab = 'dash';
    this.isDark = storage.get('theme', 'dark') === 'dark';
    
    this.init();
  }

  init() {
    this.applyTheme();
    pwa.init();
    auth.init();

    auth.onAuthStateChanged((user) => {
      if (!user) {
        this.renderLoginScreen();
      } else {
        finance.generateRecurring(user.email);
        const profile = gamification.getProfile(user.email);
        if (!profile) {
          this.renderOnboardingScreen(user);
        } else {
          this.renderAppShell(user, profile);
        }
      }
    });
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    storage.set('theme', this.isDark ? 'dark' : 'light');
  }

  toggleTheme(user, profile) {
    this.isDark = !this.isDark;
    this.applyTheme();
    if (user && profile) {
      this.renderAppShell(user, profile);
    }
  }

  renderLoginScreen() {
    renderLogin(this.root, (user) => {
      const profile = gamification.getProfile(user.email);
      if (!profile) {
        this.renderOnboardingScreen(user);
      } else {
        this.renderAppShell(user, profile);
      }
    });
  }

  renderOnboardingScreen(user) {
    renderOnboarding(this.root, user, (profile) => {
      renderBadgeReveal(this.root, profile.badge, () => {
        this.renderAppShell(user, profile);
      });
    });
  }

  renderAppShell(user, profile) {
    this.root.innerHTML = `
      <div id="app-shell">
        <div id="header-container"></div>
        
        <!-- Navigation Tabs -->
        <nav class="tabs-nav">
          <button class="tab-btn ${this.currentTab === 'dash' ? 'active' : ''}" data-tab="dash">
            📊 Painel Financeiro
          </button>
          <button class="tab-btn ${this.currentTab === 'ach' ? 'active' : ''}" data-tab="ach">
            🏆 Conquistas & Metas
          </button>
          <button class="tab-btn ${this.currentTab === 'perfil' ? 'active' : ''}" data-tab="perfil">
            👤 Meu Perfil
          </button>
        </nav>

        <!-- Main Tab Content Container -->
        <main id="tab-content"></main>
      </div>
    `;

    // Render header
    const headerContainer = this.root.querySelector('#header-container');
    renderHeader(headerContainer, {
      user,
      profile,
      isDark: this.isDark,
      onLogout: () => auth.logout(),
      onThemeToggle: () => this.toggleTheme(user, profile)
    });

    // Bind tab clicks
    this.root.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        this.root.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderActiveTabContent(user);
      });
    });

    this.renderActiveTabContent(user);
  }

  renderActiveTabContent(user) {
    const content = this.root.querySelector('#tab-content');
    if (!content) return;

    if (this.currentTab === 'dash') {
      renderDashboard(content, user, () => {
        this.renderActiveTabContent(user);
      });
    } else if (this.currentTab === 'ach') {
      renderAchievements(content, user);
    } else if (this.currentTab === 'perfil') {
      renderProfile(content, user, () => {
        this.renderOnboardingScreen(user);
      });
    }
  }
}

// Start application
new App();
