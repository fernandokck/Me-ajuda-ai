/**
 * Wallet Add / Edit Modal Component
 * Allows adding bank accounts, crypto wallets with real-time daily market prices,
 * broker accounts, currencies (BRL, USD, EUR, USDT, USDC), allocation notes, and start date.
 */

import { walletService, WALLET_TYPES } from '../services/wallet.js';
import { cryptoService, SUPPORTED_CRYPTOS } from '../services/crypto.js';
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
  const selectedCrypto = walletToEdit ? (walletToEdit.cryptoSymbol || 'BTC') : 'BTC';
  const initialCryptoQty = walletToEdit && walletToEdit.cryptoQty ? walletToEdit.cryptoQty : '';
  const autoUpdatePrice = walletToEdit && walletToEdit.autoUpdatePrice !== undefined ? walletToEdit.autoUpdatePrice : true;

  modal.innerHTML = `
    <div class="profile-modal-card" style="max-width: 460px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; margin: 0;">
          ${isEditing ? '✏️ Editar Conta / Aplicação' : '➕ Nova Conta ou Aplicação'}
        </h3>
        <button class="badge-modal-close" id="btn-close-wallet-modal" style="position: static;">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
        Cadastre onde seu dinheiro está alocado (bancos, criptomoedas com cotação do dia, caixinhas, corretoras) para acompanhar tempo e saldo.
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
            <label for="wm-select-moeda">Moeda de Referência</label>
            <select id="wm-select-moeda" class="input">
              <option value="BRL" ${selectedMoeda === 'BRL' ? 'selected' : ''}>🇧🇷 Real (BRL - R$)</option>
              <option value="USD" ${selectedMoeda === 'USD' ? 'selected' : ''}>🇺🇸 Dólar (USD - $)</option>
              <option value="EUR" ${selectedMoeda === 'EUR' ? 'selected' : ''}>🇪🇺 Euro (EUR - €)</option>
              <option value="USDT" ${selectedMoeda === 'USDT' ? 'selected' : ''}>🪙 Tether (USDT)</option>
              <option value="USDC" ${selectedMoeda === 'USDC' ? 'selected' : ''}>🪙 USD Coin (USDC)</option>
            </select>
          </div>
        </div>

        <!-- Seção Dinâmica de Criptomoedas (Cotação ao Vivo) -->
        <div id="wm-crypto-section" class="${selectedTipo === 'cripto' ? '' : 'hidden'}" style="margin-bottom: 12px; padding: 12px; background: var(--surface-hover); border: 1px solid var(--border); border-radius: var(--radius-md);">
          <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: var(--brand); letter-spacing: 0.04em; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
            <span>🪙</span> Cotação de Mercado em Tempo Real
          </div>

          <div class="form-row">
            <div class="form-field-wrapper">
              <label for="wm-select-crypto-asset">Criptomoeda</label>
              <select id="wm-select-crypto-asset" class="input">
                ${SUPPORTED_CRYPTOS.map(
                  (c) => `
                  <option value="${c.symbol}" ${c.symbol === selectedCrypto ? 'selected' : ''}>
                    ${c.icon} ${c.name} (${c.symbol})
                  </option>
                `
                ).join('')}
              </select>
            </div>

            <div class="form-field-wrapper">
              <label for="wm-input-crypto-qty">Quantidade de Moedas</label>
              <input 
                id="wm-input-crypto-qty" 
                type="number" 
                step="any" 
                min="0" 
                class="input" 
                placeholder="Ex: 0.05"
                value="${initialCryptoQty}"
              >
            </div>
          </div>

          <!-- Live Market Price Box -->
          <div id="wm-box-crypto-quote" class="crypto-market-quote-box" style="margin-top: 8px;">
            <!-- Rendered dynamically -->
          </div>

          <div class="check-row" style="margin-top: 8px; font-size: 12px;">
            <input type="checkbox" id="wm-check-auto-update" ${autoUpdatePrice ? 'checked' : ''}>
            <label for="wm-check-auto-update" style="cursor: pointer; color: var(--text-main);">
              Atualizar saldo automaticamente com o preço de mercado todo dia
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="wm-input-saldo" id="wm-lbl-saldo">Saldo Estimado</label>
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
            placeholder="Ex: Carteira fria, Staking 4%, Reserva de emergência..." 
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

  // Form Elements
  const selectTipo = modal.querySelector('#wm-select-tipo');
  const cryptoSection = modal.querySelector('#wm-crypto-section');
  const selectCrypto = modal.querySelector('#wm-select-crypto-asset');
  const inputCryptoQty = modal.querySelector('#wm-input-crypto-qty');
  const boxCryptoQuote = modal.querySelector('#wm-box-crypto-quote');
  const checkAutoUpdate = modal.querySelector('#wm-check-auto-update');
  const inputNome = modal.querySelector('#wm-input-nome');
  const inputSaldo = modal.querySelector('#wm-input-saldo');
  const selectMoedaEl = modal.querySelector('#wm-select-moeda');

  const mask = attachCurrencyMask(inputSaldo, () => selectMoedaEl ? selectMoedaEl.value : 'BRL');

  function updateCryptoQuoteUI() {
    if (selectTipo.value !== 'cripto') {
      cryptoSection.classList.add('hidden');
      return;
    }

    cryptoSection.classList.remove('hidden');
    const sym = selectCrypto.value;
    const qty = parseFloat(inputCryptoQty.value) || 0;
    const cur = selectMoedaEl ? selectMoedaEl.value : 'BRL';

    const holding = cryptoService.calculateHoldingValue(sym, qty, cur);
    const unitPrice = cur === 'USD' ? holding.unitPriceUSD : holding.unitPriceBRL;
    const unitPriceFmt = cur === 'USD' ? `$ ${holding.unitPriceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `R$ ${holding.unitPriceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalFmt = cur === 'USD' ? `$ ${holding.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `R$ ${holding.valueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const changeBadge = holding.change24h !== undefined ? `
      <span class="crypto-change-pill ${holding.change24h >= 0 ? 'up' : 'down'}">
        ${holding.change24h >= 0 ? '▲ +' : '▼ '}${holding.change24h}% (24h)
      </span>
    ` : '';

    boxCryptoQuote.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
        <div>
          <span style="font-size: 11px; color: var(--text-muted);">Cotação do dia:</span>
          <strong style="font-size: 12.5px; color: var(--text-main); margin-left: 4px;">1 ${sym} = ${unitPriceFmt}</strong>
        </div>
        ${changeBadge}
      </div>
      ${
        qty > 0
          ? `
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11.5px; color: var(--text-muted);">${qty} ${sym} equivalem a:</span>
          <strong style="font-size: 14px; color: var(--green);">${totalFmt}</strong>
        </div>
      `
          : ''
      }
    `;

    // If auto update is enabled and quantity is provided, update saldo input automatically
    if (checkAutoUpdate.checked && qty > 0) {
      inputSaldo.value = formatRawToCurrency(Math.round(holding.displayValue * 100), cur);
      if (mask) mask.reformat();
    }
  }

  // Pre-fetch live prices immediately when modal opens
  cryptoService.fetchMarketPrices().then(() => {
    updateCryptoQuoteUI();
  });

  selectTipo.addEventListener('change', () => {
    if (selectTipo.value === 'cripto') {
      if (!inputNome.value.trim() && selectCrypto) {
        inputNome.value = `Carteira ${selectCrypto.value}`;
      }
    }
    updateCryptoQuoteUI();
  });

  selectCrypto.addEventListener('change', () => {
    if (!walletToEdit && inputNome.value.startsWith('Carteira ')) {
      inputNome.value = `Carteira ${selectCrypto.value}`;
    }
    updateCryptoQuoteUI();
  });

  inputCryptoQty.addEventListener('input', () => {
    updateCryptoQuoteUI();
  });

  checkAutoUpdate.addEventListener('change', () => {
    updateCryptoQuoteUI();
  });

  if (selectMoedaEl) {
    selectMoedaEl.addEventListener('change', () => {
      if (mask) mask.reformat();
      updateCryptoQuoteUI();
    });
  }

  // Initial call
  updateCryptoQuoteUI();

  // Form Submit
  const form = modal.querySelector('#form-wallet-item');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = modal.querySelector('#wm-input-nome').value.trim();
    const tipo = selectTipo.value;
    const moeda = selectMoedaEl.value;
    const dataInicio = modal.querySelector('#wm-input-data').value;
    const obs = modal.querySelector('#wm-input-obs').value.trim();

    const isCrypto = tipo === 'cripto';
    const cryptoSymbol = isCrypto ? selectCrypto.value : null;
    const cryptoQty = isCrypto && inputCryptoQty.value ? parseFloat(inputCryptoQty.value) : null;
    const autoUpdate = isCrypto ? checkAutoUpdate.checked : false;

    let saldo = mask ? mask.getNumericValue() : parseFloat(inputSaldo.value);
    if (isCrypto && cryptoSymbol && cryptoQty > 0 && autoUpdate) {
      const holding = cryptoService.calculateHoldingValue(cryptoSymbol, cryptoQty, moeda);
      saldo = Number(holding.displayValue.toFixed(2));
    }

    try {
      if (isEditing) {
        walletService.updateWallet(userEmail, walletToEdit.id, {
          nome,
          tipo,
          moeda,
          saldo,
          dataInicio,
          obs,
          cryptoSymbol,
          cryptoQty,
          autoUpdatePrice: autoUpdate
        });
        showToast('Conta atualizada com sucesso!', 'success');
      } else {
        walletService.addWallet(userEmail, {
          nome,
          tipo,
          moeda,
          saldo,
          dataInicio,
          obs,
          cryptoSymbol,
          cryptoQty,
          autoUpdatePrice: autoUpdate
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
