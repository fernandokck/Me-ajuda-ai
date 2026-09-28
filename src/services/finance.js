/**
 * Finance Service
 * Core business logic, calculations, date helpers, recurring rule engine,
 * with real-time Supabase cloud synchronization.
 */

import { storage } from './storage.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

export const CATEGORIES = {
  gasto: [
    'Alimentação',
    'Lanches/Besteiras',
    'Hortifrutti',
    'Transporte',
    'Moradia',
    'Lazer',
    'Streamer',
    'Viagens',
    'Trabalho',
    'Saúde',
    'Educação',
    'Outros'
  ],
  investimento: [
    'Reserva de Emergência',
    'Renda Fixa / CDB / Tesouro',
    'Ações / FIIs',
    'Criptomoedas',
    'Outro Investimento'
  ]
};

export const CATEGORY_ICONS = {
  'Alimentação': '🛒',
  'Lanches/Besteiras': '🍔',
  'Hortifrutti': '🥬',
  'Transporte': '🚗',
  'Moradia': '🏠',
  'Lazer': '🎉',
  'Streamer': '📺',
  'Viagens': '✈️',
  'Trabalho': '💼',
  'Saúde': '💊',
  'Educação': '📚',
  'Outros': '📦',
  'Reserva de Emergência': '🛡️',
  'Renda Fixa / CDB / Tesouro': '🏦',
  'Ações / FIIs': '📈',
  'Criptomoedas': '🪙',
  'Outro Investimento': '🌱'
};

export function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '🏷️';
}

export const TAG_CLASSES = {
  salario: 'tag-salario',
  freelance: 'tag-freelance',
  contafixa: 'tag-contafixa',
  gasto: 'tag-gasto',
  investimento: 'tag-investimento'
};

export const TAG_LABELS = {
  salario: 'Salário / Renda',
  freelance: 'Free Lancer',
  contafixa: 'Conta Fixa',
  gasto: 'Gasto Variável',
  investimento: 'Investimento'
};

