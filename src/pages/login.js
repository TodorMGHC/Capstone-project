import { createPageContent } from '../components/page-content.js';
import './login.css';

export const title = 'Login';

export function renderPage() {
  return createPageContent({
    kicker: 'Authentication',
    title: 'Sign in',
    description: 'This is a route-ready login page scaffold with a real form hook.',
    body: `
      <form class="login-form" data-login-form>
        <div class="login-field">
          <label for="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            class="form-control form-control-lg"
            placeholder="name@example.com"
            required
          />
        </div>
        <div class="login-field">
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            class="form-control form-control-lg"
            placeholder="Enter your password"
            required
          />
        </div>
        <button class="btn btn-primary btn-lg" type="submit">Sign in</button>
        <p class="login-status" data-login-status aria-live="polite"></p>
      </form>
    `,
    aside: `
      <h2 class="h5 mb-3">What happens here?</h2>
      <p class="login-note mb-0">
        The form is intercepted in JavaScript so you can plug in a real auth flow later.
      </p>
    `,
    actions: `
      <a class="btn btn-outline-light" data-link href="/">Back home</a>
      <a class="btn btn-outline-light" data-link href="/dashboard">Dashboard</a>
    `,
  });
}

export function afterRender(rootElement) {
  const form = rootElement.querySelector('[data-login-form]');
  const status = rootElement.querySelector('[data-login-status]');

  if (!form || !status) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email')?.toString() || '';
    status.textContent = email ? `Signed in as ${email}.` : 'Sign-in submitted.';
  });
}
