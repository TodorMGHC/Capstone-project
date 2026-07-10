import { createLoginForm } from './LoginForm.js';
import { createRegisterForm } from './RegisterForm.js';
import './auth-modal.css';
import { closeAuthModal, getAppState, login, register, setAuthMode } from '../../lib/app-store.js';

let lastRenderedMode = null;
let lastRenderedOpen = false;

function renderAuthBody(state) {
  return state.authMode === 'register' ? createRegisterForm() : createLoginForm();
}

export function createAuthModal() {
  const state = getAppState();

  if (!state.authModalOpen) {
    return '';
  }

  return `
    <div class="auth-modal-overlay" data-auth-modal>
      <div class="auth-modal">
        <div class="auth-modal__header">
          <div>
            <p class="auth-modal__eyebrow">Burnt out Lamps Map</p>
            <h2 class="auth-modal__title">${state.authMode === 'register' ? 'Create an account' : 'Welcome back'}</h2>
          </div>
          <button type="button" class="auth-modal__close" data-auth-close aria-label="Close">&times;</button>
        </div>
        <div class="auth-modal__body">
          <div class="auth-modal__tabs">
            <button class="auth-modal__tab ${state.authMode === 'login' ? 'is-active' : ''}" type="button" data-auth-mode="login">Sign in</button>
            <button class="auth-modal__tab ${state.authMode === 'register' ? 'is-active' : ''}" type="button" data-auth-mode="register">Register</button>
          </div>
          <p class="auth-modal__message" data-auth-message>${state.authMessage || ''}</p>
          ${renderAuthBody(state)}
        </div>
      </div>
    </div>
  `;
}

export function afterRenderAuthModal(rootElement) {
  const modalElement = rootElement.querySelector('[data-auth-modal]');

  if (!modalElement) {
    lastRenderedOpen = false;
    return;
  }

  const state = getAppState();
  const justOpened = !lastRenderedOpen;

  lastRenderedMode = state.authMode;
  lastRenderedOpen = true;

  if (justOpened) {
    modalElement.classList.add('auth-modal-overlay--enter');
    requestAnimationFrame(() => {
      modalElement.classList.add('auth-modal-overlay--visible');
    });
  }

  modalElement.addEventListener('click', (event) => {
    if (event.target === modalElement) {
      closeAuthModal();
    }
  });

  modalElement.querySelector('[data-auth-close]')?.addEventListener('click', () => {
    closeAuthModal();
  });

  modalElement.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      setAuthMode(button.dataset.authMode);
    });
  });

  const loginForm = modalElement.querySelector('[data-login-form]');
  const registerForm = modalElement.querySelector('[data-register-form]');
  const authMessage = modalElement.querySelector('[data-auth-message]');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const result = await login(formData.get('email')?.toString() || '', formData.get('password')?.toString() || '');

      if (authMessage) {
        authMessage.textContent = result.error || '';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const result = await register({
        username: formData.get('username')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        password: formData.get('password')?.toString() || '',
      });

      if (authMessage) {
        authMessage.textContent = result.error || getAppState().authMessage || '';
      }
    });
  }
}

export function resetAuthModalTracking() {
  lastRenderedMode = null;
  lastRenderedOpen = false;
}
