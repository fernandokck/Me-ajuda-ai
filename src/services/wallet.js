/**
 * Wallet Service (Carteira & Alocação de Patrimônio)
 * Manages bank accounts, crypto wallets, brokers, currencies (BRL, USD, EUR, USDT, USDC),
 * allocation time tracking, and consolidated balance calculation.
 */

import { storage } from './storage.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

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
  getWallets(userEmail) {
    return storage.get(`wallets_${userEmail}`, []);
  },

  saveWallets(userEmail, list) {
    storage.set(`wallets_${userEmail}`, list);
    return list;
  },

  async syncWithCloud(user) {
    if (!isSupabaseConfigured || !supabase || !user?.email) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('atualizado_em', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map((w) => ({
          id: w.id.toString(),
          nome: w.nome,
          tipo: w.tipo,
          saldo: Number(w.saldo),
          moeda: w.moeda || 'BRL',
          obs: w.obs || '',
          dataInicio: w.data_inicio || new Date().toISOString().slice(0, 10),
          atualizadoEm: w.atualizado_em || new Date().toISOString()
        }));
        this.saveWallets(user.email, mapped);
      }
    } catch (err) {
      console.warn('Wallet cloud sync error:', err);
    }
  },

  addWallet(userEmail, { nome, tipo, saldo, moeda, obs, dataInicio }) {
    const numericSaldo = parseFloat(saldo);
    if (!nome || isNaN(numericSaldo)) {
      throw new Error('Preencha o nome da conta e o saldo corretamente.');
    }

    const list = this.getWallets(userEmail);
    const newId = Date.now().toString();
    const item = {
      id: newId,
      nome: nome.trim(),
      tipo: tipo || 'conta',
      saldo: numericSaldo,
      moeda: moeda || 'BRL',
      obs: (obs || '').trim(),
      dataInicio: dataInicio || new Date().toISOString().slice(0, 10),
      atualizadoEm: new Date().toISOString()
    };

    list.push(item);
    this.saveWallets(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('wallets').insert({
        nome: item.nome,
        tipo: item.tipo,
        saldo: item.saldo,
        moeda: item.moeda,
        obs: item.obs,
        data_inicio: item.dataInicio,
        user_email: userEmail
      }).then(() => {}).catch(() => {});
    }

    return item;
  },

  updateWallet(userEmail, id, updates) {
    const list = this.getWallets(userEmail);
    const idx = list.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Conta não encontrada.');

    list[idx] = {
      ...list[idx],
      ...updates,
      saldo: parseFloat(updates.saldo !== undefined ? updates.saldo : list[idx].saldo),
      atualizadoEm: new Date().toISOString()
    };

    this.saveWallets(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('wallets').update({
        nome: list[idx].nome,
        tipo: list[idx].tipo,
        saldo: list[idx].saldo,
        moeda: list[idx].moeda,
        obs: list[idx].obs,
        data_inicio: list[idx].dataInicio,
        atualizado_em: new Date().toISOString()
      }).eq('id', id).then(() => {}).catch(() => {});
    }

    return list[idx];
  },

  deleteWallet(userEmail, id) {
    const list = this.getWallets(userEmail).filter((w) => w.id !== id);
    this.saveWallets(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('wallets').delete().eq('id', id).then(() => {}).catch(() => {});
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
      const s = Number(w.saldo) || 0;
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
