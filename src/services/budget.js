/**
 * Budget Goals Service (Metas de Gastos por Categoria)
 */

import { storage } from './storage.js';
import { finance, curMonthKey, monthKey, CATEGORIES, fmtBRL } from './finance.js';
import { showToast } from '../components/toast.js';

export const budgetService = {
  getBudgets(userEmail) {
    // Defaults to empty object if not configured yet, so user can build their custom goals
    return storage.get(`budgets_${userEmail}`, {});
  },

  saveBudgets(userEmail, budgets) {
    storage.set(`budgets_${userEmail}`, budgets);
    return budgets;
  },

  setCategoryBudget(userEmail, category, limit) {
    const budgets = this.getBudgets(userEmail);
    budgets[category] = Number(limit);
    this.saveBudgets(userEmail, budgets);
    return budgets;
  },

  removeCategoryBudget(userEmail, category) {
    const budgets = this.getBudgets(userEmail);
    delete budgets[category];
    this.saveBudgets(userEmail, budgets);
    return budgets;
  },

  calculateCategoryProgress(userEmail, targetMonth = curMonthKey()) {
    const budgets = this.getBudgets(userEmail);
    const allTx = finance.getTransactions(userEmail);
    const monthTx = allTx.filter((t) => monthKey(t.data) === targetMonth && (t.tipo === 'gasto' || t.tipo === 'contafixa'));

    const spentByCategory = {};
    monthTx.forEach((t) => {
      const cat = t.subcategoria || (t.tipo === 'contafixa' ? 'Moradia' : 'Outros');
      spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(t.valor);
    });

    const activeCategories = Object.keys(budgets);

    const categoryList = activeCategories.map((category) => {
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

    const totalLimit = activeCategories.reduce((acc, cat) => acc + Number(budgets[cat]), 0);
    const totalSpent = activeCategories.reduce((acc, cat) => acc + (spentByCategory[cat] || 0), 0);
    const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

    return {
      categoryList,
      hasBudgets: activeCategories.length > 0,
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
    showToast(`${title} - ${body}`, 'error');

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
