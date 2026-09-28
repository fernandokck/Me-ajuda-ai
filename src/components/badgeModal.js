/**
 * 3D Badge Celebration Modal Component
 * Displays special 3D animation when a badge or milestone is unlocked,
 * with direct social media sharing (Instagram, WhatsApp, Twitter/X, LinkedIn, Web Share API).
 */

import confetti from 'canvas-confetti';
import { showToast } from './toast.js';
import { SOCIAL_ICONS } from './icons.js';

export function showBadgeModal3D(badge, user) {
  // Remove any existing badge modal
  const existing = document.getElementById('badge-modal-3d');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'badge-modal-3d';
  modal.className = 'badge-modal-backdrop';

  const shareText = `🚀 Conquistei "${badge.titulo || badge.nome}" no Me ajuda aí! Gerenciando minhas finanças e subindo de nível financeiro.`;
  const shareUrl = window.location.origin;

  modal.innerHTML = `
    <div class="badge-modal-card-3d">
      <button class="badge-modal-close" id="btn-close-modal">✕</button>
      
      <div class="badge-3d-glow" style="background: radial-gradient(circle, ${badge.cor || '#3b5bfd'}55 0%, transparent 70%);"></div>
      
      <div class="badge-3d-coin-wrapper">
        <div class="badge-3d-coin" style="border-color: ${badge.cor || '#3b5bfd'}; box-shadow: 0 0 35px ${badge.cor || '#3b5bfd'}66;">
          <span class="badge-3d-emoji">${badge.icone || '🏆'}</span>
        </div>
      </div>

      <div class="badge-modal-tag">NOVA CONQUISTA DESBLOQUEADA!</div>
      <h2 class="badge-modal-title" style="color: ${badge.cor || 'var(--text-main)'};">${badge.titulo || badge.nome}</h2>
      <p class="badge-modal-desc">${badge.desc || 'Parabéns pela sua dedicação e controle financeiro!'}</p>

      <div class="badge-share-box">
        <button id="btn-native-share" class="btn btn-primary btn-block" style="margin-bottom: 12px; font-size: 15px; padding: 14px;">
          <span>🚀</span> Compartilhar Conquista
        </button>

        <div class="social-share-row">
          <button class="social-share-btn btn-wa" id="btn-share-wa" title="Compartilhar no WhatsApp">
            ${SOCIAL_ICONS.whatsapp} WhatsApp
          </button>
          <button class="social-share-btn btn-in" id="btn-share-in" title="Compartilhar no LinkedIn">
            ${SOCIAL_ICONS.linkedin} LinkedIn
          </button>
          <button class="social-share-btn btn-x" id="btn-share-x" title="Copiar texto para Instagram/Redes">
            ${SOCIAL_ICONS.instagram} Instagram
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Confetti explosion
  try {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 300);
  } catch (e) {}

  // Close modal
  const closeModal = () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 280);
  };

  modal.querySelector('#btn-close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Native Web Share API
  modal.querySelector('#btn-native-share').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Nova Conquista: ${badge.titulo || badge.nome}`,
          text: shareText,
          url: shareUrl
        });
        showToast('Conquista compartilhada com sucesso!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  });

  // WhatsApp Share
  modal.querySelector('#btn-share-wa').addEventListener('click', () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  });

  // Twitter/X Share
  modal.querySelector('#btn-share-x').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  });

  // LinkedIn Share
  modal.querySelector('#btn-share-in').addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  });

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Texto copiado! Cole no seu Instagram ou rede social favorita ✨', 'success');
  }
}
