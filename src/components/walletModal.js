/**
 * Wallet Add / Edit Modal Component
 * Allows adding bank accounts, crypto wallets, broker accounts with currencies:
 * BRL, USD, EUR, USDT, USDC, allocation notes, and start date.
 */

import { walletService, WALLET_TYPES } from '../services/wallet.js';
import { attachCurrencyMask, formatRawToCurrency } from '../utils/mask.js';
import { showToast } from './toast.js';

export function openWalletModal(userEmail, walletToEdit = null, onSaved) {
  const existing = document.getElementById('wallet-modal-card');
  if (existing) existing.remove();

  const isEditing = Boolean(walletToEdit);
  const modal = document.createElement('div');
  modal.id = 'wallet-modal-card';
  modal.className = 'badge-modal-backdrop';

  const defaultDate = walletToEdit ? walletToEdit.dataInicio : new Date().toISOString().slice(0, 10);
  const selectedMoeda = walletToEdit ? walletToEdit.moeda : 'BRL';
  const selectedTipo = walletToEdit ? walletToEdit.tipo : 'conta';

  modal.innerHTML = `
    <div class="profile-modal-card" style="max-width: 440px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; margin: 0;">
          ${isEditing ? '✏️ Editar Conta / Aplicação' : '➕ Nova Conta ou Aplicação'}
        </h3>
        <button class="badge-modal-close" id="btn-close-wallet-modal" style="position: static;">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
        Cadastre onde seu dinheiro está alocado (bancos, criptos, caixinhas, corretoras) para acompanhar tempo e saldo.
      </p>

      <form id="form-wallet-item">
        <div class="field">
          <label for="wm-input-nome">Nome da Conta / Instituição</label>
          <input 
            id="wm-input-nome" 
            type="text" 
            class="input" 
            placeholder="Ex: Nubank, Binance, Inter, Metamask, XP..." 
            value="${walletToEdit ? walletToEdit.nome : ''}" 
            required 
            autofocus
          >
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="wm-select-tipo">Tipo</label>
            <select id="wm-select-tipo" class="input">
              ${WALLET_TYPES.map(
                (t) => `
                <option value="${t.id}" ${t.id === selectedTipo ? 'selected' : ''}>
                  ${t.icon} ${t.label}
                </option>
              `
              ).join('')}
            </select>
          </div>

          <div class="form-field-wrapper">
            <label for="wm-select-moeda">Moeda</label>
            <select id="wm-select-moeda" class="input">
              <option value="BRL" ${selectedMoeda === 'BRL' ? 'selected' : ''}>🇧🇷 Real (BRL - R$)</option>
              <option value="USD" ${selectedMoeda === 'USD' ? 'selected' : ''}>🇺🇸 Dólar (USD - $)</option>
              <option value="EUR" ${selectedMoeda === 'EUR' ? 'selected' : ''}>🇪🇺 Euro (EUR - €)</option>
              <option value="USDT" ${selectedMoeda === 'USDT' ? 'selected' : ''}>🪙 Tether (USDT)</option>
              <option value="USDC" ${selectedMoeda === 'USDC' ? 'selected' : ''}>🪙 USD Coin (USDC)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="wm-input-saldo" id="wm-lbl-saldo">Saldo Atual</label>
            <input 
              id="wm-input-saldo" 
              type="text" 
              inputmode="numeric"
              class="input" 
              placeholder="0,00" 
              value="${walletToEdit ? formatRawToCurrency(Math.round(walletToEdit.saldo * 100), selectedMoeda) : ''}" 
              required
            >
          </div>

          <div class="form-field-wrapper">
            <label for="wm-input-data">Data de Início / Aplicação</label>
            <input 
              id="wm-input-data" 
              type="date" 
              class="input input-date-clean" 
              value="${defaultDate}" 
              required
            >
          </div>
        </div>

        <div class="field">
          <label for="wm-input-obs">Observações / Detalhes (Opcional)</label>
          <input 
            id="wm-input-obs" 
            type="text" 
            class="input" 
            placeholder="Ex: Caixinha 100% CDI, Staking 4%, Reserva de emergência..." 
            value="${walletToEdit ? walletToEdit.obs : ''}"
          >
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-wallet" style="flex: 1;">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="flex: 2;">
            ${isEditing ? 'Salvar Alterações' : 'Adicionar à Carteira'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-wallet-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-wallet').addEventListener('click', closeModal);

  // Mask attach
  const inputSaldo = modal.querySelector('#wm-input-saldo');
  const selectMoedaEl = modal.querySelector('#wm-select-moeda');
  const mask = attachCurrencyMask(inputSaldo, () => selectMoedaEl ? selectMoedaEl.value : 'BRL');

  if (selectMoedaEl) {
    selectMoedaEl.addEventListener('change', () => {
      if (mask) mask.reformat();
    });
  }

  // Form Submit
  const form = modal.querySelector('#form-wallet-item');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = modal.querySelector('#wm-input-nome').value.trim();
    const tipo = modal.querySelector('#wm-select-tipo').value;
    const moeda = modal.querySelector('#wm-select-moeda').value;
    const saldo = mask ? mask.getNumericValue() : inputSaldo.value;
    const dataInicio = modal.querySelector('#wm-input-data').value;
    const obs = modal.querySelector('#wm-input-obs').value.trim();

    try {
      if (isEditing) {
        walletService.updateWallet(userEmail, walletToEdit.id, {
          nome,
          tipo,
          moeda,
          saldo,
          dataInicio,
          obs
        });
        showToast('Conta atualizada com sucesso!', 'success');
      } else {
        walletService.addWallet(userEmail, {
          nome,
          tipo,
          moeda,
          saldo,
          dataInicio,
          obs
        });
        showToast('Nova conta adicionada à sua carteira!', 'success');
      }
      closeModal();
      if (onSaved) onSaved();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar', 'error');
    }
  });
}
