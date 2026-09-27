/**
 * Financial Score Engine (1 to 1000 points)
 * Evaluates spending control, savings habits, consistency, investments, and badges.
 */

import { finance, curMonthKey } from './finance.js';
import { gamification } from './gamification.js';

export const scoreEngine = {
  calculateScore(userEmail) {
    const kpis = finance.calculateMonthKPIs(userEmail, curMonthKey());
    const allTx = finance.getTransactions(userEmail);
    const recs = finance.getRecurring(userEmail);
    const { unlockedCount, totalCount } = gamification.calculateAchievements(userEmail);

    let orcamentoPts = 100; // 0 - 300
    let constanciaPts = 50; // 0 - 250
    let conquistasPts = 50; // 0 - 250
    let investimentosPts = 20; // 0 - 200

    // 1. Orçamento & Saldo (Máx 300)
    if (kpis.receita > 0) {
      const ratio = kpis.saldo / kpis.receita;
      if (ratio >= 0.25) orcamentoPts = 300;
      else if (ratio >= 0.15) orcamentoPts = 260;
      else if (ratio >= 0.05) orcamentoPts = 200;
      else if (ratio >= 0) orcamentoPts = 150;
      else orcamentoPts = 50;
    } else if (allTx.length > 0) {
      orcamentoPts = 120;
    }

    // 2. Constância de Registros (Máx 250)
    const count = allTx.length;
    if (count >= 30) constanciaPts = 250;
    else if (count >= 15) constanciaPts = 200;
    else if (count >= 7) constanciaPts = 150;
    else if (count >= 3) constanciaPts = 100;
    else if (count >= 1) constanciaPts = 70;

    if (recs.length > 0) {
      constanciaPts = Math.min(250, constanciaPts + 30);
    }

    // 3. Conquistas & Metas (Máx 250)
    const achPct = totalCount > 0 ? unlockedCount / totalCount : 0;
    conquistasPts = Math.round(50 + achPct * 200);

    // 4. Investimentos (Máx 200)
    const totalInvest = allTx
      .filter((t) => t.tipo === 'investimento')
      .reduce((s, t) => s + t.valor, 0);

    if (totalInvest >= 2000) investimentosPts = 200;
    else if (totalInvest >= 1000) investimentosPts = 170;
    else if (totalInvest >= 500) investimentosPts = 130;
    else if (totalInvest >= 100) investimentosPts = 90;
    else if (totalInvest > 0) investimentosPts = 50;

    const totalScore = Math.min(1000, Math.max(1, orcamentoPts + constanciaPts + conquistasPts + investimentosPts));

    let tier = {
      nome: 'Crítico',
      cor: '#ef4444',
      icone: '🔴',
      desc: 'Suas finanças precisam de atenção imediata. Comece registrando todas as despesas diárias.'
    };

    if (totalScore >= 850) {
      tier = {
        nome: 'Excelente · Mestre',
        cor: '#10b981',
        icone: '💎',
        desc: 'Você atingiu a maestria financeira! Seus hábitos de poupança e investimentos são de alto nível.'
      };
    } else if (totalScore >= 650) {
      tier = {
        nome: 'Forte & Saudável',
        cor: '#3b5bfd',
        icone: '🟢',
        desc: 'Excelente ritmo! Você tem controle sobre o dinheiro e fecha o mês no positivo com consistência.'
      };
    } else if (totalScore >= 450) {
      tier = {
        nome: 'Em Desenvolvimento',
        cor: '#f59e0b',
        icone: '🟠',
        desc: 'Você está no caminho certo. Focar em reduzir pequenos gastos vai impulsionar seu score rapidamente.'
      };
    }

    const tips = [];
    if (orcamentoPts < 250) {
      tips.push({ text: 'Mantenha pelo menos 15% do seu salário poupado neste mês (+40 pts)', icon: '💰' });
    }
    if (constanciaPts < 200) {
      tips.push({ text: 'Registre ao menos 10 despesas ou receitas no app (+50 pts)', icon: '📝' });
    }
    if (investimentosPts < 130) {
      tips.push({ text: 'Cadastre seu primeiro aporte ou guarde R$ 100 em investimentos (+60 pts)', icon: '🌱' });
    }
    if (unlockedCount < 5) {
      tips.push({ text: 'Desbloqueie mais conquistas na aba de Metas (+30 pts)', icon: '🏆' });
    }
    if (tips.length === 0) {
      tips.push({ text: 'Mantenha seus registros em dia para conservar o Score 1000!', icon: '✨' });
    }

    return {
      score: totalScore,
      tier,
      factors: [
        { label: 'Orçamento & Saldo', points: orcamentoPts, max: 300, icon: '💵' },
        { label: 'Hábito & Constância', points: constanciaPts, max: 250, icon: '📅' },
        { label: 'Conquistas & Badges', points: conquistasPts, max: 250, icon: '🏆' },
        { label: 'Investimentos & Futuro', points: investimentosPts, max: 200, icon: '📈' }
      ],
      tips
    };
  }
};
