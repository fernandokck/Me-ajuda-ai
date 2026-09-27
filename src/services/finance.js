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
    'Transporte',
    'Moradia',
    'Lazer',
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

export const TAG_CLASSES = {
  salario: 'tag-salario',
  contafixa: 'tag-contafixa',
  gasto: 'tag-gasto',
  investimento: 'tag-investimento'
};

export const TAG_LABELS = {
  salario: 'Salário / Renda',
  contafixa: 'Conta Fixa',
  gasto: 'Gasto Variável',
  investimento: 'Investimento'
};

export function fmtBRL(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function monthKey(dateString) {
  return (dateString || '').slice(0, 7);
}

export function curMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
          desc: t.desc,
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
          desc: r.desc,
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

  async addTransaction(userEmail, { tipo, data, desc, valor, subcategoria, recorrente, diaVencimento }) {
    const numericVal = parseFloat(valor);
    if (!data || !desc || isNaN(numericVal) || numericVal <= 0) {
      throw new Error('Preencha os campos obrigatórios corretamente.');
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
        subcategoria: subcategoria || '',
        diaVencimento: venc,
        criadoEm: curMonthKey()
      };
      recList.push(rule);
      this.setRecurring(userEmail, recList);
      this.generateRecurring(userEmail);

      // Cloud sync insert
      if (isSupabaseConfigured && supabase) {
        supabase.from('recurring_rules').insert({
          tipo,
          desc,
          valor: numericVal,
          subcategoria: subcategoria || '',
          dia_vencimento: venc,
          criado_em: curMonthKey()
        }).then(() => {}).catch(() => {});
      }
    } else {
      const tx = {
        id: newTxId,
        tipo,
        subcategoria: subcategoria || '',
        data,
        desc,
        valor: numericVal
      };
      txList.push(tx);
      this.setTransactions(userEmail, txList);

      // Cloud sync insert
      if (isSupabaseConfigured && supabase) {
        supabase.from('transactions').insert({
          tipo,
          subcategoria: subcategoria || '',
          data,
          desc,
          valor: numericVal
        }).then(() => {}).catch(() => {});
      }
    }
  },

  async deleteTransaction(userEmail, id) {
    const list = this.getTransactions(userEmail).filter((t) => t.id !== id);
    this.setTransactions(userEmail, list);

    if (isSupabaseConfigured && supabase && typeof id === 'string') {
      supabase.from('transactions').delete().eq('id', id).then(() => {}).catch(() => {});
    }
    return list;
  },

  async deleteRecurring(userEmail, id) {
    const list = this.getRecurring(userEmail).filter((r) => r.id !== id);
    this.setRecurring(userEmail, list);

    if (isSupabaseConfigured && supabase && typeof id === 'string') {
      supabase.from('recurring_rules').delete().eq('id', id).then(() => {}).catch(() => {});
    }
    return list;
  },

  calculateMonthKPIs(userEmail, targetMonth = curMonthKey()) {
    const allTx = this.getTransactions(userEmail);
    const monthTx = allTx.filter((t) => monthKey(t.data) === targetMonth);

    const receita = monthTx
      .filter((t) => t.tipo === 'salario')
      .reduce((s, t) => s + t.valor, 0);

    const despesa = monthTx
      .filter((t) => t.tipo === 'contafixa' || t.tipo === 'gasto')
      .reduce((s, t) => s + t.valor, 0);

    const invest = monthTx
      .filter((t) => t.tipo === 'investimento')
      .reduce((s, t) => s + t.valor, 0);

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
      despesa,
      invest,
      saldo,
      health,
      transactions: monthTx.sort((a, b) => b.data.localeCompare(a.data))
    };
  },

  getMonthlyHistory(userEmail, maxMonths = 6) {
    const allTx = this.getTransactions(userEmail);
    const monthsMap = {};

    allTx.forEach((t) => {
      const k = monthKey(t.data);
      if (!monthsMap[k]) monthsMap[k] = { receita: 0, despesa: 0, invest: 0 };
      if (t.tipo === 'salario') monthsMap[k].receita += t.valor;
      else if (t.tipo === 'contafixa' || t.tipo === 'gasto') monthsMap[k].despesa += t.valor;
      else if (t.tipo === 'investimento') monthsMap[k].invest += t.valor;
    });

    const keys = Object.keys(monthsMap).sort().slice(-maxMonths);
    return keys.map((key) => ({
      key,
      label: monthLabel(key),
      receita: monthsMap[key].receita,
      despesa: monthsMap[key].despesa,
      invest: monthsMap[key].invest,
      saldo: monthsMap[key].receita - monthsMap[key].despesa - monthsMap[key].invest
    }));
  }
};
