/**
 * Budget Goals Configuration Modal
 */

import { budgetService, DEFAULT_BUDGETS } from '../services/budget.js';
import { CATEGORIES, fmtBRL } from '../services/finance.js';
import { showToast } from './toast.js';

export function openBudgetModal(userEmail, onSaved) {
  const existing = document.getElementById('budget-edit-modal');
  if (existing) existing.remove();

  const currentBudgets = budgetService.getBudgets(userEmail);
  const categories = CATEGORIES.gasto;

  const modal = document.createElement('div');
  modal.id = 'budget-edit-modal';
  modal.className = 'badge-modal-backdrop';

  modal.innerHTML = `
    <div class="profile-modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 18px; font-weight: 800; margin: 0;">🎯 Definir Metas de Gastos</h3>
          <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">Estabeleça o teto máximo de gastos mensais por categoria.</p>
        </div>
        <button class="badge-modal-close" id="btn-close-budget" style="position: static;">✕</button>
      </div>

      <div class="budget-notification-banner">
        <span style="font-size: 20px;">🔔</span>
        <div style="flex: 1; font-size: 12px; color: var(--text-main); line-height: 1.4;">
          <strong>Alertas Inteligentes:</strong> O app te avisará automaticamente no celular quando seus gastos atingirem <strong>80%</strong> ou ultrapassarem a meta.
        </div>
      </div>

      <form id="form-edit-budgets" style="display: flex; flex-direction: column; gap: 12px;">
        ${categories
          .map((cat) => {
            const currentVal = currentBudgets[cat] !== undefined ? currentBudgets[cat] : (DEFAULT_BUDGETS[cat] || 200);
            return `
            <div class="budget-input-group">
              <label for="budget-${cat}">
                <span>${getCategoryIcon(cat)}</span>
                <strong>${cat}</strong>
              </label>
              <div class="budget-input-wrapper">
                <span class="currency-prefix">R$</span>
                <input 
                  id="budget-${cat}" 
                  type="number" 
                  step="10" 
                  min="0" 
                  class="input budget-field" 
                  data-cat="${cat}" 
                  value="${currentVal}" 
                  placeholder="0,00"
                >
              </div>
            </div>
          `;
          })
          .join('')}

        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-budget" style="flex: 1;">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Metas 🎯</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Ask for notification permission if not yet requested
  budgetService.requestNotificationPermission();

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-budget').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-budget').addEventListener('click', closeModal);

  // Form Submit
  const form = modal.querySelector('#form-edit-budgets');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newBudgets = {};
    modal.querySelectorAll('.budget-field').forEach((input) => {
      const cat = input.dataset.cat;
      newBudgets[cat] = Math.max(0, parseFloat(input.value) || 0);
    });

    budgetService.saveBudgets(userEmail, newBudgets);
    showToast('Metas de gastos salvas com sucesso!', 'success');
    closeModal();
    if (onSaved) onSaved();
  });
}

function getCategoryIcon(cat) {
  const map = {
    'Alimentação': '🛒',
    'Lanches/Besteiras': '🍔',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '💊',
    'Educação': '📚',
    'Outros': '📦'
  };
  return map[cat] || '🏷️';
}
