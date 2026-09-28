/**
 * Edit Transaction Modal Component
 * Allows editing any registered transaction (description, type, category, currency, value, date)
 * without having to delete and recreate it.
 */

import {
  finance,
  CATEGORIES,
  getCategoryIcon
} from '../services/finance.js';
import { attachCurrencyMask, formatRawToCurrency } from '../utils/mask.js';
import { showToast } from './toast.js';

export function openTransactionEditModal(user, transaction, onSaved) {
  const existing = document.getElementById('transaction-edit-modal-card');
  if (existing) existing.remove();

  const userEmail = user.email;
  const modal = document.createElement('div');
  modal.id = 'transaction-edit-modal-card';
  modal.className = 'badge-modal-backdrop';

  const curTipo = transaction.tipo || 'gasto';
  const curMoeda = transaction.moeda || 'BRL';
  const curData = transaction.data || new Date().toISOString().slice(0, 10);
  const curDesc = transaction.desc || '';
  const curSubcat = transaction.subcategoria || '';
  const curValorFormatted = formatRawToCurrency(Math.round(Number(transaction.valor) * 100), curMoeda);

  modal.innerHTML = `
    <div class="profile-modal-card" style="max-width: 440px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; margin: 0; color: var(--text-main);">
          ✏️ Editar Lançamento
        </h3>
        <button class="badge-modal-close" id="btn-close-tx-edit-modal" style="position: static;">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
        Altere qualquer detalhe do lançamento. Suas metas, gráficos e saldo serão recalculados automaticamente.
      </p>

      <form id="form-edit-tx-item">
        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="edit-tx-tipo">Tipo de Lançamento</label>
            <select id="edit-tx-tipo" class="input">
              <option value="salario" ${curTipo === 'salario' ? 'selected' : ''}>Salário / Renda</option>
              <option value="freelance" ${curTipo === 'freelance' ? 'selected' : ''}>Free Lancer</option>
              <option value="contafixa" ${curTipo === 'contafixa' ? 'selected' : ''}>Conta Fixa</option>
              <option value="gasto" ${curTipo === 'gasto' ? 'selected' : ''}>Gasto Variável</option>
              <option value="investimento" ${curTipo === 'investimento' ? 'selected' : ''}>Investimento</option>
            </select>
          </div>

          <div class="form-field-wrapper">
            <label for="edit-tx-data">Data</label>
            <input id="edit-tx-data" type="date" class="input input-date-clean" value="${curData}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="edit-tx-desc">Descrição</label>
            <input 
              id="edit-tx-desc" 
              type="text" 
              class="input" 
              placeholder="Ex: Supermercado, Aluguel..." 
              value="${curDesc}" 
              required
            >
          </div>

          <div class="form-field-wrapper">
            <label for="edit-tx-valor" id="edit-lbl-tx-valor">Valor (${curMoeda})</label>
            <input 
              id="edit-tx-valor" 
              type="text" 
              inputmode="numeric" 
              class="input" 
              placeholder="0,00" 
              value="${curValorFormatted}" 
              required
            >
          </div>
        </div>

        <!-- Moeda selector (Visible for Investimento or non-BRL) -->
        <div class="form-row ${curTipo === 'investimento' || curMoeda !== 'BRL' ? '' : 'hidden'}" id="edit-row-moeda">
          <div class="form-field-wrapper" style="grid-column: 1 / -1;">
            <label for="edit-tx-moeda">Moeda</label>
            <select id="edit-tx-moeda" class="input">
              <option value="BRL" ${curMoeda === 'BRL' ? 'selected' : ''}>🇧🇷 Real Brasileiro (BRL - R$)</option>
              <option value="USD" ${curMoeda === 'USD' ? 'selected' : ''}>🇺🇸 Dólar Americano (USD - $)</option>
              <option value="EUR" ${curMoeda === 'EUR' ? 'selected' : ''}>🇪🇺 Euro (EUR - €)</option>
            </select>
          </div>
        </div>

        <!-- Category selector -->
        <div class="form-row ${curTipo === 'salario' || curTipo === 'freelance' ? 'hidden' : ''}" id="edit-row-subcat">
          <div class="form-field-wrapper" style="grid-column: 1 / -1;">
            <label for="edit-tx-subcat">Categoria</label>
            <select id="edit-tx-subcat" class="input">
              <!-- populated dynamically -->
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-tx-edit" style="flex: 1;">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-tx-edit-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-tx-edit').addEventListener('click', closeModal);

  // Form Elements
  const selectTipo = modal.querySelector('#edit-tx-tipo');
  const selectMoeda = modal.querySelector('#edit-tx-moeda');
  const rowMoeda = modal.querySelector('#edit-row-moeda');
  const rowSubcat = modal.querySelector('#edit-row-subcat');
  const selectSubcat = modal.querySelector('#edit-tx-subcat');
  const inputValor = modal.querySelector('#edit-tx-valor');
  const lblValor = modal.querySelector('#edit-lbl-tx-valor');

  function updateCategories() {
    const tipo = selectTipo.value;
    let cats = [];
    if (tipo === 'gasto' || tipo === 'contafixa') {
      cats = CATEGORIES.gasto || [];
      rowSubcat.classList.remove('hidden');
    } else if (tipo === 'investimento') {
      cats = CATEGORIES.investimento || [];
      rowSubcat.classList.remove('hidden');
    } else {
      rowSubcat.classList.add('hidden');
    }

    if (cats.length > 0) {
      selectSubcat.innerHTML = cats
        .map((c) => `<option value="${c}" ${c === curSubcat ? 'selected' : ''}>${getCategoryIcon(c)} ${c}</option>`)
        .join('');
    }
  }

  // Currency Mask Setup
  const mask = attachCurrencyMask(inputValor, () => {
    if (selectTipo.value === 'investimento' && selectMoeda) {
      return selectMoeda.value;
    }
    return selectMoeda ? selectMoeda.value : 'BRL';
  });

  function updateCurrencyLabels() {
    const isInvest = selectTipo.value === 'investimento';
    const moeda = (isInvest && selectMoeda) ? selectMoeda.value : (selectMoeda ? selectMoeda.value : 'BRL');
    
    if (isInvest) {
      rowMoeda.classList.remove('hidden');
    } else {
      rowMoeda.classList.add('hidden');
    }

    if (moeda === 'USD') {
      if (lblValor) lblValor.textContent = 'Valor ($ - Dólar)';
      inputValor.placeholder = '0.00';
    } else if (moeda === 'EUR') {
      if (lblValor) lblValor.textContent = 'Valor (€ - Euro)';
      inputValor.placeholder = '0,00';
    } else {
      if (lblValor) lblValor.textContent = 'Valor (R$ - Real)';
      inputValor.placeholder = '0,00';
    }
    if (mask) mask.reformat();
  }

  updateCategories();
  updateCurrencyLabels();

  selectTipo.addEventListener('change', () => {
    updateCategories();
    updateCurrencyLabels();
  });

  if (selectMoeda) {
    selectMoeda.addEventListener('change', () => {
      updateCurrencyLabels();
    });
  }

  // Form Submit
  const form = modal.querySelector('#form-edit-tx-item');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = selectTipo.value;
    const data = modal.querySelector('#edit-tx-data').value;
    const desc = modal.querySelector('#edit-tx-desc').value.trim();
    const valor = mask ? mask.getNumericValue() : inputValor.value;
    const moeda = (tipo === 'investimento' && selectMoeda) ? selectMoeda.value : 'BRL';
    const subcategoria = !rowSubcat.classList.contains('hidden') ? selectSubcat.value : '';

    try {
      await finance.updateTransaction(userEmail, transaction.id, {
        tipo,
        data,
        desc,
        valor,
        subcategoria,
        moeda
      });
      showToast('Lançamento atualizado com sucesso!', 'success');
      closeModal();
      if (onSaved) onSaved();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar lançamento.', 'error');
    }
  });
}
