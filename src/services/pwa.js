/**
 * PWA Service
 * Handles Service Worker registration and PWA installation prompt
 */

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
            console.log('SW registrado com sucesso:', registration.scope);
          })
          .catch((err) => {
            console.warn('Falha ao registrar SW:', err);
          });
      });
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      this.notifyListeners(true);
    });

    // Detect app installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      this.notifyListeners(false);
      console.log('PWA foi instalado com sucesso!');
    });
  },

  onInstallAvailabilityChange(callback) {
    installListeners.add(callback);
    callback(!!deferredPrompt);
    return () => installListeners.delete(callback);
  },

  notifyListeners(available) {
    installListeners.forEach((cb) => cb(available));
  },

  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  },

  async promptInstall() {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    this.notifyListeners(false);
    return outcome === 'accepted';
  }
};
