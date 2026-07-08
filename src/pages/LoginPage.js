import './login-page.css';
import { openAuthModal } from '../lib/app-store.js';

export function createLoginPage() {
  return `
    <main class="container-xxl py-4 py-lg-5 login-page">
      <section class="login-page__card">
        <p class="text-uppercase small text-warning fw-semibold mb-2">Authentication</p>
        <h1 class="login-page__title h2">Sign in or create an account</h1>
        <p class="login-page__body mb-0">
          Use the modal to authenticate. Registered users can add lamp reports, edit their own reports, and view live updates.
        </p>
        <div class="mt-4">
          <button class="btn btn-warning fw-semibold" type="button" data-open-auth>
            Open auth modal
          </button>
        </div>
      </section>
    </main>
  `;
}

export function afterRenderLoginPage(rootElement) {
  rootElement.querySelector('[data-open-auth]')?.addEventListener('click', () => {
    openAuthModal('login');
  });
}
