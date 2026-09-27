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
import { renderScoreView } from './components/score.js';
import { renderAchievements } from './components/achievements.js';
import { renderProfile } from './components/profile.js';
import { renderBottomNav } from './components/bottomNav.js';

class App {
  constructor() {
    this.root = document.getElementById('app-root');
    this.currentTab = 'dash';
    this.isDark = storage.get('theme', 'light') === 'dark';
    
    this.init();
  }

  async init() {
    this.applyTheme();
    pwa.init();

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        this.renderLoginScreen();
      } else {
        // Sync with cloud if Supabase is active
        await Promise.all([
          finance.syncWithCloud(user),
          gamification.syncProfileFromCloud(user)
        ]);

        finance.generateRecurring(user.email);
        const profile = gamification.getProfile(user.email);
        if (!profile) {
          this.renderOnboardingScreen(user);
        } else {
          this.renderAppShell(user, profile);
        }
      }
    });

    await auth.init();
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
    renderLogin(this.root, async (user) => {
      await Promise.all([
        finance.syncWithCloud(user),
        gamification.syncProfileFromCloud(user)
      ]);
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
        <main id="tab-content"></main>
        <div id="dock-container"></div>
      </div>
    `;

    // Render header
    const headerContainer = this.root.querySelector('#header-container');
    renderHeader(headerContainer, {
      user,
      profile,
      isDark: this.isDark,
      onLogout: () => auth.logout(),
      onThemeToggle: () => this.toggleTheme(user, profile),
      onProfileUpdated: (updatedProfile) => {
        this.renderAppShell(user, updatedProfile);
      }
    });

    // Render Bottom App Dock Navigation
    const dockContainer = this.root.querySelector('#dock-container');
    renderBottomNav(dockContainer, this.currentTab, (tabId) => {
      this.currentTab = tabId;
      this.renderActiveTabContent(user, profile);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    this.renderActiveTabContent(user, profile);
  }

  renderActiveTabContent(user, profile) {
    const content = this.root.querySelector('#tab-content');
    if (!content) return;

    if (this.currentTab === 'dash') {
      renderDashboard(content, user, () => {
        this.renderActiveTabContent(user, profile);
      });
    } else if (this.currentTab === 'score') {
      renderScoreView(content, user);
    } else if (this.currentTab === 'ach') {
      renderAchievements(content, user);
    } else if (this.currentTab === 'perfil') {
      renderProfile(content, user, () => {
        this.renderOnboardingScreen(user);
      }, (up) => {
        this.renderAppShell(user, up);
      });
    }
  }
}

// Start application
new App();
