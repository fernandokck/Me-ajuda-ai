/**
 * Wallet Service (Carteira & Alocação de Patrimônio)
 * Manages bank accounts, crypto wallets, brokers, currencies (BRL, USD, EUR, USDT, USDC),
 * allocation time tracking, live daily cryptocurrency price updates, and consolidated balance calculation.
 */

import { storage } from './storage.js';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { cryptoService, SUPPORTED_CRYPTOS } from './crypto.js';

export const CURRENCY_SYMBOLS = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  USDT: '₮',
  USDC: '$'
};

export const CURRENCY_RATES_APPROX = {
  BRL: 1.0,
  USD: 5.60,
  EUR: 6.10,
  USDT: 5.60,
  USDC: 5.60
};

export function fmtCurrency(val, currency = 'BRL') {
  const num = Number(val) || 0;
  if (currency === 'BRL') {
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } else if (currency === 'USD') {
    return '$ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (currency === 'EUR') {
    return '€ ' + num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (currency === 'USDT') {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  } else if (currency === 'USDC') {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  }
  return `${num.toFixed(2)} ${currency}`;
}

export function calculateDurationText(startDateStr) {
  if (!startDateStr) return 'Recente';
  const start = new Date(startDateStr);
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Há 1 dia';
  if (diffDays < 30) return `Há ${diffDays} dias`;
  
  const months = Math.floor(diffDays / 30);
  if (months === 1) return 'Há 1 mês';
  if (months < 12) return `Há ${months} meses`;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 1) {
    return remMonths > 0 ? `Há 1 ano e ${remMonths}m` : 'Há 1 ano';
  }
  return remMonths > 0 ? `Há ${years} anos e ${remMonths}m` : `Há ${years} anos`;
}

export const WALLET_TYPES = [
  { id: 'conta', label: 'Conta Bancária', icon: '🏦' },
  { id: 'cripto', label: 'Carteira Cripto', icon: '🪙' },
  { id: 'corretora', label: 'Corretora / Investimentos', icon: '📈' },
  { id: 'reserva', label: 'Caixinha / Reserva', icon: '📦' },
  { id: 'dinheiro', label: 'Dinheiro Físico', icon: '💵' },
  { id: 'outro', label: 'Outra Aplicação', icon: '💼' }
];

