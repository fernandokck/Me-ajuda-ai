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

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
    if (!isSupabaseConfigured || !supabase || !user?.email) return;
    const cleanEmail = (user.email || '').trim().toLowerCase();
    try {
      console.log(`[Finance Sync] Sincronizando dados na nuvem para ${cleanEmail}...`);

      // 1. Sync Transactions from Supabase for this user
      const { data: cloudTx, error: errTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_email', cleanEmail)
        .order('data', { ascending: false });

      if (errTx) {
        console.warn('[Finance Sync] Erro ao buscar transações na nuvem:', errTx);
      }

      const localTx = this.getTransactions(cleanEmail);

      if (!errTx && cloudTx) {
        const cloudMapped = cloudTx.map((t) => ({
          id: String(t.id),
          tipo: t.tipo,
          subcategoria: t.subcategoria || '',
          data: t.data,
          desc: t.descricao || t.desc || '',
          valor: Number(t.valor),
          moeda: t.moeda || 'BRL',
          recorrenteId: t.recorrente_id ? String(t.recorrente_id) : null
        }));

        // Check local transactions that are not in the cloud
        const cloudIds = new Set(cloudMapped.map((c) => String(c.id)));
        const cloudSignatures = new Set(cloudMapped.map((c) => `${c.data}_${c.desc}_${c.valor}_${c.tipo}`));

        const localOnly = localTx.filter((lt) => {
          const sig = `${lt.data}_${lt.desc}_${lt.valor}_${lt.tipo}`;
          return !cloudIds.has(String(lt.id)) && !cloudSignatures.has(sig);
        });

        // Push local-only transactions to Supabase
        if (localOnly.length > 0) {
          console.log(`[Finance Sync] Enviando ${localOnly.length} transações locais para a nuvem...`);
          for (const item of localOnly) {
            const validId = (item.id && String(item.id).length === 36 && String(item.id).includes('-')) ? String(item.id) : generateUUID();
            item.id = validId;
            await supabase.from('transactions').insert({
              id: validId,
              tipo: item.tipo,
              subcategoria: item.subcategoria || '',
              data: item.data,
              descricao: item.desc,
              valor: item.valor,
              moeda: item.moeda || 'BRL',
              recorrente_id: item.recorrenteId ? String(item.recorrenteId) : null,
              user_email: cleanEmail
            }).then(() => {}).catch((e) => console.warn('[Finance Sync Insert]', e));
          }
        }

        const mergedTx = [...cloudMapped, ...localOnly];
        this.setTransactions(cleanEmail, mergedTx);
      }

      // 2. Sync Recurring Rules
      const { data: cloudRec, error: errRec } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_email', cleanEmail);

      if (errRec) {
        console.warn('[Finance Sync] Erro ao buscar recorrentes na nuvem:', errRec);
      }

      const localRec = this.getRecurring(cleanEmail);

      if (!errRec && cloudRec) {
        const mappedRec = cloudRec.map((r) => ({
          id: String(r.id),
          tipo: r.tipo,
          subcategoria: r.subcategoria || '',
          desc: r.descricao || r.desc || '',
          valor: Number(r.valor),
          moeda: r.moeda || 'BRL',
          diaVencimento: Number(r.dia_vencimento),
          criadoEm: r.criado_em
        }));

        const cloudRecIds = new Set(mappedRec.map((c) => String(c.id)));
        const cloudRecSigs = new Set(mappedRec.map((c) => `${c.desc}_${c.valor}_${c.diaVencimento}`));

        const localRecOnly = localRec.filter((lr) => {
          const sig = `${lr.desc}_${lr.valor}_${lr.diaVencimento}`;
          return !cloudRecIds.has(String(lr.id)) && !cloudRecSigs.has(sig);
        });

        if (localRecOnly.length > 0) {
          console.log(`[Finance Sync] Enviando ${localRecOnly.length} regras recorrentes locais para a nuvem...`);
          for (const item of localRecOnly) {
            const validId = (item.id && String(item.id).length === 36 && String(item.id).includes('-')) ? String(item.id) : generateUUID();
            item.id = validId;
            await supabase.from('recurring_rules').insert({
              id: validId,
              tipo: item.tipo,
              descricao: item.desc,
              valor: item.valor,
              moeda: item.moeda || 'BRL',
              subcategoria: item.subcategoria || '',
              dia_vencimento: item.diaVencimento,
              criado_em: item.criadoEm || curMonthKey(),
              user_email: cleanEmail
            }).then(() => {}).catch((e) => console.warn('[Finance Sync Rec Insert]', e));
          }
        }

        const mergedRec = [...mappedRec, ...localRecOnly];
        this.setRecurring(cleanEmail, mergedRec);
      }
    } catch (e) {
      console.warn('[Finance Sync] Exceção de sincronização:', e);
    }
  },

  generateRecurring(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cur = curMonthKey();
    const recorrentes = this.getRecurring(cleanEmail);
    let transacoes = this.getTransactions(cleanEmail);
    let updated = false;

    recorrentes.forEach((r) => {
      monthsBetween(r.criadoEm, cur).forEach((ym) => {
        const exists = transacoes.some(
          (t) => String(t.recorrenteId) === String(r.id) && monthKey(t.data) === ym
        );
        if (!exists) {
          transacoes.push({
            id: generateUUID(),
            tipo: r.tipo,
            subcategoria: r.subcategoria || '',
            data: occurrenceDate(ym, r.diaVencimento),
            desc: `${r.desc} (recorrente)`,
            valor: Number(r.valor),
            moeda: r.moeda || 'BRL',
            recorrenteId: String(r.id)
          });
          updated = true;
        }
      });
    });

    if (updated) {
      this.setTransactions(cleanEmail, transacoes);
    }
    return transacoes;
  },

  async addTransaction(userEmail, { tipo, data, desc, valor, subcategoria, recorrente, diaVencimento, moeda = 'BRL' }) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    if (!data || !desc || isNaN(numericVal) || numericVal <= 0) {
      throw new Error('Preencha os campos obrigatórios com um valor válido maior que zero.');
    }

    const txList = this.getTransactions(cleanEmail);
    const newTxId = generateUUID();

    if (recorrente) {
      const venc = parseInt(diaVencimento, 10);
      if (!venc || venc < 1 || venc > 31) {
        throw new Error('Informe um dia de vencimento válido (1 a 31).');
      }
      const recList = this.getRecurring(cleanEmail);
      const rule = {
        id: newTxId,
        tipo,
        desc: desc.trim(),
        valor: numericVal,
        moeda: moeda || 'BRL',
        subcategoria: subcategoria || '',
        diaVencimento: venc,
        criadoEm: curMonthKey()
      };
      recList.push(rule);
      this.setRecurring(cleanEmail, recList);
      this.generateRecurring(cleanEmail);

      // Cloud sync insert
      if (isSupabaseConfigured && supabase) {
        supabase.from('recurring_rules').insert({
          id: newTxId,
          tipo,
          descricao: desc.trim(),
          valor: numericVal,
          moeda: moeda || 'BRL',
          subcategoria: subcategoria || '',
          dia_vencimento: venc,
          criado_em: curMonthKey(),
          user_email: cleanEmail
        }).then(({ error }) => {
          if (error) console.warn('[Recurring Insert] Erro Supabase:', error);
        }).catch((e) => console.warn('[Recurring Insert] Exceção:', e));
      }
    } else {
      const tx = {
        id: newTxId,
        tipo,
        moeda: moeda || 'BRL',
        subcategoria: subcategoria || '',
        data,
        desc: desc.trim(),
        valor: numericVal
      };
      txList.push(tx);
      this.setTransactions(cleanEmail, txList);

      // Cloud sync insert
      if (isSupabaseConfigured && supabase) {
        supabase.from('transactions').insert({
          id: newTxId,
          tipo,
          subcategoria: subcategoria || '',
          data,
          descricao: desc.trim(),
          valor: numericVal,
          moeda: moeda || 'BRL',
          user_email: cleanEmail
        }).then(({ error }) => {
          if (error) console.warn('[Transaction Insert] Erro Supabase:', error);
        }).catch((e) => console.warn('[Transaction Insert] Exceção:', e));
      }
    }
  },

  async updateTransaction(userEmail, id, { tipo, data, desc, valor, subcategoria, moeda = 'BRL' }) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    if (!data || !desc || isNaN(numericVal) || numericVal <= 0) {
      throw new Error('Preencha os campos obrigatórios com um valor válido maior que zero.');
    }

    const list = this.getTransactions(cleanEmail);
    const strId = String(id);
    const numericId = isNaN(id) ? id : Number(id);
    const idx = list.findIndex((t) => String(t.id) === strId || t.id === numericId);
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

    this.setTransactions(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('transactions').update({
        tipo,
        subcategoria: subcategoria || '',
        data,
        descricao: desc.trim(),
        valor: numericVal,
        moeda: moeda || 'BRL'
      }).eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) console.warn('[Transaction Update] Erro Supabase:', error);
      }).catch((e) => console.warn('[Transaction Update] Exceção:', e));
    }

    return list[idx];
  },

  async deleteTransaction(userEmail, id) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const strId = String(id);
    const numericId = isNaN(id) ? id : Number(id);
    const list = this.getTransactions(cleanEmail).filter((t) => String(t.id) !== strId && t.id !== numericId);
    this.setTransactions(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('transactions').delete().eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) console.warn('[Transaction Delete] Erro Supabase:', error);
      }).catch((e) => console.warn('[Transaction Delete] Exceção:', e));
    }
    return list;
  },

  async updateRecurring(userEmail, id, { tipo, desc, valor, subcategoria, diaVencimento, moeda = 'BRL' }) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    let numericVal = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numericVal)) numericVal = parseFloat(valor);

    const venc = parseInt(diaVencimento, 10);
    if (!desc || isNaN(numericVal) || numericVal <= 0 || !venc || venc < 1 || venc > 31) {
      throw new Error('Preencha os campos da regra recorrente corretamente.');
    }

    const list = this.getRecurring(cleanEmail);
    const strId = String(id);
    const numericId = isNaN(id) ? id : Number(id);
    const idx = list.findIndex((r) => String(r.id) === strId || r.id === numericId);
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

    this.setRecurring(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('recurring_rules').update({
        tipo,
        descricao: desc.trim(),
        valor: numericVal,
        subcategoria: subcategoria || '',
        dia_vencimento: venc,
        moeda: moeda || 'BRL'
      }).eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) console.warn('[Recurring Update] Erro Supabase:', error);
      }).catch((e) => console.warn('[Recurring Update] Exceção:', e));
    }

    return list[idx];
  },

  async deleteRecurring(userEmail, id) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const strId = String(id);
    const numericId = isNaN(id) ? id : Number(id);
    const list = this.getRecurring(cleanEmail).filter((r) => String(r.id) !== strId && r.id !== numericId);
    this.setRecurring(cleanEmail, list);

    if (isSupabaseConfigured && supabase) {
      supabase.from('recurring_rules').delete().eq('id', strId).eq('user_email', cleanEmail).then(({ error }) => {
        if (error) console.warn('[Recurring Delete] Erro Supabase:', error);
      }).catch((e) => console.warn('[Recurring Delete] Exceção:', e));
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
