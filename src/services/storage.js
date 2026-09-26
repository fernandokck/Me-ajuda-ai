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
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: userEmail,
      perfil: this.get('perfil_' + userEmail),
      transacoes: this.get('tx_' + userEmail, []),
      recorrentes: this.get('rec_' + userEmail, [])
    };
    return JSON.stringify(data, null, 2);
  },

  importData(userEmail, jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.perfil) this.set('perfil_' + userEmail, data.perfil);
      if (data.transacoes) this.set('tx_' + userEmail, data.transacoes);
      if (data.recorrentes) this.set('rec_' + userEmail, data.recorrentes);
      return true;
    } catch (e) {
      console.error('Import data error:', e);
      return false;
    }
  }
};
