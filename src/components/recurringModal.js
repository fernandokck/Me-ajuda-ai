/**
 * Full Recurring Rules Modal Component
 * Displays complete list of recurring expenses with totals,
 * due dates, category tags, and deletion/management.
 */

import {
  finance,
  fmtBRL,
  TAG_CLASSES,
  TAG_LABELS,
  getCategoryIcon
} from '../services/finance.js';
import { showToast } from './toast.js';

export function openRecurringModal(user, onDataChanged) {
  const existing = document.getElementById('recurring-full-modal');
  if (existing) existing.remove();

  const userEmail = user.email;
  let searchQuery = '';

  const modal = document.createElement('div');
  modal.id = 'recurring-full-modal';
  modal.className = 'badge-modal-backdrop';

  function renderModalBody() {
    const list = finance.getRecurring(userEmail);
    const totalMonthlyRecurring = list.reduce((sum, r) => sum + Number(r.valor), 0);

    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.desc && r.desc.toLowerCase().includes(q)) ||
          (r.subcategoria && r.subcategoria.toLowerCase().includes(q))
      );
    }

    modal.innerHTML = `
      <div class="full-view-modal-card">
        <!-- Modal Header -->
        <div class="full-view-header">
          <div>
            <div class="full-view-kicker">GESTÃO DE RECORRÊNCIA</div>
            <h3 class="full-view-title">🔁 Todas as Contas Recorrentes</h3>
          </div>
          <button class="badge-modal-close" id="btn-close-rec-modal" title="Fechar">✕</button>
        </div>

        <!-- Summary Banner -->
        <div class="card" style="background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-hover) 100%); margin-bottom: 14px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
                Compromisso Mensal Automático
              </div>
              <div style="font-size: 22px; font-weight: 800; color: var(--text-main); margin-top: 2px;">
                ${fmtBRL(totalMonthlyRecurring)} <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">/ mês</span>
              </div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); text-align: right;">
              <strong style="color: var(--brand); font-size: 14px;">${list.length}</strong> contas ativas
            </div>
          </div>
        </div>

        <!-- Controls: Search -->
        <div class="full-view-controls">
          <div class="full-view-search-wrap" style="width: 100%;">
            <span class="search-icon">🔍</span>
            <input 
              id="rec-modal-search" 
              type="text" 
              class="input full-view-search-input" 
              placeholder="Buscar conta recorrente..."
              value="${searchQuery}"
            >
          </div>
        </div>

        <!-- Recurring List Body -->
        <div class="full-view-table-container">
          ${
            filtered.length === 0
              ? `
            <div class="empty-state" style="padding: 40px 10px;">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔁</span>
              <strong>Nenhuma conta recorrente encontrada</strong>
              <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
                Cadastre novas contas marcando a opção "Conta recorrente" no painel principal.
              </div>
            </div>
          `
              : `
            <div class="full-rec-list">
              ${filtered
                .map((r) => {
                  const icon = r.subcategoria ? getCategoryIcon(r.subcategoria) : '🔁';
                  return `
                  <div class="full-rec-card">
                    <div class="full-rec-left">
                      <div class="full-rec-icon">${icon}</div>
                      <div>
                        <strong class="full-rec-title">${r.desc}</strong>
                        <div class="full-rec-meta">
                          <span class="recurring-day-pill">📅 Vence todo dia ${r.diaVencimento}</span>
                          <span class="tag ${TAG_CLASSES[r.tipo] || 'tag-contafixa'}">
                            ${TAG_LABELS[r.tipo] || r.tipo}
                          </span>
                          ${
                            r.subcategoria
                              ? `<span class="category-sub-pill">${r.subcategoria}</span>`
                              : ''
                          }
                        </div>
                      </div>
                    </div>
                    <div class="full-rec-right">
                      <strong class="full-rec-val">${fmtBRL(r.valor)}</strong>
                      <button class="btn-del btn-modal-del-rec" data-id="${r.id}" title="Excluir regra de recorrência">✕</button>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>

        <!-- Modal Footer -->
        <div class="full-view-footer">
          <div style="font-size: 12.5px; color: var(--text-muted);">
            Repete todo mês automaticamente no primeiro dia ou data de vencimento.
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-footer-close-rec">Fechar</button>
        </div>
      </div>
    `;

    // Bind events
    const btnClose = modal.querySelector('#btn-close-rec-modal');
    if (btnClose) btnClose.addEventListener('click', () => modal.remove());

    const btnFooterClose = modal.querySelector('#btn-footer-close-rec');
    if (btnFooterClose) btnFooterClose.addEventListener('click', () => modal.remove());

    const searchInput = modal.querySelector('#rec-modal-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderModalBody();
        const nextInput = modal.querySelector('#rec-modal-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    modal.querySelectorAll('.btn-modal-del-rec').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = isNaN(btn.dataset.id) ? btn.dataset.id : Number(btn.dataset.id);
        await finance.deleteRecurring(userEmail, id);
        showToast('Regra de recorrência removida.', 'info');
        if (onDataChanged) onDataChanged();
        renderModalBody();
      });
    });
  }

  renderModalBody();
  document.body.appendChild(modal);
}
