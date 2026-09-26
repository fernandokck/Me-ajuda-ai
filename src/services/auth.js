/**
 * Authentication Service
 * Manages sessions, mock Google login, email login, and logout.
 * Ready for Supabase / Firebase auth replacement.
 */

import { storage } from './storage.js';

let currentUser = null;
const authListeners = new Set();

export const auth = {
  init() {
    currentUser = storage.get('current_user', null);
    return currentUser;
  },

  getCurrentUser() {
    return currentUser;
  },

  onAuthStateChanged(callback) {
    authListeners.add(callback);
    callback(currentUser);
    return () => authListeners.delete(callback);
  },

  notifyListeners() {
    authListeners.forEach((cb) => cb(currentUser));
  },

  async loginWithGoogle() {
    // In production, integrate Google Identity Services / Supabase OAuth
    const mockUser = {
      email: 'usuario@gmail.com',
      name: 'Fernando',
      provider: 'google',
      avatar: 'https://lh3.googleusercontent.com/a/default-user'
    };
    currentUser = mockUser;
    storage.set('current_user', mockUser);
    this.notifyListeners();
    return mockUser;
  },

  async loginWithEmail(email, name = '') {
    if (!email || !email.includes('@')) {
      throw new Error('E-mail inválido.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = {
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      provider: 'email'
    };
    currentUser = user;
    storage.set('current_user', user);
    this.notifyListeners();
    return user;
  },

  logout() {
    currentUser = null;
    storage.remove('current_user');
    this.notifyListeners();
  }
};
