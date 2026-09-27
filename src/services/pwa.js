/**
 * PWA Service
 * Handles Service Worker registration, install prompt interception,
 * and remembers if the user installed or dismissed the banner so it never bothers them again.
 */

import { storage } from './storage.js';

let deferredPrompt = null;
const installListeners = new Set();

export const pwa = {
  init() {
    // Register Service Worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registrado:', registration.scope);
          })
          .catch((err) => {
            console.warn('Falha SW:', err);
          });
      });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!this.isDismissedOrInstalled()) {
        this.notifyListeners(true);
      }
    });

    // Detect app installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      this.markAsInstalled();
      this.notifyListeners(false);
      console.log('PWA instalado com sucesso!');
    });
  },

  isDismissedOrInstalled() {
    return (
      this.isStandalone() ||
      storage.get('pwa_installed_or_dismissed', false) === true
    );
  },

  markAsInstalled() {
    storage.set('pwa_installed_or_dismissed', true);
  },

  dismissBanner() {
    this.markAsInstalled();
    this.notifyListeners(false);
  },

  onInstallAvailabilityChange(callback) {
    installListeners.add(callback);
    callback(!!deferredPrompt && !this.isDismissedOrInstalled());
    return () => installListeners.delete(callback);
  },

  notifyListeners(available) {
    installListeners.forEach((cb) => cb(available && !this.isDismissedOrInstalled()));
  },

  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  },

  async promptInstall() {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') {
      this.markAsInstalled();
    }
    this.notifyListeners(false);
    return outcome === 'accepted';
  }
};
