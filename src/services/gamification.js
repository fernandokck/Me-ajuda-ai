/**
 * Gamification Service
 * Handles badge assessment, onboarding profiles, and 14 financial achievements
 * with Supabase profile sync.
 */

import { storage } from './storage.js';
import { finance, curMonthKey, monthKey, fmtBRL } from './finance.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

export const QUESTIONS = [
  {
    id: 'nome',
    label: 'Como podemos te chamar?',
    type: 'text',
    placeholder: 'Digite seu nome ou apelido'
  },
  {
    id: 'faixa',
    label: 'Qual a sua faixa etária hoje?',
    type: 'choice',
    options: ['18-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55+ anos']
  },
  {
    id: 'sobra',
    label: 'De 0 a 10, quanto costuma sobrar de dinheiro no fim do mês?',
    type: 'scale'
  },
  {
    id: 'dificuldade',
    label: 'Qual é o seu maior desafio financeiro hoje?',
    type: 'choice',
    options: [
      'Não sei para onde vai meu dinheiro',
      'Gasto mais do que ganho',
      'Não consigo poupar com constância',
      'Tenho dívidas para quitar',
      'Não sei por onde começar a investir',
      'Já me organizo bem e quero rentabilizar melhor'
    ]
  },
  {
    id: 'meta',
    label: 'Qual é a sua meta de economia para este ano? (R$)',
    type: 'number',
    placeholder: 'Ex: 5000'
  },
  {
    id: 'sabeParaOnde',
    label: 'Você tem clareza hoje de para onde vai cada centavo?',
    type: 'choice',
    options: ['Sim, tenho controle claro', 'Mais ou menos', 'Não, é uma surpresa todo mês']
  },
  {
    id: 'sabeInvestir',
    label: 'Você já investe ou conhece investimentos?',
    type: 'choice',
    options: ['Sim, já invisto regularmente', 'Sei o básico sobre renda fixa', 'Não sei nada ainda']
  }
];

export function computeBadge(profile) {
  let score = Number(profile.sobra) || 0;
  if (profile.sabeParaOnde && profile.sabeParaOnde.startsWith('Sim')) score += 2;
  else if (profile.sabeParaOnde && profile.sabeParaOnde.startsWith('Mais')) score += 1;

  if (profile.sabeInvestir && profile.sabeInvestir.startsWith('Sim')) score += 2;
  else if (profile.sabeInvestir && profile.sabeInvestir.startsWith('Sei o básico')) score += 1;

  if (score >= 12) {
    return {
      nome: 'Investidor',
      icone: '📈',
      cor: '#10b981',
      desc: 'Você já entende de investimentos e possui ótimos hábitos. Seu foco agora é otimizar carteira e potencializar seu patrimônio.'
    };
  }
  if (score >= 9) {
    return {
      nome: 'No Controle',
      icone: '🧭',
      cor: '#ea7a40',
      desc: 'Você tem controle claro do seu dinheiro e fecha os meses no positivo. Está pronto para dar os próximos passos rumo aos investimentos.'
    };
  }
  if (score >= 5) {
    return {
      nome: 'Aspirante a Investidor',
      icone: '🌤️',
      cor: '#f59e0b',
      desc: 'Você tem boa noção das contas, mas precisa de consistência na organização para começar a criar sua reserva.'
    };
  }
  return {
    nome: 'Iniciante',
    icone: '🌱',
    cor: '#8b5cf6',
    desc: 'Você está no início da sua jornada financeira. O Me ajuda aí vai te guiar passo a passo para transformar suas finanças.'
  };
}

export function computeLevelInfo(unlockedCount, total) {
  const pct = unlockedCount / total;
  if (pct >= 0.85) {
    return {
      nome: 'Platina',
      icone: '💎',
      desc: 'Você domina completamente suas finanças. Continue mantendo a constância e inspirando outros!'
    };
  }
  if (pct >= 0.55) {
    return {
      nome: 'Ouro',
      icone: '🥇',
      desc: 'Progresso extraordinário! Faltam poucas conquistas para o nível máximo.'
    };
  }
  if (pct >= 0.25) {
    return {
      nome: 'Prata',
      icone: '🥈',
      desc: 'Você está no caminho certo. Continue registrando e desbloqueando novas metas.'
    };
  }
  return {
    nome: 'Bronze',
    icone: '🥉',
    desc: 'Você está começando sua jornada no Me ajuda aí. Cada registro te aproxima do próximo nível!'
  };
}

