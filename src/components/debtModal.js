/**
 * Full Debt & Pending Payments Modal Component
 * Detailed management of all installment debts, search without flicker,
 * status filters (Todas, Em Aberto, Quitadas), quick 1-click installment discount,
 * undo option, celebration confetti on completion, and transaction expense sync.
 */

import confetti from 'canvas-confetti';
import { debtService, getDebtCategoryIcon } from '../services/debt.js';
import { fmtBRL } from '../services/finance.js';
import { openDebtEditModal } from './debtEditModal.js';
import { showToast } from './toast.js';

export function openDebtModal(user, onDataChanged) {
  const existing = document.getElementById('debt-full-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  let activeFilter = 'ativas'; // 'all', 'ativas', 'quitadas'
  let searchQuery = '';

  const modal = document.createElement('div');
  modal.id = 'debt-full-modal';
  modal.className = 'badge-modal-backdrop';

  let list = debtService.getDebts(userEmail);

  function getSummary() {
    return debtService.getSummary(userEmail);
  }

  // Render static shell once
  const summary = getSummary();

  modal.innerHTML = `
    <div class="full-view-modal-card">
      <!-- Modal Header -->
      <div class="full-view-header">
        <div>
          <div class="full-view-kicker">GESTÃO DE DÍVIDAS & PARCELAMENTOS</div>
          <h3 class="full-view-title">⏳ Pagamentos Pendentes</h3>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-modal-add-debt" class="btn btn-primary btn-xs" style="padding: 6px 12px; font-weight: 700;">
            ➕ Nova Dívida
          </button>
          <button class="badge-modal-close" id="btn-close-debt-modal" title="Fechar">✕</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="full-view-kpis" id="debt-modal-kpis-grid">
        <div class="full-view-kpi-item">
          <span class="lbl">📉 Total a Pagar (Restante)</span>
          <strong id="kpi-debt-restante" style="color: var(--red);">${fmtBRL(summary.totalRestante)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">✅ Total Já Quitado</span>
          <strong id="kpi-debt-pago" style="color: var(--green);">${fmtBRL(summary.totalPago)}</strong>
        </div>
        <div class="full-view-kpi-item">
          <span class="lbl">🗓️ Compromisso do Mês</span>
          <strong id="kpi-debt-compromisso" style="color: var(--brand);">${fmtBRL(summary.compromissoMensal)} <span style="font-size: 10.5px; font-weight: 600; color: var(--text-muted);">/ mês</span></strong>
        </div>
      </div>

      <!-- Controls: Search & Filter Pills -->
      <div class="full-view-controls">
        <div class="full-view-search-wrap">
          <span class="search-icon">🔍</span>
          <input 
            id="debt-modal-search" 
            type="text" 
            class="input full-view-search-input" 
            placeholder="Buscar dívida por nome, categoria ou notas..."
            value=""
            autocomplete="off"
          >
        </div>

        <div class="full-view-filter-pills" id="debt-filter-pills">
          <button class="filter-pill ${activeFilter === 'ativas' ? 'active' : ''}" data-filter="ativas">
            ⏳ Em Aberto (<span id="count-ativas">${summary.ativasCount}</span>)
          </button>
          <button class="filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
            Todas (<span id="count-todas">${list.length}</span>)
          </button>
          <button class="filter-pill ${activeFilter === 'quitadas' ? 'active' : ''}" data-filter="quitadas">
            🎉 Quitadas (<span id="count-quitadas">${summary.quitadasCount}</span>)
          </button>
        </div>
      </div>

      <!-- Scrollable Debts Cards Container -->
      <div class="full-view-content" id="debt-modal-list-container" style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Dynamic cards inserted here -->
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const listContainer = modal.querySelector('#debt-modal-list-container');
  const searchInput = modal.querySelector('#debt-modal-search');
  const kpiRestante = modal.querySelector('#kpi-debt-restante');
  const kpiPago = modal.querySelector('#kpi-debt-pago');
  const kpiCompromisso = modal.querySelector('#kpi-debt-compromisso');
  const countAtivas = modal.querySelector('#count-ativas');
  const countTodas = modal.querySelector('#count-todas');
  const countQuitadas = modal.querySelector('#count-quitadas');

  function updateKpis() {
    const s = getSummary();
    if (kpiRestante) kpiRestante.textContent = fmtBRL(s.totalRestante);
    if (kpiPago) kpiPago.textContent = fmtBRL(s.totalPago);
    if (kpiCompromisso) kpiCompromisso.innerHTML = `${fmtBRL(s.compromissoMensal)} <span style="font-size: 10.5px; font-weight: 600; color: var(--text-muted);">/ mês</span>`;
    if (countAtivas) countAtivas.textContent = s.ativasCount;
    if (countTodas) countTodas.textContent = list.length;
    if (countQuitadas) countQuitadas.textContent = s.quitadasCount;
  }

  function renderList() {
    list = debtService.getDebts(userEmail);
    updateKpis();

    const q = searchQuery.toLowerCase().trim();
    let filtered = list.filter((d) => {
      // Filter by status tab
      if (activeFilter === 'ativas' && d.status === 'quitada') return false;
      if (activeFilter === 'quitadas' && d.status !== 'quitada') return false;

      // Filter by search
      if (q) {
        const text = `${d.nome} ${d.categoria} ${d.observacoes || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="full-view-empty" style="text-align: center; padding: 36px 16px;">
          <div style="font-size: 32px; margin-bottom: 8px;">
            ${activeFilter === 'quitadas' ? '🎉' : '✨'}
          </div>
          <p style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">
            ${
              activeFilter === 'quitadas'
                ? 'Nenhuma dívida quitada ainda.'
                : activeFilter === 'ativas'
                ? 'Nenhum pagamento pendente em aberto!'
                : 'Nenhum pagamento pendente cadastrado.'
            }
          </p>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            ${
              activeFilter === 'ativas'
                ? 'Parabéns! Todas as suas dívidas cadastradas estão quitadas ou você não possui pendências.'
                : 'Cadastre suas contas parceladas para controlar o que falta pagar mês a mês.'
            }
          </p>
          <button id="btn-empty-add-debt" class="btn btn-primary btn-sm">
            ➕ Cadastrar Pagamento Pendente
          </button>
        </div>
      `;

      const btnEmptyAdd = listContainer.querySelector('#btn-empty-add-debt');
      if (btnEmptyAdd) {
        btnEmptyAdd.addEventListener('click', () => {
          openDebtEditModal(userEmail, null, () => {
            renderList();
            if (onDataChanged) onDataChanged();
          });
        });
      }
      return;
    }

    listContainer.innerHTML = filtered
      .map((d) => {
        const isQuitada = d.status === 'quitada' || d.parcelasPagas >= d.totalParcelas;
        const barColor = isQuitada ? 'var(--green)' : d.progressoPct >= 75 ? 'var(--brand)' : 'var(--amber)';

        return `
          <div class="debt-card-item ${isQuitada ? 'debt-card-quitada' : ''}" data-id="${d.id}">
            <!-- Top Row: Icon, Title, Status Badge -->
            <div class="debt-card-header">
              <div class="debt-card-title-group">
                <span class="debt-cat-icon">${getDebtCategoryIcon(d.categoria)}</span>
                <div>
                  <div class="debt-name-row">
                    <strong class="debt-title">${d.nome}</strong>
                    <span class="debt-status-badge ${isQuitada ? 'quitada' : 'ativa'}">
                      ${isQuitada ? '🎉 Quitada' : '⏳ Em Aberto'}
                    </span>
                  </div>
                  <div class="debt-meta-row">
                    <span>${d.categoria}</span>
                    <span>·</span>
                    <span>Vencimento todo dia <strong>${d.diaVencimento}</strong></span>
                    ${d.dataInicio ? `<span>· Início: ${d.dataInicio.split('-').reverse().join('/')}</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="debt-card-actions-top">
                <button class="btn-action-icon btn-edit-debt" data-id="${d.id}" title="Editar informações da dívida">✏️</button>
                <button class="btn-del btn-del-debt" data-id="${d.id}" title="Excluir dívida">✕</button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="debt-progress-wrap">
              <div class="debt-progress-info">
                <span>Parcelas Pagas: <strong>${d.parcelasPagas}</strong> de <strong>${d.totalParcelas}</strong></span>
                <span style="font-weight: 800; color: ${barColor};">${d.progressoPct}%</span>
              </div>
              <div class="progress-bar" style="height: 7px; margin-top: 4px;">
                <div class="progress-bar-inner" style="width: ${d.progressoPct}%; background: ${barColor};"></div>
              </div>
            </div>

            <!-- Numbers Breakdown: Parcela Mensal vs Falta Pagar -->
            <div class="debt-numbers-grid">
              <div class="debt-number-col">
                <span class="lbl">Parcela Mensal</span>
                <strong style="color: var(--text-main); font-size: 13.5px;">${fmtBRL(d.valorParcela)}</strong>
              </div>
              <div class="debt-number-col">
                <span class="lbl">Já Quitado</span>
                <strong style="color: var(--green); font-size: 13.5px;">${fmtBRL(d.valorJaPago)}</strong>
              </div>
              <div class="debt-number-col" style="text-align: right;">
                <span class="lbl">${isQuitada ? 'Saldo Final' : 'Falta Pagar'}</span>
                <strong style="color: ${isQuitada ? 'var(--green)' : 'var(--red)'}; font-size: 14px;">
                  ${isQuitada ? 'Quitado ✨' : fmtBRL(d.valorRestante)}
                </strong>
              </div>
            </div>

            ${
              d.observacoes
                ? `
              <div class="debt-obs-box">
                <span style="font-weight: 700; color: var(--text-muted);">Nota:</span> ${d.observacoes}
              </div>
            `
                : ''
            }

            <!-- Bottom Actions: Pagar Parcela, Desfazer, Histórico -->
            <div class="debt-card-footer">
              <div class="debt-footer-history-toggle">
                ${
                  d.historico && d.historico.length > 0
                    ? `
                  <button class="btn-text-link btn-toggle-history" data-id="${d.id}" style="font-size: 11.5px;">
                    📜 Ver histórico de pagamentos (${d.historico.length})
                  </button>
                `
                    : '<span style="font-size: 11.5px; color: var(--text-muted);">Nenhum pagamento registrado ainda</span>'
                }
              </div>

              <div class="debt-footer-buttons">
                ${
                  d.parcelasPagas > 0
                    ? `
                  <button class="btn btn-secondary btn-xs btn-undo-parcela" data-id="${d.id}" title="Desfazer último pagamento">
                    ↩️ Desfazer Parcela
                  </button>
                `
                    : ''
                }
                ${
                  !isQuitada
                    ? `
                  <button class="btn btn-primary btn-xs btn-pay-parcela" data-id="${d.id}" style="font-weight: 700;">
                    💸 Pagar Parcela (${d.parcelasPagas + 1}/${d.totalParcelas})
                  </button>
                `
                    : `
                  <span class="debt-congrats-tag">
                    🎉 Totalmente Quitada!
                  </span>
                `
                }
              </div>
            </div>

            <!-- Collapsible Payment History -->
            <div class="debt-history-drawer hidden" id="debt-hist-${d.id}">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
                Histórico de Parcelas Pagas:
              </div>
              ${
                d.historico && d.historico.length > 0
                  ? d.historico
                      .map(
                        (h) => `
                    <div class="debt-history-item">
                      <span>Parcela <strong>#${h.parcelaNum}</strong> · ${h.data ? h.data.split('-').reverse().join('/') : 'Data não informada'}</span>
                      <strong style="color: var(--green);">${fmtBRL(h.valor)}</strong>
                    </div>
                  `
                      )
                      .reverse()
                      .join('')
                  : '<div style="font-size: 11.5px; color: var(--text-muted);">Nenhum registro.</div>'
              }
            </div>
          </div>
        `;
      })
      .join('');

    bindListEvents();
  }

  function bindListEvents() {
    // Pay installment button
    listContainer.querySelectorAll('.btn-pay-parcela').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const debtId = btn.dataset.id;
        const debt = list.find((d) => String(d.id) === String(debtId));
        if (!debt) return;

        const nextParcelaNum = debt.parcelasPagas + 1;
        const valorFmt = fmtBRL(debt.valorParcela);

        // Confirmation dialog with option to register as expense
        showPaymentConfirmationModal({
          debtName: debt.nome,
          parcelaNum: nextParcelaNum,
          totalParcelas: debt.totalParcelas,
          valor: debt.valorParcela,
          onConfirm: async ({ registerExpense }) => {
            const res = await debtService.payInstallment(userEmail, debtId, {
              registerExpense,
              customValor: debt.valorParcela
            });

            if (res.success) {
              if (res.isQuitada) {
                // Fire celebration confetti!
                confetti({
                  particleCount: 120,
                  spread: 70,
                  origin: { y: 0.6 }
                });
                showToast(`🎉 Parabéns! Você quitou todas as parcelas de "${debt.nome}"!`, 'success');
              } else {
                showToast(
                  `Parcela ${nextParcelaNum}/${debt.totalParcelas} de "${debt.nome}" paga com sucesso!${
                    registerExpense ? ' Registrada nas despesas do mês.' : ''
                  }`,
                  'success'
                );
              }

              renderList();
              if (onDataChanged) onDataChanged();
            } else {
              showToast(res.error || 'Erro ao pagar parcela', 'warning');
            }
          }
        });
      });
    });

    // Undo installment button
    listContainer.querySelectorAll('.btn-undo-parcela').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const debtId = btn.dataset.id;
        const debt = list.find((d) => String(d.id) === String(debtId));
        if (!debt) return;

        if (confirm(`Deseja desfazer a última parcela paga de "${debt.nome}"? A despesa associada deste mês (se houver) também será removida.`)) {
          const res = await debtService.undoInstallment(userEmail, debtId);
          if (res.success) {
            showToast(`Última parcela de "${debt.nome}" foi desfeita.`, 'info');
            renderList();
            if (onDataChanged) onDataChanged();
          } else {
            showToast(res.error || 'Erro ao desfazer', 'warning');
          }
        }
      });
    });

    // Edit debt
    listContainer.querySelectorAll('.btn-edit-debt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const debtId = btn.dataset.id;
        const debt = list.find((d) => String(d.id) === String(debtId));
        if (!debt) return;

        openDebtEditModal(userEmail, debt, () => {
          renderList();
          if (onDataChanged) onDataChanged();
        });
      });
    });

    // Delete debt
    listContainer.querySelectorAll('.btn-del-debt').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const debtId = btn.dataset.id;
        const debt = list.find((d) => String(d.id) === String(debtId));
        if (!debt) return;

        if (confirm(`Tem certeza que deseja excluir o pagamento pendente "${debt.nome}"?`)) {
          await debtService.deleteDebt(userEmail, debtId);
          showToast(`Dívida "${debt.nome}" excluída.`, 'info');
          renderList();
          if (onDataChanged) onDataChanged();
        }
      });
    });

    // Toggle history drawer
    listContainer.querySelectorAll('.btn-toggle-history').forEach((btn) => {
      btn.addEventListener('click', () => {
        const debtId = btn.dataset.id;
        const drawer = listContainer.querySelector(`#debt-hist-${debtId}`);
        if (drawer) {
          drawer.classList.toggle('hidden');
        }
      });
    });
  }

  // Payment Confirmation Dialog Helper
  function showPaymentConfirmationModal({ debtName, parcelaNum, totalParcelas, valor, onConfirm }) {
    const dialogBackdrop = document.createElement('div');
    dialogBackdrop.className = 'badge-modal-backdrop';
    dialogBackdrop.style.zIndex = '10002';

    dialogBackdrop.innerHTML = `
      <div class="profile-modal-card" style="max-width: 420px; animation: popIn3D 0.25s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; margin: 0;">💸 Confirmar Pagamento</h3>
          <button class="badge-modal-close" id="btn-dialog-close" style="position: static;">✕</button>
        </div>

        <p style="font-size: 13.5px; line-height: 1.45; margin-bottom: 14px; color: var(--text-main);">
          Você está registrando o pagamento da parcela <strong>${parcelaNum} de ${totalParcelas}</strong> de <strong>"${debtName}"</strong> no valor de <strong>${fmtBRL(valor)}</strong>.
        </p>

        <div style="background: var(--surface-hover); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; user-select: none;">
            <input type="checkbox" id="chk-dialog-register-tx" checked style="margin-top: 3px; accent-color: var(--brand);">
            <div style="font-size: 12.5px; line-height: 1.4;">
              <strong>Lançar automaticamente nas despesas do mês</strong>
              <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">
                Adiciona um gasto de ${fmtBRL(valor)} em "Dívidas & Parcelas" no mês atual.
              </div>
            </div>
          </label>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-dialog-cancel">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-dialog-confirm" style="font-weight: 700;">
            Confirmar Pagamento
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogBackdrop);

    const closeDialog = () => dialogBackdrop.remove();
    dialogBackdrop.querySelector('#btn-dialog-close').addEventListener('click', closeDialog);
    dialogBackdrop.querySelector('#btn-dialog-cancel').addEventListener('click', closeDialog);
    dialogBackdrop.addEventListener('click', (e) => {
      if (e.target === dialogBackdrop) closeDialog();
    });

    dialogBackdrop.querySelector('#btn-dialog-confirm').addEventListener('click', () => {
      const registerExpense = dialogBackdrop.querySelector('#chk-dialog-register-tx').checked;
      closeDialog();
      if (onConfirm) onConfirm({ registerExpense });
    });
  }

  // Filter pills click handler
  const filterPills = modal.querySelectorAll('.filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderList();
    });
  });

  // Zero-flicker search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  // Add Debt from Header Button
  modal.querySelector('#btn-modal-add-debt').addEventListener('click', () => {
    openDebtEditModal(userEmail, null, () => {
      renderList();
      if (onDataChanged) onDataChanged();
    });
  });

  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('#btn-close-debt-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Initial render
  renderList();
}