export const walletService = {
  deduplicateWallets(list) {
    if (!Array.isArray(list)) return { unique: [], dupIds: [] };
    const seenSigs = new Set();
    const seenIds = new Set();
    const unique = [];
    const dupIds = [];

    for (const w of list) {
      if (!w) continue;
      const idStr = String(w.id);
      const cleanName = (w.nome || '').trim().toLowerCase();
      const sig = `${cleanName}_${w.moeda || 'BRL'}_${w.tipo || 'conta'}_${w.cryptoSymbol || ''}`;

      if (!seenIds.has(idStr) && !seenSigs.has(sig)) {
        seenIds.add(idStr);
        seenSigs.add(sig);
        unique.push(w);
      } else {
        dupIds.push(idStr);
      }
    }
    return { unique, dupIds };
  },

  getWallets(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const raw = storage.get(`wallets_${cleanEmail}`, []);
    const { unique } = this.deduplicateWallets(raw);
    if (unique.length !== raw.length) {
      storage.set(`wallets_${cleanEmail}`, unique);
    }
    return unique;
  },

  saveWallets(userEmail, list) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const { unique } = this.deduplicateWallets(list);
    storage.set(`wallets_${cleanEmail}`, unique);
    return unique;
  },

  // Recalculates crypto holdings with latest live market prices
  updateCryptoBalancesWithLiveMarket(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getWallets(cleanEmail);
    let changed = false;

    list.forEach((w) => {
      if (w.tipo === 'cripto' && w.cryptoSymbol && Number(w.cryptoQty) > 0 && w.autoUpdatePrice !== false) {
        const holding = cryptoService.calculateHoldingValue(w.cryptoSymbol, w.cryptoQty, w.moeda || 'BRL');
        const calculatedSaldo = Number(holding.displayValue.toFixed(2));
        if (Math.abs(Number(w.saldo) - calculatedSaldo) > 0.05) {
          w.saldo = calculatedSaldo;
          w.atualizadoEm = new Date().toISOString();
          changed = true;
        }
      }
    });

    if (changed) {
      this.saveWallets(cleanEmail, list);
    }
    return list;
  },

  async syncWithCloud(user) {
    if (!isSupabaseConfigured || !supabase || !user?.email) return;
    const cleanEmail = (user.email || '').trim().toLowerCase();
    try {
      console.log(`[Wallet Sync] Sincronizando carteira para ${cleanEmail}...`);
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_email', cleanEmail)
        .order('atualizado_em', { ascending: false });

      if (error) {
        console.warn('[Wallet Sync] Erro ao buscar carteiras na nuvem:', error);
      }

      const localWallets = this.getWallets(cleanEmail);

      if (!error && data) {
        const mapped = data.map((w) => {
          // Parse crypto metadata if stored in obs or separate columns
          let cryptoSymbol = w.crypto_symbol || null;
          let cryptoQty = w.crypto_qty ? Number(w.crypto_qty) : null;
          let autoUpdatePrice = w.auto_update_price !== undefined ? Boolean(w.auto_update_price) : true;

          if (!cryptoSymbol && w.obs && w.obs.includes('[crypto:')) {
            const match = w.obs.match(/\[crypto:([A-Za-z]+):([0-9.]+)\]/);
            if (match) {
              cryptoSymbol = match[1].toUpperCase();
              cryptoQty = parseFloat(match[2]);
            }
          }

          return {
            id: String(w.id),
            nome: w.nome,
            tipo: w.tipo,
            saldo: Number(w.saldo),
            moeda: w.moeda || 'BRL',
            obs: (w.obs || '').replace(/\[crypto:[^\]]+\]/g, '').trim(),
            cryptoSymbol,
            cryptoQty,
            autoUpdatePrice,
            dataInicio: w.data_inicio || new Date().toISOString().slice(0, 10),
            atualizadoEm: w.atualizado_em || new Date().toISOString()
          };
        });

        const { unique: cloudUnique, dupIds } = this.deduplicateWallets(mapped);
        if (dupIds.length > 0) {
          for (const dId of dupIds) {
            supabase.from('wallets').delete().eq('id', dId).eq('user_email', cleanEmail).then(() => {}).catch(() => {});
          }
        }

        const cloudSigs = new Set(cloudUnique.map((c) => `${(c.nome || '').trim().toLowerCase()}_${c.moeda || 'BRL'}_${c.tipo || 'conta'}_${c.cryptoSymbol || ''}`));
        const cloudIds = new Set(cloudUnique.map((c) => String(c.id)));

        const localOnly = localWallets.filter((lw) => {
          const sig = `${(lw.nome || '').trim().toLowerCase()}_${lw.moeda || 'BRL'}_${lw.tipo || 'conta'}_${lw.cryptoSymbol || ''}`;
          return !cloudIds.has(String(lw.id)) && !cloudSigs.has(sig);
        });

        if (localOnly.length > 0) {
          console.log(`[Wallet Sync] Enviando ${localOnly.length} carteiras locais para a nuvem...`);
          for (const item of localOnly) {
            // Encode crypto metadata into obs for backwards compatibility if column not present
            let obsPayload = item.obs || '';
            if (item.cryptoSymbol && item.cryptoQty) {
              obsPayload = `${obsPayload} [crypto:${item.cryptoSymbol}:${item.cryptoQty}]`.trim();
            }

            const insertPayload = {
              id: String(item.id),
              nome: item.nome,
              tipo: item.tipo,
              saldo: item.saldo,
              moeda: item.moeda || 'BRL',
              obs: obsPayload,
              data_inicio: item.dataInicio,
              atualizado_em: item.atualizadoEm,
              user_email: cleanEmail
            };

            if (item.cryptoSymbol) insertPayload.crypto_symbol = item.cryptoSymbol;
            if (item.cryptoQty) insertPayload.crypto_qty = item.cryptoQty;
            if (item.autoUpdatePrice !== undefined) insertPayload.auto_update_price = item.autoUpdatePrice;

            await supabase.from('wallets').insert(insertPayload).then(() => {}).catch(async (e) => {
              // Retry without crypto columns if DB doesn't have them yet
              delete insertPayload.crypto_symbol;
              delete insertPayload.crypto_qty;
              delete insertPayload.auto_update_price;
              await supabase.from('wallets').insert(insertPayload).catch(() => {});
            });
          }
        }

        const merged = [...cloudUnique, ...localOnly];
        const { unique: finalWallets } = this.deduplicateWallets(merged);
        storage.set(`wallets_${cleanEmail}`, finalWallets);
      }
    } catch (err) {
      console.warn('[Wallet Sync] Erro:', err);
    }
  },

  addWallet(userEmail, { nome, tipo, saldo, moeda, obs, dataInicio, cryptoSymbol, cryptoQty, autoUpdatePrice }) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    let numericSaldo = parseFloat(saldo);

    // If it's a crypto holding with quantity, compute initial balance from current live price
    if (tipo === 'cripto' && cryptoSymbol && Number(cryptoQty) > 0) {
      const holding = cryptoService.calculateHoldingValue(cryptoSymbol, cryptoQty, moeda || 'BRL');
      if (isNaN(numericSaldo) || autoUpdatePrice !== false) {
        numericSaldo = Number(holding.displayValue.toFixed(2));
      }
    }

    if (!nome || isNaN(numericSaldo)) {
      throw new Error('Preencha o nome da conta e o saldo corretamente.');
    }

    const list = this.getWallets(cleanEmail);
    const newId = String(Date.now());
    const item = {
      id: newId,
      nome: nome.trim(),
      tipo: tipo || 'conta',
      saldo: numericSaldo,
      moeda: moeda || 'BRL',
      obs: (obs || '').trim(),
      cryptoSymbol: cryptoSymbol || null,
      cryptoQty: cryptoQty ? Number(cryptoQty) : null,
      autoUpdatePrice: autoUpdatePrice !== false,
      dataInicio: dataInicio || new Date().toISOString().slice(0, 10),
      atualizadoEm: new Date().toISOString()
    };

    list.push(item);
    this.saveWallets(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      let obsPayload = item.obs;
      if (item.cryptoSymbol && item.cryptoQty) {
        obsPayload = `${obsPayload} [crypto:${item.cryptoSymbol}:${item.cryptoQty}]`.trim();
      }

      const insertPayload = {
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        saldo: item.saldo,
        moeda: item.moeda,
        obs: obsPayload,
        data_inicio: item.dataInicio,
        atualizado_em: item.atualizadoEm,
        user_email: cleanEmail
      };

      if (item.cryptoSymbol) insertPayload.crypto_symbol = item.cryptoSymbol;
      if (item.cryptoQty) insertPayload.crypto_qty = item.cryptoQty;
      if (item.autoUpdatePrice !== undefined) insertPayload.auto_update_price = item.autoUpdatePrice;

      supabase.from('wallets').insert(insertPayload).then(({ error }) => {
        if (error) {
          // Retry without extra columns if not yet created in Supabase
          delete insertPayload.crypto_symbol;
          delete insertPayload.crypto_qty;
          delete insertPayload.auto_update_price;
          supabase.from('wallets').insert(insertPayload).catch(() => {});
        }
      }).catch((e) => console.warn('[Wallet Insert] Exceção:', e));
    }

    return item;
  },

  updateWallet(userEmail, id, updates) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const strId = String(id);
    const list = this.getWallets(cleanEmail);
    const idx = list.findIndex((w) => String(w.id) === strId);
    if (idx === -1) throw new Error('Conta não encontrada.');

    let newSaldo = parseFloat(updates.saldo !== undefined ? updates.saldo : list[idx].saldo);
    const newTipo = updates.tipo !== undefined ? updates.tipo : list[idx].tipo;
    const newCryptoSymbol = updates.cryptoSymbol !== undefined ? updates.cryptoSymbol : list[idx].cryptoSymbol;
    const newCryptoQty = updates.cryptoQty !== undefined ? updates.cryptoQty : list[idx].cryptoQty;
    const newAutoUpdatePrice = updates.autoUpdatePrice !== undefined ? updates.autoUpdatePrice : list[idx].autoUpdatePrice;
    const newMoeda = updates.moeda || list[idx].moeda || 'BRL';

    if (newTipo === 'cripto' && newCryptoSymbol && Number(newCryptoQty) > 0 && newAutoUpdatePrice !== false) {
      const holding = cryptoService.calculateHoldingValue(newCryptoSymbol, newCryptoQty, newMoeda);
      newSaldo = Number(holding.displayValue.toFixed(2));
    }

    list[idx] = {
      ...list[idx],
      ...updates,
      tipo: newTipo,
      cryptoSymbol: newCryptoSymbol,
      cryptoQty: newCryptoQty ? Number(newCryptoQty) : null,
      autoUpdatePrice: newAutoUpdatePrice !== false,
      saldo: newSaldo,
      atualizadoEm: new Date().toISOString()
    };

    this.saveWallets(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      let obsPayload = list[idx].obs || '';
      if (list[idx].cryptoSymbol && list[idx].cryptoQty) {
        obsPayload = `${obsPayload.replace(/\[crypto:[^\]]+\]/g, '').trim()} [crypto:${list[idx].cryptoSymbol}:${list[idx].cryptoQty}]`.trim();
      }

      const updatePayload = {
        nome: list[idx].nome,
        tipo: list[idx].tipo,
        saldo: list[idx].saldo,
        moeda: list[idx].moeda,
        obs: obsPayload,
        data_inicio: list[idx].dataInicio,
        atualizado_em: list[idx].atualizadoEm
      };

      if (list[idx].cryptoSymbol) updatePayload.crypto_symbol = list[idx].cryptoSymbol;
      if (list[idx].cryptoQty) updatePayload.crypto_qty = list[idx].cryptoQty;
      if (list[idx].autoUpdatePrice !== undefined) updatePayload.auto_update_price = list[idx].autoUpdatePrice;

      supabase.from('wallets').update(updatePayload).eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) {
          delete updatePayload.crypto_symbol;
          delete updatePayload.crypto_qty;
          delete updatePayload.auto_update_price;
          supabase.from('wallets').update(updatePayload).eq('id', strId).eq('user_email', cleanEmail).catch(() => {});
        }
      }).catch((e) => console.warn('[Wallet Update] Exceção:', e));
    }

    return list[idx];
  },

  deleteWallet(userEmail, id) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const strId = String(id);
    const list = this.getWallets(cleanEmail).filter((w) => String(w.id) !== strId);
    this.saveWallets(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('wallets').delete().eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) console.warn('[Wallet Delete] Erro Supabase:', error);
      }).catch((e) => console.warn('[Wallet Delete] Exceção:', e));
    }

    return list;
  },

  getSummary(userEmail) {
    const list = this.getWallets(userEmail);
    const byCurrency = {
      BRL: 0,
      USD: 0,
      EUR: 0,
      USDT: 0,
      USDC: 0
    };

    let totalApproxBRL = 0;

    list.forEach((w) => {
      const cur = w.moeda || 'BRL';
      let s = Number(w.saldo) || 0;

      // Realtime live valuation for cryptos
      if (w.tipo === 'cripto' && w.cryptoSymbol && Number(w.cryptoQty) > 0 && w.autoUpdatePrice !== false) {
        const holding = cryptoService.calculateHoldingValue(w.cryptoSymbol, w.cryptoQty, cur);
        s = holding.displayValue;
      }

      if (byCurrency[cur] !== undefined) {
        byCurrency[cur] += s;
      }
      const rate = CURRENCY_RATES_APPROX[cur] || 1.0;
      totalApproxBRL += s * rate;
    });

    return {
      totalCount: list.length,
      byCurrency,
      totalApproxBRL,
      list
    };
  }
};
