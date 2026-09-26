/**
 * Onboarding Component
 */

import { QUESTIONS, gamification } from '../services/gamification.js';
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
              (opt, idx) => `
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
          <div class="progress-bar-steps">
            <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
          </div>
          
          <h2>Vamos te conhecer melhor</h2>
          <p class="sub">Etapa ${step + 1} de ${QUESTIONS.length} · Isso leva 1 minuto e define seu perfil inicial.</p>
          
          <div class="q">
            <label>${q.label}</label>
            ${inputHtml}
          </div>
          
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            ${
              step > 0
                ? `<button id="btn-prev" class="btn btn-secondary" style="flex: 1;">Voltar</button>`
                : ''
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
        const savedProfile = gamification.saveProfile(user.email, answers);
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
