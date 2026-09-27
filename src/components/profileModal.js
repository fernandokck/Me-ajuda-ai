/**
 * Profile Edit & Social Media Connections Modal
 */

import { gamification } from '../services/gamification.js';
import { storage } from '../services/storage.js';
import { showToast } from './toast.js';

export function openProfileModal(user, profile, onSaved) {
  const existing = document.getElementById('profile-edit-modal');
  if (existing) existing.remove();

  const currentProfile = gamification.getProfile(user.email) || {};
  const currentAvatar = currentProfile.avatarUrl || user.avatar || '';
  const currentSocials = currentProfile.socials || {
    instagram: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    twitter: ''
  };

  const modal = document.createElement('div');
  modal.id = 'profile-edit-modal';
  modal.className = 'badge-modal-backdrop';

  modal.innerHTML = `
    <div class="profile-modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="font-size: 18px; font-weight: 800; margin: 0;">👤 Meu Perfil & Conexões</h3>
        <button class="badge-modal-close" id="btn-close-pf" style="position: static;">✕</button>
      </div>

      <div class="pf-avatar-upload-row">
        <div class="pf-avatar-preview" id="pf-avatar-preview">
          ${
            currentAvatar
              ? `<img src="${currentAvatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
              : `<span style="font-size: 28px; font-weight:800; color:#fff;">${(currentProfile.nome || user.name || 'U')[0].toUpperCase()}</span>`
          }
        </div>
        <div style="flex: 1;">
          <label class="btn btn-secondary btn-sm" style="cursor: pointer; display: inline-flex; margin-bottom: 6px;">
            📸 Alterar Foto de Perfil
            <input type="file" id="input-avatar-file" accept="image/*" style="display:none;">
          </label>
          <div style="font-size: 11.5px; color: var(--text-muted);">Suporta PNG, JPG ou fotos tiradas pelo celular.</div>
        </div>
      </div>

      <form id="form-edit-profile">
        <div class="field">
          <label for="pf-input-name">Nome Completo / Como prefere ser chamado</label>
          <input id="pf-input-name" type="text" class="input" value="${currentProfile.nome || user.name || ''}" required>
        </div>

        <div class="field">
          <label for="pf-input-email">E-mail</label>
          <input id="pf-input-email" type="email" class="input" value="${user.email}" disabled style="opacity: 0.7; background: var(--border);">
        </div>

        <div style="margin: 20px 0 10px;">
          <h4 style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">🔗 Suas Redes Sociais</h4>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Conecte seus perfis para compartilhar conquistas e evolução com um clique.</p>
        </div>

        <div class="social-input-row">
          <span class="social-input-icon">📸</span>
          <input id="pf-instagram" type="text" class="input" placeholder="Instagram (@seu_perfil)" value="${currentSocials.instagram || ''}">
        </div>

        <div class="social-input-row">
          <span class="social-input-icon">💼</span>
          <input id="pf-linkedin" type="text" class="input" placeholder="LinkedIn (ex: linkedin.com/in/voce)" value="${currentSocials.linkedin || ''}">
        </div>

        <div class="social-input-row">
          <span class="social-input-icon">🎥</span>
          <input id="pf-youtube" type="text" class="input" placeholder="YouTube (@seu_canal)" value="${currentSocials.youtube || ''}">
        </div>

        <div class="social-input-row">
          <span class="social-input-icon">🎵</span>
          <input id="pf-tiktok" type="text" class="input" placeholder="TikTok (@seu_tiktok)" value="${currentSocials.tiktok || ''}">
        </div>

        <div class="social-input-row">
          <span class="social-input-icon">𝕏</span>
          <input id="pf-twitter" type="text" class="input" placeholder="Twitter / X (@seu_user)" value="${currentSocials.twitter || ''}">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-pf" style="flex: 1;">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  let newAvatarBase64 = currentAvatar;

  // Handle avatar upload
  const fileInput = modal.querySelector('#input-avatar-file');
  const avatarPreview = modal.querySelector('#pf-avatar-preview');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      newAvatarBase64 = evt.target.result;
      avatarPreview.innerHTML = `<img src="${newAvatarBase64}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    };
    reader.readAsDataURL(file);
  });

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-pf').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-pf').addEventListener('click', closeModal);

  // Form Submit
  const form = modal.querySelector('#form-edit-profile');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = modal.querySelector('#pf-input-name').value.trim();
    const socials = {
      instagram: modal.querySelector('#pf-instagram').value.trim(),
      linkedin: modal.querySelector('#pf-linkedin').value.trim(),
      youtube: modal.querySelector('#pf-youtube').value.trim(),
      tiktok: modal.querySelector('#pf-tiktok').value.trim(),
      twitter: modal.querySelector('#pf-twitter').value.trim()
    };

    const updatedProfile = {
      ...currentProfile,
      nome: newName || currentProfile.nome,
      avatarUrl: newAvatarBase64,
      socials
    };

    gamification.saveProfile(user.email, updatedProfile, user.id);
    showToast('Perfil e redes atualizados com sucesso!', 'success');
    closeModal();
    if (onSaved) onSaved(updatedProfile);
  });
}
