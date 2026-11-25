/**
 * Debt & Pending Payments Service (Pagamentos Pendentes & Parcelamentos)
 * Manages installment debts, loans, remaining balances, monthly commitments,
 * installment deductions, payment histories, and automatic expense synchronization.
 */

import { storage } from './storage.js';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { finance, todayKey } from './finance.js';

export const DEBT_CATEGORIES = [
  'Dívidas & Empréstimos',
  'Compras Parceladas',
  'Veículos & Transporte',
  'Habitação & Reforma',
  'Eletrônicos & Informática',
  'Educação & Cursos',
  'Saúde & Tratamentos',
  'Outros Pagamentos'
];

export const DEBT_CATEGORY_ICONS = {
  'Dívidas & Empréstimos': '💳',
  'Compras Parceladas': '🛍️',
  'Veículos & Transporte': '🚗',
  'Habitação & Reforma': '🏠',
  'Eletrônicos & Informática': '💻',
  'Educação & Cursos': '📚',
  'Saúde & Tratamentos': '🩺',
  'Outros Pagamentos': '📑'
};

export function getDebtCategoryIcon(cat) {
  return DEBT_CATEGORY_ICONS[cat] || '⏳';
}

function normalizeDebt(d) {
  if (!d) return null;
  const totalParcelas = Math.max(1, parseInt(d.totalParcelas, 10) || 1);
  const parcelasPagas = Math.max(0, parseInt(d.parcelasPagas, 10) || 0);
  const valorParcela = Math.max(0, parseFloat(d.valorParcela) || 0);
  const valorTotal = d.valorTotal !== undefined && d.valorTotal !== null && !isNaN(parseFloat(d.valorTotal))
    ? Math.max(0, parseFloat(d.valorTotal))
    : valorParcela * totalParcelas;

  const parcelasRestantes = Math.max(0, totalParcelas - parcelasPagas);
  const valorRestante = Math.max(0, parcelasRestantes * valorParcela);
  const valorJaPago = Math.max(0, parcelasPagas * valorParcela);
  const progressoPct = Math.min(100, Math.round((parcelasPagas / totalParcelas) * 100));
  const isQuitada = parcelasPagas >= totalParcelas;

  return {
    id: String(d.id || Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
    nome: (d.nome || 'Pagamento Pendente').trim(),
    categoria: d.categoria || 'Dívidas & Empréstimos',
    totalParcelas,
    parcelasPagas,
    parcelasRestantes,
    valorParcela,
    valorTotal,
    valorRestante,
    valorJaPago,
    progressoPct,
    diaVencimento: Math.min(31, Math.max(1, parseInt(d.diaVencimento, 10) || 10)),
    moeda: d.moeda || 'BRL',
    dataInicio: d.dataInicio || new Date().toISOString().slice(0, 10),
    observacoes: d.observacoes || '',
    status: isQuitada ? 'quitada' : (d.status === 'quitada' ? 'quitada' : 'ativa'),
    historico: Array.isArray(d.historico) ? d.historico : [],
    criadoEm: d.criadoEm || new Date().toISOString(),
    atualizadoEm: d.atualizadoEm || new Date().toISOString()
  };
}

export const debtService = {
  getDebts(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const raw = storage.get(`debts_${cleanEmail}`, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeDebt).filter(Boolean);
  },

  saveDebts(userEmail, list) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const normalized = (list || []).map(normalizeDebt).filter(Boolean);
    storage.set(`debts_${cleanEmail}`, normalized);
    return normalized;
  },

  async addDebt(userEmail, data) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getDebts(cleanEmail);
    const newDebt = normalizeDebt({
      ...data,
      id: String(Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });

    list.unshift(newDebt);
    this.saveDebts(cleanEmail, list);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('debts').insert({
          id: newDebt.id,
          user_email: cleanEmail,
          nome: newDebt.nome,
          categoria: newDebt.categoria,
          valor_total: newDebt.valorTotal,
          valor_parcela: newDebt.valorParcela,
          total_parcelas: newDebt.totalParcelas,
          parcelas_pagas: newDebt.parcelasPagas,
          dia_vencimento: newDebt.diaVencimento,
          status: newDebt.status,
          moeda: newDebt.moeda,
          data_inicio: newDebt.dataInicio,
          observacoes: newDebt.observacoes,
          historico: newDebt.historico
        });
      } catch (e) {
        console.warn('[Debt Cloud] Erro ao inserir dívida no Supabase:', e);
      }
    }

    return newDebt;
  },

  async updateDebt(userEmail, id, updates) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getDebts(cleanEmail);
    const idx = list.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return null;

    const current = list[idx];
    const updated = normalizeDebt({
      ...current,
      ...updates,
      id: current.id,
      criadoEm: current.criadoEm,
      atualizadoEm: new Date().toISOString()
    });

    list[idx] = updated;
    this.saveDebts(cleanEmail, list);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('debts').update({
          nome: updated.nome,
          categoria: updated.categoria,
          valor_total: updated.valorTotal,
          valor_parcela: updated.valorParcela,
          total_parcelas: updated.totalParcelas,
          parcelas_pagas: updated.parcelasPagas,
          dia_vencimento: updated.diaVencimento,
          status: updated.status,
          moeda: updated.moeda,
          data_inicio: updated.dataInicio,
          observacoes: updated.observacoes,
          historico: updated.historico,
          updated_at: new Date().toISOString()
        }).eq('id', String(id)).eq('user_email', cleanEmail);
      } catch (e) {
        console.warn('[Debt Cloud] Erro ao atualizar dívida no Supabase:', e);
      }
    }

    return updated;
  },

  async deleteDebt(userEmail, id) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getDebts(cleanEmail).filter((d) => String(d.id) !== String(id));
    this.saveDebts(cleanEmail, list);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('debts').delete().eq('id', String(id)).eq('user_email', cleanEmail);
      } catch (e) {
        console.warn('[Debt Cloud] Erro ao deletar dívida no Supabase:', e);
      }
    }

    return true;
  },

  /**
   * Discount / Pay an installment of a debt
   * Optionally registers an automatic expense transaction in the month's finance ledger
   */
  async payInstallment(userEmail, id, { registerExpense = true, customDate = null, customValor = null } = {}) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getDebts(cleanEmail);
    const idx = list.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return { success: false, error: 'Dívida não encontrada' };

    const debt = list[idx];
    if (debt.parcelasPagas >= debt.totalParcelas) {
      return { success: false, error: 'Todas as parcelas desta dívida já foram pagas!' };
    }

    const proximaParcela = debt.parcelasPagas + 1;
    const valorPago = customValor !== null && !isNaN(parseFloat(customValor)) ? parseFloat(customValor) : debt.valorParcela;
    const dataPagamento = customDate || todayKey();

    let txId = null;
    if (registerExpense) {
      try {
        const tx = await finance.addTransaction(cleanEmail, {
          tipo: 'gasto',
          subcategoria: debt.categoria || 'Dívidas & Empréstimos',
          desc: `Parcela ${proximaParcela}/${debt.totalParcelas}x - ${debt.nome}`,
          valor: valorPago,
          data: dataPagamento,
          moeda: debt.moeda || 'BRL'
        });
        if (tx && tx.id) {
          txId = tx.id;
        }
      } catch (e) {
        console.warn('[Debt] Erro ao registrar transação automática de parcela:', e);
      }
    }

    const paymentLog = {
      id: String(Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      parcelaNum: proximaParcela,
      valor: valorPago,
      data: dataPagamento,
      txId: txId || null,
      registradoEm: new Date().toISOString()
    };

    const updatedHistorico = [...(debt.historico || []), paymentLog];
    const isQuitada = proximaParcela >= debt.totalParcelas;

    const updated = normalizeDebt({
      ...debt,
      parcelasPagas: proximaParcela,
      status: isQuitada ? 'quitada' : 'ativa',
      historico: updatedHistorico,
      atualizadoEm: new Date().toISOString()
    });

    list[idx] = updated;
    this.saveDebts(cleanEmail, list);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('debts').update({
          parcelas_pagas: updated.parcelasPagas,
          status: updated.status,
          historico: updated.historico,
          updated_at: new Date().toISOString()
        }).eq('id', String(id)).eq('user_email', cleanEmail);
      } catch (e) {
        console.warn('[Debt Cloud] Erro ao sincronizar pagamento no Supabase:', e);
      }
    }

    return {
      success: true,
      debt: updated,
      isQuitada,
      proximaParcela,
      txId
    };
  },

  /**
   * Undo the last paid installment
   * Also deletes the corresponding transaction if one was automatically created
   */
  async undoInstallment(userEmail, id) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const list = this.getDebts(cleanEmail);
    const idx = list.findIndex((d) => String(d.id) === String(id));
    if (idx === -1) return { success: false, error: 'Dívida não encontrada' };

    const debt = list[idx];
    if (debt.parcelasPagas <= 0) {
      return { success: false, error: 'Nenhuma parcela foi paga para desfazer.' };
    }

    const currentHistorico = [...(debt.historico || [])];
    const lastPayment = currentHistorico.pop();

    if (lastPayment && lastPayment.txId) {
      try {
        await finance.deleteTransaction(cleanEmail, lastPayment.txId);
      } catch (e) {
        console.warn('[Debt] Erro ao remover transação associada da parcela desfeita:', e);
      }
    }

    const novaQtdPagas = Math.max(0, debt.parcelasPagas - 1);
    const updated = normalizeDebt({
      ...debt,
      parcelasPagas: novaQtdPagas,
      status: novaQtdPagas >= debt.totalParcelas ? 'quitada' : 'ativa',
      historico: currentHistorico,
      atualizadoEm: new Date().toISOString()
    });

    list[idx] = updated;
    this.saveDebts(cleanEmail, list);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('debts').update({
          parcelas_pagas: updated.parcelasPagas,
          status: updated.status,
          historico: updated.historico,
          updated_at: new Date().toISOString()
        }).eq('id', String(id)).eq('user_email', cleanEmail);
      } catch (e) {
        console.warn('[Debt Cloud] Erro ao sincronizar desfeita de parcela no Supabase:', e);
      }
    }

    return {
      success: true,
      debt: updated
    };
  },

  getSummary(userEmail) {
    const list = this.getDebts(userEmail);
    const ativas = list.filter((d) => d.status !== 'quitada');
    const quitadas = list.filter((d) => d.status === 'quitada');

    const totalRestante = ativas.reduce((acc, d) => acc + d.valorRestante, 0);
    const totalOriginal = list.reduce((acc, d) => acc + d.valorTotal, 0);
    const totalPago = list.reduce((acc, d) => acc + d.valorJaPago, 0);
    const compromissoMensal = ativas.reduce((acc, d) => acc + d.valorParcela, 0);

    return {
      total: list.length,
      ativasCount: ativas.length,
      quitadasCount: quitadas.length,
      totalRestante,
      totalOriginal,
      totalPago,
      compromissoMensal,
      ativas,
      quitadas
    };
  },

  async syncWithCloud(user) {
    if (!isSupabaseConfigured() || !user || !user.email) return;
    const cleanEmail = user.email.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_email', cleanEmail);

      if (error) {
        console.warn('[Debt Cloud Sync] Erro ao ler da nuvem:', error);
        return;
      }

      const localDebts = this.getDebts(cleanEmail);

      if (data && Array.isArray(data)) {
        const cloudDebts = data.map((d) =>
          normalizeDebt({
            id: String(d.id),
            nome: d.nome,
            categoria: d.categoria,
            valorTotal: d.valor_total,
            valorParcela: d.valor_parcela,
            totalParcelas: d.total_parcelas,
            parcelasPagas: d.parcelas_pagas,
            diaVencimento: d.dia_vencimento,
            status: d.status,
            moeda: d.moeda,
            dataInicio: d.data_inicio,
            observacoes: d.observacoes,
            historico: Array.isArray(d.historico) ? d.historico : [],
            criadoEm: d.created_at,
            atualizadoEm: d.updated_at
          })
        );

        const cloudIds = new Set(cloudDebts.map((c) => String(c.id)));
        const localOnly = localDebts.filter((l) => !cloudIds.has(String(l.id)));

        if (localOnly.length > 0) {
          for (const item of localOnly) {
            await supabase.from('debts').insert({
              id: String(item.id),
              user_email: cleanEmail,
              nome: item.nome,
              categoria: item.categoria,
              valor_total: item.valorTotal,
              valor_parcela: item.valorParcela,
              total_parcelas: item.totalParcelas,
              parcelas_pagas: item.parcelasPagas,
              dia_vencimento: item.diaVencimento,
              status: item.status,
              moeda: item.moeda,
              data_inicio: item.dataInicio,
              observacoes: item.observacoes,
              historico: item.historico
            }).catch(() => {});
          }
        }

        const merged = [...cloudDebts, ...localOnly];
        // Deduplicate by ID
        const seen = new Set();
        const final = [];
        for (const item of merged) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            final.push(item);
          }
        }

        this.saveDebts(cleanEmail, final);
      }
    } catch (err) {
      console.warn('[Debt Cloud Sync] Exceção:', err);
    }
  }
};
