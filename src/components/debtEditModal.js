/**
 * Debt Add / Edit Modal Component (Pagamento Pendente / Dívida Parcelada)
 * Allows creating and updating debts, calculating installments and total balances in real time.
 */

import { debtService, DEBT_CATEGORIES, getDebtCategoryIcon } from '../services/debt.js';
import { fmtBRL, todayKey } from '../services/finance.js';
import { attachCurrencyMask, formatRawToCurrency } from '../utils/mask.js';
import { showToast } from './toast.js';

export function openDebtEditModal(userEmail, debtToEdit = null, onSaved) {
  const existing = document.getElementById('debt-edit-modal-card');
  if (existing) existing.remove();

  const isEditing = Boolean(debtToEdit);
  const modal = document.createElement('div');
  modal.id = 'debt-edit-modal-card';
  modal.className = 'badge-modal-backdrop';

  const defaultDate = debtToEdit ? debtToEdit.dataInicio : todayKey();
  const selectedCat = debtToEdit ? debtToEdit.categoria : 'Dívidas & Empréstimos';
  const totalParcelas = debtToEdit ? debtToEdit.totalParcelas : 12;
  const parcelasPagas = debtToEdit ? debtToEdit.parcelasPagas : 0;
  const diaVencimento = debtToEdit ? debtToEdit.diaVencimento : 10;
  const valorTotal = debtToEdit ? debtToEdit.valorTotal : 0;
  const valorParcela = debtToEdit ? debtToEdit.valorParcela : 0;
  const observacoes = debtToEdit ? debtToEdit.observacoes : '';

  modal.innerHTML = `
    <div class="profile-modal-card" style="max-width: 480px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="font-size: 17px; font-weight: 800; margin: 0;">
          ${isEditing ? '✏️ Editar Pagamento Pendente' : '➕ Novo Pagamento Pendente'}
        </h3>
        <button class="badge-modal-close" id="btn-close-debt-edit-modal" style="position: static;">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45;">
        Cadastre sua dívida, empréstimo ou compra parcelada. Conforme for pagando cada mês, desconte uma parcela para acompanhar quanto ainda falta pagar.
      </p>

      <form id="form-debt-edit">
        <div class="field">
          <label for="dm-input-nome">Nome da Dívida / Pagamento</label>
          <input 
            id="dm-input-nome" 
            type="text" 
            class="input" 
            placeholder="Ex: Financiamento Carro, Notebook Dell, Empréstimo..." 
            value="${debtToEdit ? debtToEdit.nome : ''}" 
            required 
            autofocus
          >
        </div>

        <div class="field">
          <label for="dm-select-cat">Categoria</label>
          <select id="dm-select-cat" class="input">
            ${DEBT_CATEGORIES.map(
              (c) => `
              <option value="${c}" ${c === selectedCat ? 'selected' : ''}>
                ${getDebtCategoryIcon(c)} ${c}
              </option>
            `
            ).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="dm-input-total">Valor Total da Dívida</label>
            <input 
              id="dm-input-total" 
              type="text" 
              inputmode="numeric" 
              class="input" 
              placeholder="0,00" 
              value="${valorTotal > 0 ? formatRawToCurrency(valorTotal, 'BRL') : ''}"
              required
            >
          </div>

          <div class="form-field-wrapper">
            <label for="dm-input-num-parcelas">Total de Parcelas</label>
            <input 
              id="dm-input-num-parcelas" 
              type="number" 
              min="1" 
              max="360" 
              class="input" 
              placeholder="Ex: 12" 
              value="${totalParcelas}" 
              required
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="dm-input-valor-parcela">Valor da Parcela (R$)</label>
            <input 
              id="dm-input-valor-parcela" 
              type="text" 
              inputmode="numeric" 
              class="input" 
              placeholder="0,00" 
              value="${valorParcela > 0 ? formatRawToCurrency(valorParcela, 'BRL') : ''}"
              required
            >
          </div>

          <div class="form-field-wrapper">
            <label for="dm-input-pagas">Parcelas Já Pagas</label>
            <input 
              id="dm-input-pagas" 
              type="number" 
              min="0" 
              max="${totalParcelas}" 
              class="input" 
              placeholder="0" 
              value="${parcelasPagas}"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-field-wrapper">
            <label for="dm-input-vencimento">Dia de Vencimento</label>
            <input 
              id="dm-input-vencimento" 
              type="number" 
              min="1" 
              max="31" 
              class="input" 
              placeholder="Ex: 10" 
              value="${diaVencimento}" 
              required
            >
          </div>

          <div class="form-field-wrapper">
            <label for="dm-input-data-inicio">Data de Início / 1ª Parcela</label>
            <input 
              id="dm-input-data-inicio" 
              type="date" 
              class="input input-date-clean" 
              value="${defaultDate}" 
              required
            >
          </div>
        </div>

        <div class="field">
          <label for="dm-input-obs">Observações / Detalhes (Opcional)</label>
          <input 
            id="dm-input-obs" 
            type="text" 
            class="input" 
            placeholder="Ex: Banco Itaú, taxa zero, desconto se quitar antes..." 
            value="${observacoes}"
          >
        </div>

        <!-- Real-time calculation summary preview -->
        <div class="debt-calc-preview" id="dm-calc-preview">
          <div class="debt-calc-preview-row">
            <span>Restante a Pagar:</span>
            <strong id="dm-prev-restante" style="color: var(--red);">R$ 0,00</strong>
          </div>
          <div class="debt-calc-preview-row">
            <span>Total Já Pago:</span>
            <strong id="dm-prev-pago" style="color: var(--green);">R$ 0,00</strong>
          </div>
          <div class="debt-calc-preview-row">
            <span>Progresso da Quitação:</span>
            <span id="dm-prev-progresso" style="font-weight: 700;">0 de 12 (0%)</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-debt-edit">Cancelar</button>
          <button type="submit" class="btn btn-primary">
            ${isEditing ? 'Salvar Alterações' : 'Cadastrar Dívida'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const inputNome = modal.querySelector('#dm-input-nome');
  const selectCat = modal.querySelector('#dm-select-cat');
  const inputTotal = modal.querySelector('#dm-input-total');
  const inputNumParcelas = modal.querySelector('#dm-input-num-parcelas');
  const inputValorParcela = modal.querySelector('#dm-input-valor-parcela');
  const inputPagas = modal.querySelector('#dm-input-pagas');
  const inputVencimento = modal.querySelector('#dm-input-vencimento');
  const inputDataInicio = modal.querySelector('#dm-input-data-inicio');
  const inputObs = modal.querySelector('#dm-input-obs');

  const prevRestante = modal.querySelector('#dm-prev-restante');
  const prevPago = modal.querySelector('#dm-prev-pago');
  const prevProgresso = modal.querySelector('#dm-prev-progresso');

  // Attach currency masks
  const totalMask = attachCurrencyMask(inputTotal, () => 'BRL');
  const parcelaMask = attachCurrencyMask(inputValorParcela, () => 'BRL');

  function getNumericTotal() {
    return totalMask ? totalMask.getNumericValue() : 0;
  }

  function getNumericParcela() {
    return parcelaMask ? parcelaMask.getNumericValue() : 0;
  }

  let userCustomizedParcela = isEditing && valorParcela > 0;

  function updateCalculations(triggeredBy) {
    const totalVal = getNumericTotal();
    const parcelasTot = Math.max(1, parseInt(inputNumParcelas.value, 10) || 1);
    inputPagas.max = String(parcelasTot);

    // If total or parcelas count changed and user hasn't explicitly locked a custom parcela amount
    if ((triggeredBy === 'total' || triggeredBy === 'numParcelas') && !userCustomizedParcela) {
      if (totalVal > 0 && parcelasTot > 0) {
        const autoParcela = Math.round((totalVal / parcelasTot) * 100) / 100;
        inputValorParcela.value = formatRawToCurrency(autoParcela, 'BRL');
      }
    } else if (triggeredBy === 'valorParcela') {
      userCustomizedParcela = true;
      // If user types parcel value and total is 0, auto-fill total
      if (totalVal <= 0) {
        const currentParcela = getNumericParcela();
        if (currentParcela > 0) {
          const autoTotal = currentParcela * parcelasTot;
          inputTotal.value = formatRawToCurrency(autoTotal, 'BRL');
        }
      }
    }

    const currentParcela = getNumericParcela();
    const pagas = Math.min(parcelasTot, Math.max(0, parseInt(inputPagas.value, 10) || 0));
    const restantes = Math.max(0, parcelasTot - pagas);

    const valorRestante = restantes * currentParcela;
    const valorPago = pagas * currentParcela;
    const pct = Math.min(100, Math.round((pagas / parcelasTot) * 100));

    if (prevRestante) prevRestante.textContent = fmtBRL(valorRestante);
    if (prevPago) prevPago.textContent = fmtBRL(valorPago);
    if (prevProgresso) {
      prevProgresso.innerHTML = `<strong>${pagas}</strong> de <strong>${parcelasTot}</strong> parcelas (${pct}%)`;
    }
  }

  inputTotal.addEventListener('input', () => updateCalculations('total'));
  inputNumParcelas.addEventListener('input', () => updateCalculations('numParcelas'));
  inputValorParcela.addEventListener('input', () => updateCalculations('valorParcela'));
  inputPagas.addEventListener('input', () => updateCalculations('pagas'));

  // Run initial preview calculation
  updateCalculations('init');

  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-debt-edit-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-debt-edit').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Submit handler
  const form = modal.querySelector('#form-debt-edit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = inputNome.value.trim();
    if (!nome) {
      showToast('Por favor, informe o nome da dívida.', 'warning');
      return;
    }

    const totalVal = getNumericTotal();
    const parcelasTot = Math.max(1, parseInt(inputNumParcelas.value, 10) || 1);
    let parcelaVal = getNumericParcela();

    if (parcelaVal <= 0 && totalVal > 0) {
      parcelaVal = Math.round((totalVal / parcelasTot) * 100) / 100;
    }

    if (totalVal <= 0 && parcelaVal <= 0) {
      showToast('Por favor, informe o valor total ou o valor da parcela.', 'warning');
      return;
    }

    const finalTotal = totalVal > 0 ? totalVal : parcelaVal * parcelasTot;
    const pagas = Math.min(parcelasTot, Math.max(0, parseInt(inputPagas.value, 10) || 0));
    const diaVenc = Math.min(31, Math.max(1, parseInt(inputVencimento.value, 10) || 10));

    const payload = {
      nome,
      categoria: selectCat.value,
      valorTotal: finalTotal,
      valorParcela: parcelaVal,
      totalParcelas: parcelasTot,
      parcelasPagas: pagas,
      diaVencimento: diaVenc,
      dataInicio: inputDataInicio.value || todayKey(),
      observacoes: inputObs.value.trim(),
      status: pagas >= parcelasTot ? 'quitada' : 'ativa'
    };

    if (isEditing) {
      await debtService.updateDebt(userEmail, debtToEdit.id, payload);
      showToast(`Dívida "${nome}" atualizada com sucesso!`, 'success');
    } else {
      await debtService.addDebt(userEmail, payload);
      showToast(`Pagamento pendente "${nome}" cadastrado com sucesso!`, 'success');
    }

    closeModal();
    if (onSaved) onSaved();
  });
}
