/**
 * Budget Category Add / Edit Modal
 */

import { budgetService } from '../services/budget.js';
import { CATEGORIES, fmtBRL, getCategoryIcon } from '../services/finance.js';
import { showToast } from './toast.js';

export function openAddBudgetModal(userEmail, defaultCategory = '', onSaved) {
  const existing = document.getElementById('budget-add-modal');
  if (existing) existing.remove();

  const currentBudgets = budgetService.getBudgets(userEmail);
  const categories = CATEGORIES.gasto;
  const initialCategory = defaultCategory || categories[0];
  const initialLimit = currentBudgets[initialCategory] || '';

  const modal = document.createElement('div');
  modal.id = 'budget-add-modal';
  modal.className = 'badge-modal-backdrop';

  modal.innerHTML = `
    <div class="profile-modal-card" style="max-width: 400px; padding: 24px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; margin: 0;">🎯 Definir Meta de Gasto</h3>
        <button class="badge-modal-close" id="btn-close-bm" style="position: static;">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
        Escolha a categoria e o teto máximo que deseja gastar neste mês para receber alertas automáticos.
      </p>

      <form id="form-add-single-budget">
        <div class="field">
          <label for="bm-select-cat">Categoria</label>
          <select id="bm-select-cat" class="input">
            ${categories
              .map(
                (c) => `
              <option value="${c}" ${c === initialCategory ? 'selected' : ''}>
                ${getCategoryIcon(c)} ${c} ${currentBudgets[c] ? `(Atual: ${fmtBRL(currentBudgets[c])})` : ''}
              </option>
            `
              )
              .join('')}
          </select>
        </div>

        <div class="field">
          <label for="bm-input-limit">Meta de Gasto Mensal (R$)</label>
          <input 
            id="bm-input-limit" 
            type="number" 
            step="10" 
            min="1" 
            class="input" 
            placeholder="Ex: 300,00" 
            value="${initialLimit}" 
            required 
            autofocus
          >
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-bm" style="flex: 1;">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Meta</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Ask for notification permission if not yet granted
  budgetService.requestNotificationPermission();

  const selectCat = modal.querySelector('#bm-select-cat');
  const inputLimit = modal.querySelector('#bm-input-limit');

  selectCat.addEventListener('change', () => {
    const selected = selectCat.value;
    inputLimit.value = currentBudgets[selected] || '';
  });

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-bm').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-bm').addEventListener('click', closeModal);

  // Form Submit
  const form = modal.querySelector('#form-add-single-budget');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = selectCat.value;
    const limit = parseFloat(inputLimit.value);

    if (isNaN(limit) || limit <= 0) {
      showToast('Informe um valor de meta válido.', 'error');
      return;
    }

    budgetService.setCategoryBudget(userEmail, category, limit);
    showToast(`Meta de ${category} definida para ${fmtBRL(limit)}!`, 'success');
    closeModal();
    if (onSaved) onSaved();
  });
}
