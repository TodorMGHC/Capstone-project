import './login-form.css';

export function createLoginForm() {
  return `
    <form class="auth-form" data-login-form>
      <div class="auth-form__field">
        <label for="login-email">Email</label>
        <input id="login-email" name="email" type="email" class="form-control form-control-lg" placeholder="you@example.com" required />
      </div>
      <div class="auth-form__field">
        <label for="login-password">Password</label>
        <input id="login-password" name="password" type="password" class="form-control form-control-lg" placeholder="Your password" required />
      </div>
      <button class="auth-form__link" type="button" data-forgot-password>Forgot password?</button>
      <button class="btn btn-warning btn-lg fw-semibold" type="submit">Sign in</button>
      <p class="auth-form__status" data-auth-status aria-live="polite"></p>
    </form>
  `;
}
