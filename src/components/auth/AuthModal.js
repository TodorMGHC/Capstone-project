import { createLoginForm } from './LoginForm.js';
import { createRegisterForm } from './RegisterForm.js';
import './auth-modal.css';
import { closeAuthModal, getAppState, login, register, setAuthMode } from '../../lib/app-store.js';

let activeAuthModal = null;

function renderAuthBody(state) {
  return state.authMode === 'register' ? createRegisterForm() : createLoginForm();
}

export function createAuthModal() {
  const state = getAppState();

  if (!state.authModalOpen && !state.authMessage) {
    return '';
  }

  return `
    <div class="modal fade auth-modal" data-auth-modal tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header px-4 pt-4 pb-3">
            <div>
              <p class="text-uppercase small mb-1 text-warning fw-semibold">Burnt out Lamps Map</p>
              <h2 class="h4 mb-0">${state.authMode === 'register' ? 'Create an account' : 'Welcome back'}</h2>
            </div>
            <button type="button" class="btn-close btn-close-white" data-auth-close aria-label="Close"></button>
          </div>
          <div class="modal-body px-4 pb-4">
            <div class="auth-modal__tabs mb-2">
              <button class="auth-modal__tab ${state.authMode === 'login' ? 'is-active' : ''}" type="button" data-auth-mode="login">Sign in</button>
              <button class="auth-modal__tab ${state.authMode === 'register' ? 'is-active' : ''}" type="button" data-auth-mode="register">Register</button>
            </div>
            <p class="auth-modal__message" data-auth-message>${state.authMessage || ''}</p>
            <div class="auth-modal__body">
              ${renderAuthBody(state)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRenderAuthModal(rootElement) {
  const modalElement = rootElement.querySelector('[data-auth-modal]');

  if (!modalElement) {
    return;
  }

  if (activeAuthModal) {
    activeAuthModal.hide();
    activeAuthModal.dispose();
  }

  const bootstrapModal = window.bootstrap?.Modal;
  if (bootstrapModal) {
    activeAuthModal = bootstrapModal.getOrCreateInstance(modalElement, {
      backdrop: true,
      focus: true,
      keyboard: true,
    });

    modalElement.addEventListener('hidden.bs.modal', () => {
      closeAuthModal();
    });

    if (getAppState().authModalOpen) {
      activeAuthModal.show();
    }
  }

  modalElement.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      setAuthMode(button.dataset.authMode);
    });
  });

  modalElement.querySelector('[data-auth-close]')?.addEventListener('click', () => {
    closeAuthModal();
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
