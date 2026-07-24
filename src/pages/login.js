import { createPageContent } from '../components/page-content.js';
import { escapeHtml } from '../utils/escape-html.js';
import { forgotPassword, getAppState, signIn, signUp } from '../lib/app-store.js';
import { navigateTo } from '../router/router.js';
import './login.css';

export const title = 'Authentication';

function renderSignedInBody(state) {
  const fullName = escapeHtml(state.profile?.full_name || state.session?.user?.user_metadata?.full_name || '');
  const email = escapeHtml(state.session?.user?.email || '');
  const role = state.profile?.role === 'admin' ? 'Admin' : 'User';

  return `
    <div class="auth-signed-in">
      <div class="auth-status-card">
        <span class="auth-status-card__eyebrow">Already signed in</span>
        <h2 class="h3 mb-2">Welcome${fullName ? `, ${fullName}` : ''}</h2>
        <p class="mb-3 text-body-secondary">${email}</p>
        <div class="auth-badges">
          <span class="auth-badge">${role}</span>
          <span class="auth-badge">Report map access</span>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-primary btn-lg" type="button" data-go-dashboard>Open the map</button>
        <button class="btn btn-outline-light btn-lg" type="button" data-action="logout">Logout</button>
      </div>
    </div>
  `;
}

function renderAuthForms() {
  return `
    <div class="auth-grid">
      <section class="auth-panel">
        <h2 class="h4 mb-2">Sign in</h2>
        <p class="auth-panel__note">Use your existing account to manage your own pins.</p>
        <form class="auth-form" data-login-form>
          <div class="auth-field">
            <label for="login-email">Email</label>
            <input id="login-email" name="email" type="email" class="form-control form-control-lg" placeholder="name@example.com" required />
          </div>
          <div class="auth-field">
            <label for="login-password">Password</label>
            <input id="login-password" name="password" type="password" class="form-control form-control-lg" placeholder="Your password" required />
          </div>
          <button class="auth-link" type="button" data-forgot-password>Forgot password?</button>
          <button class="btn btn-primary btn-lg" type="submit">Sign in</button>
          <p class="auth-status" data-login-status aria-live="polite"></p>
        </form>
      </section>

      <section class="auth-panel auth-panel--accent">
        <h2 class="h4 mb-2">Create account</h2>
        <p class="auth-panel__note">Registered users can add reports and edit or delete only their own submissions.</p>
        <form class="auth-form" data-register-form>
          <div class="auth-field">
            <label for="register-name">Full name</label>
            <input id="register-name" name="fullName" type="text" class="form-control form-control-lg" placeholder="Your name" required />
          </div>
          <div class="auth-field">
            <label for="register-email">Email</label>
            <input id="register-email" name="email" type="email" class="form-control form-control-lg" placeholder="name@example.com" required />
          </div>
          <div class="auth-field">
            <label for="register-password">Password</label>
            <input id="register-password" name="password" type="password" class="form-control form-control-lg" placeholder="Create a password" minlength="6" required />
          </div>
          <button class="btn btn-light btn-lg" type="submit">Create account</button>
          <p class="auth-status auth-status--accent" data-register-status aria-live="polite"></p>
        </form>
      </section>
    </div>
  `;
}

export function renderPage() {
  const state = getAppState();

  return createPageContent({
    kicker: 'Authentication',
    title: state.session ? 'You are signed in' : 'Access the map',
    description: state.session
      ? 'Your session is active. Open the map to add or manage reports.'
      : 'Register to add reports, sign in to edit your own pins, and use the dashboard as a visitor to browse all public data.',
    body: state.session ? renderSignedInBody(state) : renderAuthForms(),
    aside: `
      <h2 class="h5 mb-3">Access rules</h2>
      <div class="auth-rules">
        <div class="auth-rule">
          <span class="auth-rule__label">Visitors</span>
          <span class="auth-rule__text">Can view the map and table in read-only mode.</span>
        </div>
        <div class="auth-rule">
          <span class="auth-rule__label">Registered users</span>
          <span class="auth-rule__text">Can add reports and edit or delete only their own submissions.</span>
        </div>
        <div class="auth-rule">
          <span class="auth-rule__label">Admin</span>
          <span class="auth-rule__text">Can manage any user report.</span>
        </div>
      </div>
    `,
    actions: state.session
      ? `
        <button class="btn btn-primary" type="button" data-go-dashboard>Open dashboard</button>
        <button class="btn btn-outline-light" type="button" data-action="logout">Logout</button>
      `
      : `
        <a class="btn btn-primary" data-link href="/dashboard">Open dashboard</a>
        <a class="btn btn-outline-light" data-link href="/">Home</a>
      `,
  });
}

export function afterRender(rootElement) {
  const state = getAppState();

  if (state.session) {
    const dashboardButton = rootElement.querySelector('[data-go-dashboard]');

    dashboardButton?.addEventListener('click', () => {
      navigateTo('/dashboard');
    });

    return;
  }

  const loginForm = rootElement.querySelector('[data-login-form]');
  const registerForm = rootElement.querySelector('[data-register-form]');
  const loginStatus = rootElement.querySelector('[data-login-status]');
  const registerStatus = rootElement.querySelector('[data-register-status]');
  const forgotPasswordButton = rootElement.querySelector('[data-forgot-password]');

  forgotPasswordButton?.addEventListener('click', async () => {
    if (loginStatus) {
      loginStatus.textContent = 'Sending reset email...';
    }

    const emailInput = loginForm?.querySelector('input[name="email"]');
    const result = await forgotPassword(emailInput?.value ?? '');

    if (loginStatus) {
      loginStatus.textContent = result.error || 'Reset email sent. Open the link to continue in the app.';
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginStatus) {
      loginStatus.textContent = 'Signing in...';
    }

    const formData = new FormData(loginForm);
    const result = await signIn(formData.get('email')?.toString() ?? '', formData.get('password')?.toString() ?? '');

    if (result.error) {
      if (loginStatus) {
        loginStatus.textContent = result.error;
      }
      return;
    }

    navigateTo('/dashboard');
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (registerStatus) {
      registerStatus.textContent = 'Creating account...';
    }

    const formData = new FormData(registerForm);
    const result = await signUp({
      fullName: formData.get('fullName')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
    });

    if (result.error) {
      if (registerStatus) {
        registerStatus.textContent = result.error;
      }
      return;
    }

    if (result.session) {
      navigateTo('/dashboard');
      return;
    }

    if (registerStatus) {
      registerStatus.textContent = 'Account created. Check your email if confirmation is enabled.';
    }
  });
}
