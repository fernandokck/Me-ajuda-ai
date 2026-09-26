/**
 * Badge Reveal Component
 */

import confetti from 'canvas-confetti';

export function renderBadgeReveal(container, badge, onContinue) {
  container.innerHTML = `
    <div class="center-screen">
      <div class="wide-card badge-reveal">
        <h2>🎉 Seu Diagnóstico Inicial</h2>
        <div class="badge-icon-reveal" style="background: ${badge.cor}22; border: 2px solid ${badge.cor};">
          ${badge.icone}
        </div>
        <div class="bname" style="color: ${badge.cor};">${badge.nome}</div>
        <p>${badge.desc}</p>
        <button id="btn-enter-app" class="btn btn-primary btn-block">
          Acessar Meu Painel Financeiro 🚀
        </button>
      </div>
    </div>
  `;

  // Trigger celebration confetti
  try {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    console.log('Confetti error:', e);
  }

  const btnEnter = container.querySelector('#btn-enter-app');
  btnEnter.addEventListener('click', onContinue);
}