export const gamification = {
  getProfile(userEmail) {
    return storage.get(`perfil_${userEmail}`, null);
  },

  async syncProfileFromCloud(user) {
    if (!isSupabaseConfigured || !supabase || !user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const profile = {
          nome: data.nome,
          faixa: data.faixa,
          sobra: data.sobra,
          dificuldade: data.dificuldade,
          meta: data.meta,
          sabeParaOnde: data.sabe_para_onde,
          sabeInvestir: data.sabe_investir,
          badge: data.badge,
          dataCadastro: data.updated_at ? data.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
        };
        storage.set(`perfil_${user.email}`, profile);
        return profile;
      }
    } catch (e) {
      console.warn('Profile sync error:', e);
    }
    return null;
  },

  saveProfile(userEmail, answers, userId = null) {
    const profile = {
      nome: answers.nome || userEmail.split('@')[0],
      faixa: answers.faixa || '',
      sobra: Number(answers.sobra) || 0,
      dificuldade: answers.dificuldade || '',
      meta: Number(answers.meta) || 0,
      sabeParaOnde: answers.sabeParaOnde || '',
      sabeInvestir: answers.sabeInvestir || '',
      dataCadastro: new Date().toISOString().slice(0, 10)
    };
    profile.badge = computeBadge(profile);
    storage.set(`perfil_${userEmail}`, profile);

    // Sync profile to Supabase
    if (isSupabaseConfigured && supabase && userId) {
      supabase.from('profiles').upsert({
        id: userId,
        nome: profile.nome,
        faixa: profile.faixa,
        sobra: profile.sobra,
        dificuldade: profile.dificuldade,
        meta: profile.meta,
        sabe_para_onde: profile.sabeParaOnde,
        sabe_investir: profile.sabeInvestir,
        badge: profile.badge,
        updated_at: new Date().toISOString()
      }).then(() => {}).catch(() => {});
    }

    return profile;
  },

  calculateAchievements(userEmail) {
    const perfil = this.getProfile(userEmail);
    const transacoes = finance.getTransactions(userEmail);
    const recorrentes = finance.getRecurring(userEmail);
    const cur = curMonthKey();
    const now = new Date();

    const curTx = transacoes.filter((t) => monthKey(t.data) === cur);
    const despesaMes = curTx
      .filter((t) => t.tipo === 'contafixa' || t.tipo === 'gasto')
      .reduce((s, t) => s + t.valor, 0);

    const totalInvest = transacoes
      .filter((t) => t.tipo === 'investimento')
      .reduce((s, t) => s + t.valor, 0);

    const lanches = curTx
      .filter((t) => t.subcategoria === 'Lanches/Besteiras')
      .reduce((s, t) => s + t.valor, 0);

    const dias30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const tx30 = transacoes.filter((t) => t.data >= dias30);
    const saldo30 =
      tx30.filter((t) => t.tipo === 'salario').reduce((s, t) => s + t.valor, 0) -
      tx30.filter((t) => t.tipo === 'contafixa' || t.tipo === 'gasto' || t.tipo === 'investimento')
        .reduce((s, t) => s + t.valor, 0);

    const meses = {};
    transacoes.forEach((t) => {
      const k = monthKey(t.data);
      if (!meses[k]) meses[k] = { r: 0, d: 0, i: 0 };
      if (t.tipo === 'salario') meses[k].r += t.valor;
      else if (t.tipo === 'contafixa' || t.tipo === 'gasto') meses[k].d += t.valor;
      else meses[k].i += t.valor;
    });

    const keysOrdenadas = Object.keys(meses).sort();
    const prevKey = keysOrdenadas[keysOrdenadas.length - 2];
    const reduziuGastos =
      prevKey && meses[prevKey] ? (despesaMes < meses[prevKey].d && despesaMes > 0 ? 1 : 0) : 0;

    let seguidos = 0;
    for (let i = keysOrdenadas.length - 1; i >= 0; i--) {
      const mm = meses[keysOrdenadas[i]];
      if (mm.r - mm.d - mm.i > 0) {
        seguidos++;
      } else break;
    }

    const investiu5pct = keysOrdenadas.some(
      (k) => meses[k].r > 0 && meses[k].i / meses[k].r >= 0.05
    );

    const diasCadastro = perfil
      ? Math.floor((now.getTime() - new Date(perfil.dataCadastro).getTime()) / 86400000)
      : 0;

    const list = [
      {
        id: 'perfil',
        icone: '🧾',
        titulo: 'Perfil completo',
        desc: 'Preencheu seu diagnóstico financeiro inicial.',
        current: perfil ? 1 : 0,
        target: 1
      },
      {
        id: 'fixos',
        icone: '🏠',
        titulo: 'Gastos fixos cadastrados',
        desc: 'Registrou pelo menos uma conta fixa.',
        current: transacoes.some((t) => t.tipo === 'contafixa') ? 1 : 0,
        target: 1
      },
      {
        id: 'variaveis',
        icone: '🛒',
        titulo: 'Gastos variáveis cadastrados',
        desc: 'Registrou pelo menos um gasto variável.',
        current: transacoes.some((t) => t.tipo === 'gasto') ? 1 : 0,
        target: 1
      },
      {
        id: 'recorrente',
        icone: '🔁',
        titulo: 'Primeira conta recorrente',
        desc: 'Cadastrou uma conta que se repete automaticamente todo mês.',
        current: recorrentes.length > 0 ? 1 : 0,
        target: 1
      },
      {
        id: 'poupar50',
        icone: '💵',
        titulo: 'Poupar R$ 50 em 30 dias',
        desc: 'Manteve saldo positivo de pelo menos R$ 50 nos últimos 30 dias.',
        current: Math.max(0, Math.min(saldo30, 50)),
        target: 50,
        money: true
      },
      {
        id: 'lanches',
        icone: '🍔',
        titulo: 'Controle de Lanches / Besteiras',
        desc: 'Manteve gastos com lanches e besteiras abaixo de R$ 200 no mês.',
        current: Math.min(lanches, 200),
        target: 200,
        money: true,
        unlockedOverride: lanches <= 200 && curTx.length > 0
      },
      {
        id: 'reduzir',
        icone: '📉',
        titulo: 'Reduzir gastos do mês',
        desc: 'Gastou menos no mês atual em comparação com o anterior.',
        current: reduziuGastos,
        target: 1
      },
      {
        id: 'primeiroInvest',
        icone: '🌱',
        titulo: 'Primeiro investimento',
        desc: 'Fez o seu primeiro aporte para o futuro.',
        current: totalInvest > 0 ? 1 : 0,
        target: 1
      },
      {
        id: 'invest500',
        icone: '💰',
        titulo: 'R$ 500 acumulados em investimentos',
        desc: 'Total investido acumulado.',
        current: Math.min(totalInvest, 500),
        target: 500,
        money: true
      },
      {
        id: 'invest1000',
        icone: '🏆',
        titulo: 'R$ 1.000 acumulados em investimentos',
        desc: 'Meta de 4 dígitos em investimentos.',
        current: Math.min(totalInvest, 1000),
        target: 1000,
        money: true
      },
      {
        id: 'invest5pct',
        icone: '📊',
        titulo: 'Investiu 5% da renda',
        desc: 'Destinou pelo menos 5% da renda mensal para investimentos.',
        current: investiu5pct ? 1 : 0,
        target: 1
      },
      {
        id: 'saldo3m',
        icone: '🔥',
        titulo: '3 meses seguidos no azul',
        desc: 'Saldo positivo por 3 meses consecutivos.',
        current: Math.min(seguidos, 3),
        target: 3
      },
      {
        id: 'dez',
        icone: '📒',
        titulo: '10 lançamentos registrados',
        desc: 'Constância e hábito diário no registro financeiro.',
        current: Math.min(transacoes.length, 10),
        target: 10
      },
      {
        id: 'consistencia',
        icone: '📅',
        titulo: 'Consistência por 60 dias',
        desc: '60 dias de jornada contínua no Me ajuda aí.',
        current: Math.min(diasCadastro, 60),
        target: 60
      }
    ];

    list.forEach((a) => {
      a.unlocked =
        a.unlockedOverride !== undefined ? a.unlockedOverride : a.current >= a.target;
    });

    const unlockedCount = list.filter((a) => a.unlocked).length;
    const level = computeLevelInfo(unlockedCount, list.length);

    return {
      achievements: list,
      unlockedCount,
      totalCount: list.length,
      level
    };
  }
};
