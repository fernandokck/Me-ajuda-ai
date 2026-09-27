/**
 * Authentication Service
 * Hybrid architecture: Supabase Google OAuth + Local-first fallback
 */

import { storage } from './storage.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

let currentUser = null;
const authListeners = new Set();

export const auth = {
  async init() {
    if (isSupabaseConfigured && supabase) {
      // Check active Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        currentUser = this.formatSupabaseUser(session.user);
        storage.set('current_user', currentUser);
      } else {
        currentUser = storage.get('current_user', null);
      }

      // Listen for OAuth callbacks (Google Login redirect)
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          currentUser = this.formatSupabaseUser(session.user);
          storage.set('current_user', currentUser);
        } else if (_event === 'SIGNED_OUT') {
          currentUser = null;
          storage.remove('current_user');
        }
        this.notifyListeners();
      });
    } else {
      currentUser = storage.get('current_user', null);
    }

    this.notifyListeners();
    return currentUser;
  },

  formatSupabaseUser(sbUser) {
    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      name: meta.full_name || meta.name || sbUser.email.split('@')[0],
      avatar: meta.avatar_url || meta.picture || '',
      provider: sbUser.app_metadata?.provider || 'supabase'
    };
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
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return null; // Browser will redirect to Google Auth
    }

    // Local-first fallback mode
    const mockUser = {
      id: 'local_user_' + Date.now(),
      email: 'usuario@gmail.com',
      name: 'Fernando',
      provider: 'google_local',
      avatar: ''
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

    if (isSupabaseConfigured && supabase) {
      // Send magic login link or sign in
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
    }

    const user = {
      id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      provider: 'email'
    };
    currentUser = user;
    storage.set('current_user', user);
    this.notifyListeners();
    return user;
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    currentUser = null;
    storage.remove('current_user');
    this.notifyListeners();
  }
};
