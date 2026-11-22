/**
 * Carteira View Component (Wallet, Assets & Allocations)
 * Displays consolidated balances across multi-currencies (BRL, USD, EUR, USDT, USDC),
 * real-time crypto market price tracking with 24h variation, allocation time tracking, and interactive management.
 */

import {
  walletService,
  WALLET_TYPES,
  fmtCurrency,
  calculateDurationText
} from '../services/wallet.js';
import { cryptoService } from '../services/crypto.js';
import { subscriptionService } from '../services/subscription.js';
import { openWalletModal } from './walletModal.js';
import { openUpgradeModal } from './upgradeModal.js';
import { showToast } from './toast.js';

export function renderCarteiraView(container, user, onDataChanged) {
  const userEmail = user.email;
  let activeFilter = 'all';

  function renderView() {
    const summary = walletService.getSummary(userEmail);
    const { totalCount, byCurrency, totalApproxBRL, list } = summary;

    let filtered = list;
    if (activeFilter !== 'all') {
      filtered = filtered.filter((w) => w.tipo === activeFilter);
    }

    const typeCounts = {
      all: list.length,
      conta: list.filter((w) => w.tipo === 'conta').length,
      cripto: list.filter((w) => w.tipo === 'cripto').length,
      corretora: list.filter((w) => w.tipo === 'corretora').length,
      reserva: list.filter((w) => w.tipo === 'reserva').length
    };

    const hasCrypto = list.some((w) => w.tipo === 'cripto');

    container.innerHTML = `
      <div id="tab-carteira" class="view-content-wrapper">
        <!-- Header Hero Card -->
        <div class="card" style="margin-bottom: 16px; background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-hover) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div class="full-view-kicker">GESTÃO DE PATRIMÔNIO & SALDOS</div>
              <h2 style="font-size: 20px; font-weight: 800; margin: 4px 0 2px; color: var(--text-main);">
                💼 Minha Carteira
              </h2>
              <div style="font-size: 12.5px; color: var(--text-muted);">
                Acompanhe onde seu dinheiro está alocado, cotações de cripto em tempo real e tempo de cada aplicação.
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${
                hasCrypto
                  ? `
                <button id="btn-refresh-crypto" class="btn btn-secondary btn-sm" title="Puxar preços atualizados das criptomoedas no mercado">
                  <span id="refresh-crypto-icon">🔄</span> Cotações Cripto
                </button>
              `
                  : ''
              }
              <button id="btn-add-wallet-hero" class="btn btn-primary btn-sm">
                <span>➕</span> Adicionar Conta / Aplicação
              </button>
            </div>
          </div>

          <!-- Currency KPI Summary Grid -->
          <div class="wallet-kpi-grid" style="margin-top: 14px;">
            <div class="wallet-kpi-card">
              <span class="wallet-kpi-lbl">🇧🇷 Saldo em Reais</span>
              <strong class="wallet-kpi-val" style="color: var(--green);">${fmtCurrency(byCurrency.BRL, 'BRL')}</strong>
              <div class="wallet-kpi-sub">BRL (R$) · Bancos e Caixinhas</div>
            </div>

            <div class="wallet-kpi-card">
              <span class="wallet-kpi-lbl">🇺🇸 Dólar & Stables</span>
              <strong class="wallet-kpi-val" style="color: var(--blue-tag);">${fmtCurrency(byCurrency.USD + byCurrency.USDT + byCurrency.USDC, 'USD')}</strong>
              <div class="wallet-kpi-sub">
                USD: ${fmtCurrency(byCurrency.USD, 'USD')} · Stables: ${fmtCurrency(byCurrency.USDT + byCurrency.USDC, 'USD')}
              </div>
            </div>

            <div class="wallet-kpi-card">
              <span class="wallet-kpi-lbl">🇪🇺 Saldo em Euro</span>
              <strong class="wallet-kpi-val" style="color: var(--purple);">${fmtCurrency(byCurrency.EUR, 'EUR')}</strong>
              <div class="wallet-kpi-sub">EUR (€) · Contas Internacionais</div>
            </div>

            <div class="wallet-kpi-card" style="background: var(--brand-light); border-color: rgba(59, 91, 253, 0.3);">
              <span class="wallet-kpi-lbl" style="color: var(--brand);">📊 Patrimônio Est. (BRL)</span>
              <strong class="wallet-kpi-val" style="color: var(--brand);">${fmtCurrency(totalApproxBRL, 'BRL')}</strong>
              <div class="wallet-kpi-sub" style="color: var(--text-muted);">
                ${totalCount} ${totalCount === 1 ? 'conta cadastrada' : 'contas cadastradas'}
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Pills & Title -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title-row">
            <div>
              <h3>📋 Suas Contas e Alocações</h3>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">
                ${filtered.length} ${filtered.length === 1 ? 'aplicação encontrada' : 'aplicações encontradas'}
              </div>
            </div>
            
            ${
              totalCount > 0
                ? `
              <button id="btn-add-wallet-list" class="btn btn-secondary btn-xs">
                <span>➕</span> Nova Aplicação
              </button>
            `
                : ''
            }
          </div>

          <!-- Type Filter Pills -->
          <div class="full-view-filter-pills" style="margin-bottom: 14px;">
            <button class="filter-pill-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
              Todas (${typeCounts.all})
            </button>
            <button class="filter-pill-btn ${activeFilter === 'conta' ? 'active' : ''}" data-filter="conta">
              🏦 Bancos (${typeCounts.conta})
            </button>
            <button class="filter-pill-btn ${activeFilter === 'cripto' ? 'active' : ''}" data-filter="cripto">
              🪙 Cripto (${typeCounts.cripto})
            </button>
            <button class="filter-pill-btn ${activeFilter === 'corretora' ? 'active' : ''}" data-filter="corretora">
              📈 Corretoras (${typeCounts.corretora})
            </button>
            <button class="filter-pill-btn ${activeFilter === 'reserva' ? 'active' : ''}" data-filter="reserva">
              📦 Caixinhas (${typeCounts.reserva})
            </button>
          </div>

          <!-- Wallets Grid -->
          ${
            filtered.length === 0
              ? `
            <div class="empty-state" style="padding: 36px 12px;">
              <div class="metas-empty-icon" style="font-size: 26px;">💼</div>
              <h4 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin: 6px 0 4px;">
                Nenhuma conta ou aplicação cadastrada
              </h4>
              <p style="font-size: 12px; color: var(--text-muted); max-width: 360px; margin: 0 auto 14px; line-height: 1.4;">
                Adicione suas contas do Nubank, Binance, Inter, caixinhas ou carteiras cripto com cotação automática para acompanhar seu patrimônio em tempo real.
              </p>
              <button id="btn-add-wallet-empty" class="btn btn-primary">
                <span>➕</span> Adicionar Minha Primeira Conta
              </button>
            </div>
          `
              : `
            <div class="wallet-items-grid">
              ${filtered
                .map((w) => {
                  const typeObj = WALLET_TYPES.find((t) => t.id === w.tipo) || { icon: '💼', label: 'Aplicação' };
                  const durationText = calculateDurationText(w.dataInicio);
                  const isDollar = w.moeda === 'USD' || w.moeda === 'USDT' || w.moeda === 'USDC';
                  const isCrypto = w.tipo === 'cripto';
                  const holding = isCrypto && w.cryptoSymbol ? cryptoService.calculateHoldingValue(w.cryptoSymbol, w.cryptoQty || 0, w.moeda) : null;

                  return `
                  <div class="wallet-card-item">
                    <div class="wallet-card-head">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="wallet-type-icon ${isCrypto && holding?.image ? 'crypto-icon-wrap' : ''}">
                          ${isCrypto && holding?.image ? `<img src="${holding.image}" alt="${w.cryptoSymbol}" class="crypto-coin-avatar">` : typeObj.icon}
                        </span>
                        <div>
                          <strong style="font-size: 14.5px; color: var(--text-main); display: block;">${w.nome}</strong>
                          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${isCrypto && holding ? holding.name : typeObj.label}</span>
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="wallet-currency-pill ${isDollar ? 'dollar' : w.moeda.toLowerCase()}">
                          ${w.moeda}
                        </span>
                        <button class="btn-del btn-del-wallet" data-id="${w.id}" title="Excluir conta">✕</button>
                      </div>
                    </div>

                    <div class="wallet-card-body">
                      <!-- Detalhes de Criptomoeda ao Vivo -->
                      ${
                        isCrypto && w.cryptoSymbol
                          ? `
                        <div class="crypto-card-details">
                          <div class="crypto-card-row">
                            <div style="display: flex; align-items: center; gap: 6px;">
                              ${holding?.image ? `<img src="${holding.image}" alt="${w.cryptoSymbol}" class="crypto-coin-mini-avatar">` : ''}
                              <span class="crypto-tag-pill">${w.cryptoSymbol}</span>
                            </div>
                            ${w.cryptoQty ? `<span style="font-size: 12px; font-weight: 800; color: var(--text-main);">${w.cryptoQty} ${w.cryptoSymbol}</span>` : ''}
                          </div>
                          ${
                            holding
                              ? `
                            <div class="crypto-price-subrow">
                              <span style="font-size: 10.5px; color: var(--text-muted);">
                                Cotação: <strong>${fmtCurrency(w.moeda === 'USD' ? holding.unitPriceUSD : holding.unitPriceBRL, w.moeda)}</strong>
                              </span>
                              <span class="crypto-change-pill ${holding.change24h >= 0 ? 'up' : 'down'}">
                                ${holding.change24h >= 0 ? '▲ +' : '▼ '}${holding.change24h}% (24h)
                              </span>
                            </div>
                          `
                              : ''
                          }
                        </div>
                      `
                          : ''
                      }

                      <div class="wallet-balance-row">
                        <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Saldo Atual:</span>
                        <strong class="wallet-balance-val ${isDollar ? 'dollar' : ''}">
                          ${fmtCurrency(w.saldo, w.moeda)}
                        </strong>
                      </div>

                      ${
                        w.obs
                          ? `
                        <div class="wallet-obs-box">
                          <span style="font-size: 12px; color: var(--text-muted); line-height: 1.3;">
                            💬 ${w.obs}
                          </span>
                        </div>
                      `
                          : ''
                      }

                      <div class="wallet-card-footer">
                        <span class="wallet-time-pill" title="Data de início: ${w.dataInicio.split('-').reverse().join('/')}">
                          ⏳ ${durationText} <span style="opacity: 0.7;">(${w.dataInicio.split('-').reverse().join('/')})</span>
                        </span>

                        <button class="btn-edit-wallet" data-id="${w.id}" style="color: var(--brand); font-weight: 700; font-size: 11.5px; background: none; border: none; cursor: pointer;">
                          Editar ✏️
                        </button>
                      </div>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>
      </div>
    `;

    // Bind Add modal buttons with Subscription Guard
    const openAddHandler = () => {
      const wallets = walletService.getWallets(userEmail);
      if (wallets.length >= 1 && !subscriptionService.canAccess(userEmail, 'multi_wallet')) {
        openUpgradeModal(user, {
          featureName: 'Múltiplas Carteiras & Moedas Globais',
          reason: 'No plano gratuito você pode gerenciar 1 carteira. Assine o plano PRO para adicionar contas ilimitadas em Reais, Dólar, Euro e Cripto.',
          onSubscribed: () => {
            renderView();
            if (onDataChanged) onDataChanged();
          }
        });
        return;
      }

      openWalletModal(userEmail, null, () => {
        renderView();
        if (onDataChanged) onDataChanged();
      });
    };

    const btnHero = container.querySelector('#btn-add-wallet-hero');
    if (btnHero) btnHero.addEventListener('click', openAddHandler);

    const btnList = container.querySelector('#btn-add-wallet-list');
    if (btnList) btnList.addEventListener('click', openAddHandler);

    const btnEmpty = container.querySelector('#btn-add-wallet-empty');
    if (btnEmpty) btnEmpty.addEventListener('click', openAddHandler);

    // Bind Refresh Crypto Prices button
    const btnRefreshCrypto = container.querySelector('#btn-refresh-crypto');
    if (btnRefreshCrypto) {
      btnRefreshCrypto.addEventListener('click', async () => {
        btnRefreshCrypto.disabled = true;
        const icon = btnRefreshCrypto.querySelector('#refresh-crypto-icon');
        if (icon) icon.textContent = '⏳';
        try {
          await cryptoService.fetchMarketPrices(true);
          walletService.updateCryptoBalancesWithLiveMarket(userEmail);
          showToast('Cotações de mercado atualizadas ao vivo!', 'success');
          renderView();
          if (onDataChanged) onDataChanged();
        } catch (err) {
          showToast('Não foi possível atualizar as cotações agora.', 'error');
        } finally {
          btnRefreshCrypto.disabled = false;
          if (icon) icon.textContent = '🔄';
        }
      });
    }

    // Bind Filter pills
    container.querySelectorAll('.filter-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        renderView();
      });
    });

    // Bind Edit wallet buttons
    container.querySelectorAll('.btn-edit-wallet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const w = list.find((item) => item.id === id);
        if (w) {
          openWalletModal(userEmail, w, () => {
            renderView();
            if (onDataChanged) onDataChanged();
          });
        }
      });
    });

    // Bind Delete wallet buttons
    container.querySelectorAll('.btn-del-wallet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        walletService.deleteWallet(userEmail, id);
        showToast('Conta removida da carteira.', 'info');
        renderView();
        if (onDataChanged) onDataChanged();
      });
    });
  }

  // Pre-fetch crypto prices on mount if user has any crypto holding
  const initialWallets = walletService.getWallets(userEmail);
  if (initialWallets.some((w) => w.tipo === 'cripto')) {
    cryptoService.fetchMarketPrices().then(() => {
      walletService.updateCryptoBalancesWithLiveMarket(userEmail);
      const el = document.getElementById('tab-carteira');
      if (el) renderView();
    });
  }

  renderView();
}
