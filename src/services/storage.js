/**
 * Storage Service - Local-first architecture with easy cloud synchronization hook
 */

const STORAGE_PREFIX = 'meajuda_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },

  exportData(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: cleanEmail,
      perfil: this.get('perfil_' + cleanEmail, null),
      transacoes: this.get('tx_' + cleanEmail, []),
      recorrentes: this.get('rec_' + cleanEmail, []),
      carteira: this.get('wallets_' + cleanEmail, []),
      budgets: this.get('budgets_' + cleanEmail, {})
    };
    return JSON.stringify(data, null, 2);
  },

  importData(userEmail, jsonString) {
    try {
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (data.perfil) this.set('perfil_' + cleanEmail, data.perfil);
      if (Array.isArray(data.transacoes)) this.set('tx_' + cleanEmail, data.transacoes);
      if (Array.isArray(data.recorrentes)) this.set('rec_' + cleanEmail, data.recorrentes);
      if (Array.isArray(data.carteira)) this.set('wallets_' + cleanEmail, data.carteira);
      if (data.budgets) this.set('budgets_' + cleanEmail, data.budgets);
      return { success: true, count: (data.transacoes?.length || 0) + (data.carteira?.length || 0) };
    } catch (e) {
      console.error('Import data error:', e);
      return { success: false, error: e.message };
    }
  }
};
