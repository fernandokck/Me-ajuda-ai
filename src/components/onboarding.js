/**
 * Onboarding Component with Exit/Logout and Back controls on all screens
 */

import { QUESTIONS, gamification } from '../services/gamification.js';
import { auth } from '../services/auth.js';
import { showToast } from './toast.js';

export function renderOnboarding(container, user, onCompleted) {
  let step = 0;
  const answers = {
    nome: user.name !== user.email ? user.name : ''
  };

  function renderCurrentStep() {
    const q = QUESTIONS[step];
    const progressPct = Math.round(((step + 1) / QUESTIONS.length) * 100);

    let inputHtml = '';
    if (q.type === 'text') {
      inputHtml = `<input id="q-input" class="input" type="text" value="${answers[q.id] || ''}" placeholder="${q.placeholder || ''}" autofocus>`;
    } else if (q.type === 'number') {
      inputHtml = `<input id="q-input" class="input" type="number" value="${answers[q.id] || ''}" placeholder="${q.placeholder || ''}" autofocus>`;
    } else if (q.type === 'choice') {
      inputHtml = `
        <div class="choice-grid">
          ${q.options
            .map(
              (opt) => `
            <button type="button" class="choice ${answers[q.id] === opt ? 'sel' : ''}" data-value="${opt}">
              ${opt}
            </button>
          `
            )
            .join('')}
        </div>
      `;
    } else if (q.type === 'scale') {
      inputHtml = `
        <div class="scale-row">
          ${Array.from(
            { length: 11 },
            (_, i) => `
            <button type="button" class="${answers[q.id] === i ? 'sel' : ''}" data-value="${i}">
              ${i}
            </button>
          `
          ).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="center-screen">
        <div class="wide-card">
          <!-- Top bar with Exit/Logout button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--brand); text-transform: uppercase; letter-spacing: 0.05em;">
              Diagnóstico Inicial (${step + 1}/${QUESTIONS.length})
            </span>
            <button id="btn-onboarding-logout" class="btn btn-ghost btn-sm" title="Sair da conta" style="font-size: 12px; color: var(--text-muted);">
              🚪 Sair / Deslogar
            </button>
          </div>

          <div class="progress-bar-steps">
            <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
          </div>
          
          <h2>Vamos te conhecer melhor</h2>
          <p class="sub">Leva 1 minuto e calibra seu Score Financeiro e ponto de partida.</p>
          
          <div class="q">
            <label>${q.label}</label>
            ${inputHtml}
          </div>
          
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            ${
              step > 0
                ? `<button id="btn-prev" class="btn btn-secondary" style="flex: 1;">← Voltar</button>`
                : `<button id="btn-cancel-ob" class="btn btn-secondary" style="flex: 1;">Sair</button>`
            }
            <button id="btn-next" class="btn btn-primary" style="flex: 2;">
              ${step === QUESTIONS.length - 1 ? 'Concluir Diagnóstico 🚀' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind choices
    container.querySelectorAll('.choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[q.id] = btn.dataset.value;
        container.querySelectorAll('.choice').forEach((b) => b.classList.remove('sel'));
        btn.classList.add('sel');
      });
    });

    // Bind scale
    container.querySelectorAll('.scale-row button').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[q.id] = Number(btn.dataset.value);
        container.querySelectorAll('.scale-row button').forEach((b) => b.classList.remove('sel'));
        btn.classList.add('sel');
      });
    });

    // Bind input field
    const inputEl = container.querySelector('#q-input');
    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        answers[q.id] = e.target.value;
      });
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          container.querySelector('#btn-next').click();
        }
      });
    }

    // Bind Logout / Exit buttons
    const btnLogout = container.querySelector('#btn-onboarding-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        auth.logout();
      });
    }

    const btnCancel = container.querySelector('#btn-cancel-ob');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        auth.logout();
      });
    }

    // Bind navigation buttons
    const btnNext = container.querySelector('#btn-next');
    btnNext.addEventListener('click', () => {
      if (inputEl) {
        answers[q.id] = inputEl.value.trim();
      }

      if (answers[q.id] === undefined || answers[q.id] === '') {
        showToast('Por favor, responda para continuar.', 'info');
        return;
      }

      if (step < QUESTIONS.length - 1) {
        step++;
        renderCurrentStep();
      } else {
        const savedProfile = gamification.saveProfile(user.email, answers, user.id);
        onCompleted(savedProfile);
      }
    });

    const btnPrev = container.querySelector('#btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (step > 0) {
          step--;
          renderCurrentStep();
        }
      });
    }
  }

  renderCurrentStep();
}