export function fmtBRL(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getBRLValue(val, moeda = 'BRL') {
  const num = Number(val) || 0;
  if (moeda === 'USD' || moeda === 'USDT' || moeda === 'USDC') return num * 5.60;
  if (moeda === 'EUR') return num * 6.10;
  return num;
}

export function fmtCurrencyTx(val, moeda = 'BRL') {
  const num = Number(val) || 0;
  if (moeda === 'USD' || moeda === 'USDT' || moeda === 'USDC') {
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  if (moeda === 'EUR') {
    return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
  return fmtBRL(num);
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function monthKey(dateString) {
  return (dateString || '').slice(0, 7);
}

export function curMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const names = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  return `${names[parseInt(m, 10) - 1]}/${y}`;
}

export function prevMonthKey(ym) {
  if (!ym) return '';
  let [y, m] = ym.split('-').map(Number);
  m--;
  if (m < 1) {
    m = 12;
    y--;
  }
  return `${y}-${pad(m)}`;
}

export function occurrenceDate(ym, day) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(Math.min(day, last))}`;
}

export function monthsBetween(a, b) {
  const res = [];
  if (!a || !b) return res;
  let [y, m] = a.split('-').map(Number);
  const [ey, em] = b.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    res.push(`${y}-${pad(m)}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return res;
}

export const finance = {
  getTransactions(userEmail) {
    return storage.get(`tx_${userEmail}`, []);
  },

  setTransactions(userEmail, list) {
    storage.set(`tx_${userEmail}`, list);
  },

  getRecurring(userEmail) {
    return storage.get(`rec_${userEmail}`, []);
  },

  setRecurring(userEmail, list) {
    storage.set(`rec_${userEmail}`, list);
  },

  async syncWithCloud(user) {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;
    try {
      // Sync Transactions from Supabase
      const { data: cloudTx, error: errTx } = await supabase
        .from('transactions')
        .select('*')
        .order('data', { ascending: false });

      if (!errTx && cloudTx) {
        const mapped = cloudTx.map((t) => ({
          id: t.id,
          tipo: t.tipo,
          subcategoria: t.subcategoria || '',
          data: t.data,
          desc: t.descricao || t.desc || '',
          valor: Number(t.valor),
          recorrenteId: t.recorrente_id || null
        }));
        if (mapped.length > 0) {
          this.setTransactions(user.email, mapped);
        }
      }

      // Sync Recurring Rules
      const { data: cloudRec, error: errRec } = await supabase
        .from('recurring_rules')
        .select('*');

      if (!errRec && cloudRec) {
        const mappedRec = cloudRec.map((r) => ({
          id: r.id,
          tipo: r.tipo,
          subcategoria: r.subcategoria || '',
          desc: r.descricao || r.desc || '',
          valor: Number(r.valor),
          diaVencimento: Number(r.dia_vencimento),
          criadoEm: r.criado_em
        }));
        if (mappedRec.length > 0) {
          this.setRecurring(user.email, mappedRec);
        }
      }
    } catch (e) {
      console.warn('Cloud sync error:', e);
    }
  },

  generateRecurring(userEmail) {
    const cur = curMonthKey();
    const recorrentes = this.getRecurring(userEmail);
    let transacoes = this.getTransactions(userEmail);
    let updated = false;

    recorrentes.forEach((r) => {
      monthsBetween(r.criadoEm, cur).forEach((ym) => {
        const exists = transacoes.some(
          (t) => t.recorrenteId === r.id && monthKey(t.data) === ym
        );
        if (!exists) {
          transacoes.push({
            id: Date.now() + Math.random(),
            tipo: r.tipo,
            subcategoria: r.subcategoria || '',
            data: occurrenceDate(ym, r.diaVencimento),
            desc: `${r.desc} (recorrente)`,
            valor: Number(r.valor),
            recorrenteId: r.id
          });
          updated = true;
        }
      });
    });

    if (updated) {
      this.setTransactions(userEmail, transacoes);
    }
    return transacoes;
  },

  async addTransaction(userEmail, { tipo, data, desc, valor, subcategoria, recorrente, diaVencimento, moeda = 'BRL' }) {
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    if (!data || !desc || isNaN(numericVal) || numericVal <= 0) {
      throw new Error('Preencha os campos obrigatórios com um valor válido maior que zero.');
    }

    const txList = this.getTransactions(userEmail);
    const newTxId = Date.now();

    if (recorrente) {
      const venc = parseInt(diaVencimento, 10);
      if (!venc || venc < 1 || venc > 31) {
        throw new Error('Informe um dia de vencimento válido (1 a 31).');
      }
      const recList = this.getRecurring(userEmail);
      const rule = {
        id: newTxId,
        tipo,
        desc,
        valor: numericVal,
        moeda: moeda || 'BRL',
        subcategoria: subcategoria || '',
        diaVencimento: venc,
        criadoEm: curMonthKey()
      };
      recList.push(rule);
      this.setRecurring(userEmail, recList);
      this.generateRecurring(userEmail);

      // Cloud sync insert with column 'descricao'
      if (isSupabaseConfigured && supabase) {
        supabase.from('recurring_rules').insert({
          tipo,
          descricao: desc,
          valor: numericVal,
          moeda: moeda || 'BRL',
          subcategoria: subcategoria || '',
          dia_vencimento: venc,
          criado_em: curMonthKey(),
          user_email: userEmail
        }).then(() => {}).catch(() => {});
      }
    } else {
      const tx = {
        id: newTxId,
        tipo,
        moeda: moeda || 'BRL',
        subcategoria: subcategoria || '',
        data,
        desc,
        valor: numericVal
      };
      txList.push(tx);
      this.setTransactions(userEmail, txList);

      // Cloud sync insert with column 'descricao'
      if (isSupabaseConfigured && supabase) {
        supabase.from('transactions').insert({
          tipo,
          subcategoria: subcategoria || '',
          data,
          descricao: desc,
          valor: numericVal,
          moeda: moeda || 'BRL',
          user_email: userEmail
        }).then(() => {}).catch(() => {});
      }
    }
  },

  async updateTransaction(userEmail, id, { tipo, data, desc, valor, subcategoria, moeda = 'BRL' }) {
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    if (!data || !desc || isNaN(numericVal) || numericVal <= 0) {
      throw new Error('Preencha os campos obrigatórios com um valor válido maior que zero.');
    }

    const list = this.getTransactions(userEmail);
    const numericId = isNaN(id) ? id : Number(id);
    const idx = list.findIndex((t) => t.id === id || t.id === numericId);
    if (idx === -1) throw new Error('Lançamento não encontrado.');

    list[idx] = {
      ...list[idx],
      tipo,
      data,
      desc: desc.trim(),
      valor: numericVal,
      subcategoria: subcategoria || '',
      moeda: moeda || 'BRL'
    };

    this.setTransactions(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('transactions').update({
        tipo,
        subcategoria: subcategoria || '',
        data,
        descricao: desc.trim(),
        valor: numericVal,
        moeda: moeda || 'BRL'
      }).eq('id', id).then(() => {}).catch(() => {});
    }

    return list[idx];
  },

  async deleteTransaction(userEmail, id) {
    const numericId = isNaN(id) ? id : Number(id);
    const list = this.getTransactions(userEmail).filter((t) => t.id !== id && t.id !== numericId);
    this.setTransactions(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('transactions').delete().eq('id', id).then(() => {}).catch(() => {});
    }
    return list;
  },

  async updateRecurring(userEmail, id, { tipo, desc, valor, subcategoria, diaVencimento, moeda = 'BRL' }) {
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    const venc = parseInt(diaVencimento, 10);
    if (!desc || isNaN(numericVal) || numericVal <= 0 || !venc || venc < 1 || venc > 31) {
      throw new Error('Preencha os campos da regra recorrente corretamente.');
    }

    const list = this.getRecurring(userEmail);
    const numericId = isNaN(id) ? id : Number(id);
    const idx = list.findIndex((r) => r.id === id || r.id === numericId);
    if (idx === -1) throw new Error('Regra recorrente não encontrada.');

    list[idx] = {
      ...list[idx],
      tipo,
      desc: desc.trim(),
      valor: numericVal,
      subcategoria: subcategoria || '',
      diaVencimento: venc,
      moeda: moeda || 'BRL'
    };

    this.setRecurring(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('recurring_rules').update({
        tipo,
        descricao: desc.trim(),
        valor: numericVal,
        subcategoria: subcategoria || '',
        dia_vencimento: venc,
        moeda: moeda || 'BRL'
      }).eq('id', id).then(() => {}).catch(() => {});
    }

    return list[idx];
  },

  async deleteRecurring(userEmail, id) {
    const numericId = isNaN(id) ? id : Number(id);
    const list = this.getRecurring(userEmail).filter((r) => r.id !== id && r.id !== numericId);
    this.setRecurring(userEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('recurring_rules').delete().eq('id', id).then(() => {}).catch(() => {});
    }
    return list;
  },

  calculateMonthKPIs(userEmail, targetMonth = curMonthKey()) {
    const allTx = this.getTransactions(userEmail);
    const monthTx = allTx.filter((t) => monthKey(t.data) === targetMonth);

    const receita = monthTx
      .filter((t) => t.tipo === 'salario' || t.tipo === 'freelance')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const salario = monthTx
      .filter((t) => t.tipo === 'salario')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const freelance = monthTx
      .filter((t) => t.tipo === 'freelance')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const contafixa = monthTx
      .filter((t) => t.tipo === 'contafixa')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const gastoVariavel = monthTx
      .filter((t) => t.tipo === 'gasto')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const despesa = contafixa + gastoVariavel;

    const invest = monthTx
      .filter((t) => t.tipo === 'investimento')
      .reduce((s, t) => s + getBRLValue(t.valor, t.moeda), 0);

    const saldo = receita - despesa - invest;

    let health = { badge: 'Sem dados', cor: '#94a3b8', text: 'Registre sua renda do mês para calcular sua saúde financeira.' };
    if (receita > 0) {
      const ratio = saldo / receita;
      if (ratio >= 0.2) {
        health = {
          badge: 'Saudável',
          cor: '#10b981',
          text: `Você está guardando ${(ratio * 100).toFixed(0)}% da renda. Excelente trabalho!`
        };
      } else if (ratio >= 0) {
        health = {
          badge: 'Atenção',
          cor: '#f59e0b',
          text: `Sobra pouco no fim do mês (${(ratio * 100).toFixed(0)}%). Vale revisar os gastos supérfluos.`
        };
      } else {
        health = {
          badge: 'Crítico',
          cor: '#ef4444',
          text: 'Você está gastando mais do que ganha este mês. Fique atento!'
        };
      }
    }

    return {
      receita,
      salario,
      freelance,
      despesa,
      contafixa,
      gastoVariavel,
      invest,
      saldo,
      health,
      transactions: monthTx.sort((a, b) => b.data.localeCompare(a.data))
    };
  },

  getAllAvailableMonths(userEmail) {
    const allTx = this.getTransactions(userEmail);
    const set = new Set();
    set.add(curMonthKey());
    allTx.forEach((t) => {
      const k = monthKey(t.data);
      if (k) set.add(k);
    });
    return Array.from(set).sort().reverse();
  },

  getCategoryBreakdown(userEmail, targetMonth = curMonthKey()) {
    const allTx = this.getTransactions(userEmail);
    const monthTx = allTx.filter(
      (t) => monthKey(t.data) === targetMonth && (t.tipo === 'gasto' || t.tipo === 'contafixa')
    );

    const breakdown = {};
    monthTx.forEach((t) => {
      const cat = t.subcategoria || (t.tipo === 'contafixa' ? 'Conta Fixa Geral' : 'Outros');
      if (!breakdown[cat]) {
        breakdown[cat] = { category: cat, total: 0, count: 0, items: [] };
      }
      breakdown[cat].total += Number(t.valor);
      breakdown[cat].count += 1;
      breakdown[cat].items.push(t);
    });

    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  },

  getComparisonData(userEmail, curKey = curMonthKey(), baseKey = null) {
    const compareKey = baseKey || prevMonthKey(curKey);
    const curKPIs = this.calculateMonthKPIs(userEmail, curKey);
    const prevKPIs = this.calculateMonthKPIs(userEmail, compareKey);

    const curCats = this.getCategoryBreakdown(userEmail, curKey);
    const prevCats = this.getCategoryBreakdown(userEmail, compareKey);

    const curCatsMap = {};
    curCats.forEach((c) => { curCatsMap[c.category] = c.total; });

    const prevCatsMap = {};
    prevCats.forEach((c) => { prevCatsMap[c.category] = c.total; });

    const allCatNames = Array.from(new Set([...Object.keys(curCatsMap), ...Object.keys(prevCatsMap)]));

    const categoryChanges = allCatNames.map((name) => {
      const curVal = curCatsMap[name] || 0;
      const prevVal = prevCatsMap[name] || 0;
      const diff = curVal - prevVal; // positive = increased spending, negative = saved/decreased
      const pct = prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : (curVal > 0 ? 100 : 0);

      let changeType = 'same'; // 'eliminated', 'reduced', 'increased', 'new'
      if (prevVal > 0 && curVal === 0) changeType = 'eliminated';
      else if (prevVal === 0 && curVal > 0) changeType = 'new';
      else if (diff < 0) changeType = 'reduced';
      else if (diff > 0) changeType = 'increased';

      return {
        category: name,
        curVal,
        prevVal,
        diff,
        pct,
        changeType
      };
    });

    // Separated insights
    const eliminated = categoryChanges.filter((c) => c.changeType === 'eliminated');
    const reduced = categoryChanges.filter((c) => c.changeType === 'reduced').sort((a, b) => a.diff - b.diff);
    const increased = categoryChanges.filter((c) => c.changeType === 'increased').sort((a, b) => b.diff - a.diff);
    const newExpenses = categoryChanges.filter((c) => c.changeType === 'new').sort((a, b) => b.curVal - a.curVal);

    const totalSavingsFromReductions = categoryChanges
      .filter((c) => c.diff < 0)
      .reduce((acc, c) => acc + Math.abs(c.diff), 0);

    const totalNewCostFromIncreases = categoryChanges
      .filter((c) => c.diff > 0)
      .reduce((acc, c) => acc + c.diff, 0);

    const deltaDespesa = curKPIs.despesa - prevKPIs.despesa;
    const deltaReceita = curKPIs.receita - prevKPIs.receita;
    const deltaSaldo = curKPIs.saldo - prevKPIs.saldo;
    const deltaInvest = curKPIs.invest - prevKPIs.invest;

    return {
      curKey,
      curLabel: monthLabel(curKey),
      prevKey: compareKey,
      prevLabel: monthLabel(compareKey),
      curKPIs,
      prevKPIs,
      deltaDespesa,
      deltaReceita,
      deltaSaldo,
      deltaInvest,
      categoryChanges,
      eliminated,
      reduced,
      increased,
      newExpenses,
      totalSavingsFromReductions,
      totalNewCostFromIncreases
    };
  },

  getMonthlyHistory(userEmail, maxMonths = 12) {
    const allTx = this.getTransactions(userEmail);
    const monthsMap = {};

    allTx.forEach((t) => {
      const k = monthKey(t.data);
      if (!monthsMap[k]) monthsMap[k] = { receita: 0, despesa: 0, invest: 0, contafixa: 0, gasto: 0, freelance: 0 };
      const valBRL = getBRLValue(t.valor, t.moeda);
      if (t.tipo === 'salario' || t.tipo === 'freelance') {
        monthsMap[k].receita += valBRL;
        if (t.tipo === 'freelance') monthsMap[k].freelance += valBRL;
      } else if (t.tipo === 'contafixa') {
        monthsMap[k].despesa += valBRL;
        monthsMap[k].contafixa += valBRL;
      } else if (t.tipo === 'gasto') {
        monthsMap[k].despesa += valBRL;
        monthsMap[k].gasto += valBRL;
      } else if (t.tipo === 'investimento') {
        monthsMap[k].invest += valBRL;
      }
    });

    const keys = Object.keys(monthsMap).sort().slice(-maxMonths);
    return keys.map((key) => ({
      key,
      label: monthLabel(key),
      receita: monthsMap[key].receita,
      freelance: monthsMap[key].freelance,
      despesa: monthsMap[key].despesa,
      contafixa: monthsMap[key].contafixa,
      gasto: monthsMap[key].gasto,
      invest: monthsMap[key].invest,
      saldo: monthsMap[key].receita - monthsMap[key].despesa - monthsMap[key].invest
    }));
  },

  calculateYearlySavingsProgress(userEmail, targetYear = new Date().getFullYear().toString()) {
    const profile = storage.get(`perfil_${userEmail}`, {});
    const targetMeta = Number(profile?.meta) || 0;
    const allTx = this.getTransactions(userEmail);

    // Filter transactions of the target year
    const yearTx = allTx.filter((t) => (t.data || '').startsWith(targetYear));

    // Calculate total investments made strictly from investment entries
    const totalInvestments = yearTx
      .filter((t) => t.tipo === 'investimento')
      .reduce((acc, t) => acc + getBRLValue(t.valor, t.moeda), 0);

    // The yearly goal is strictly achieved based on investment entries
    const totalAccumulated = totalInvestments;
    const pct = targetMeta > 0 ? Math.min(100, Math.round((totalAccumulated / targetMeta) * 100)) : 0;
    const milestoneTier = Math.floor(pct / 5) * 5; // e.g. 5, 10, 15...
    const nextMilestonePct = Math.min(100, milestoneTier + 5);
    const amountForNextMilestone = targetMeta > 0 ? (nextMilestonePct / 100) * targetMeta : 0;
    const remainingToNextMilestone = Math.max(0, amountForNextMilestone - totalAccumulated);

    return {
      targetMeta,
      totalAccumulated,
      totalInvestments,
      pct,
      milestoneTier,
      nextMilestonePct,
      remainingToNextMilestone
    };
  }
};
