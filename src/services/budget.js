/**
 * Budget Goals Service (Metas de Gastos por Categoria)
 * Manages category limits, monthly calculations, and browser/in-app threshold notifications.
 */

import { storage } from './storage.js';
import { finance, curMonthKey, monthKey, CATEGORIES, fmtBRL } from './finance.js';
import { showToast } from '../components/toast.js';

export const DEFAULT_BUDGETS = {
  'Alimentação': 500,
  'Lazer': 300,
  'Transporte': 250,
  'Lanches/Besteiras': 150,
  'Moradia': 1200,
  'Saúde': 200,
  'Educação': 300,
  'Outros': 200
};

export const budgetService = {
  getBudgets(userEmail) {
    return storage.get(`budgets_${userEmail}`, DEFAULT_BUDGETS);
  },

  saveBudgets(userEmail, budgets) {
    storage.set(`budgets_${userEmail}`, budgets);
    return budgets;
  },

  calculateCategoryProgress(userEmail, targetMonth = curMonthKey()) {
    const budgets = this.getBudgets(userEmail);
    const allTx = finance.getTransactions(userEmail);
    const monthTx = allTx.filter((t) => monthKey(t.data) === targetMonth && t.tipo === 'gasto');

    const spentByCategory = {};
    monthTx.forEach((t) => {
      const cat = t.subcategoria || 'Outros';
      spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(t.valor);
    });

    const categoryList = Object.keys(budgets).map((category) => {
      const limit = Number(budgets[category]) || 0;
      const spent = spentByCategory[category] || 0;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'normal'; // normal (< 80%), warning (>= 80% and < 100%), exceeded (>= 100%)
      if (pct >= 100) status = 'exceeded';
      else if (pct >= 80) status = 'warning';

      return {
        category,
        limit,
        spent,
        pct,
        remaining: Math.max(0, limit - spent),
        status
      };
    });

    // Total budget summary
    const totalLimit = Object.values(budgets).reduce((a, b) => a + Number(b), 0);
    const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + Number(b), 0);
    const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

    return {
      categoryList,
      totalLimit,
      totalSpent,
      totalPct
    };
  },

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
  },

  triggerNotification(title, body) {
    // In-App floating toast
    showToast(`${title} - ${body}`, 'error');

    // Browser / Mobile Native Push Notification (if granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/icons/icon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200]
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/icons/icon.svg' });
        });
      } catch (e) {
        try {
          new Notification(title, { body, icon: '/icons/icon.svg' });
        } catch (err) {}
      }
    }
  },

  checkBudgetAlert(userEmail, category) {
    if (!category) return;
    const progress = this.calculateCategoryProgress(userEmail);
    const item = progress.categoryList.find((c) => c.category === category);
    if (!item || item.limit <= 0) return;

    if (item.status === 'exceeded') {
      this.triggerNotification(
        `🚨 Limite Excedido em ${category}!`,
        `Você ultrapassou a meta de ${fmtBRL(item.limit)} (Gastou ${fmtBRL(item.spent)} · ${item.pct}%).`
      );
    } else if (item.status === 'warning') {
      this.triggerNotification(
        `⚠️ Atenção: Limite de ${category} próximo!`,
        `Você já consumiu ${item.pct}% da sua meta de ${fmtBRL(item.limit)} (Restam ${fmtBRL(item.remaining)}).`
      );
    }
  }
};
