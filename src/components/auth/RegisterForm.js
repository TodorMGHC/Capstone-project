import './register-form.css';

export function createRegisterForm() {
  return `
    <form class="auth-register-form auth-form" data-register-form>
      <div class="auth-form__field">
        <label for="register-username">Username</label>
        <input id="register-username" name="username" type="text" class="form-control form-control-lg" placeholder="lamp-spotter" required />
      </div>
      <div class="auth-form__field">
        <label for="register-email">Email</label>
        <input id="register-email" name="email" type="email" class="form-control form-control-lg" placeholder="you@example.com" required />
      </div>
      <div class="auth-form__field">
        <label for="register-password">Password</label>
        <input id="register-password" name="password" type="password" class="form-control form-control-lg" placeholder="Create a password" minlength="6" required />
      </div>
      <button class="btn btn-warning btn-lg fw-semibold" type="submit">Create account</button>
      <p class="auth-form__status" data-auth-status aria-live="polite"></p>
    </form>
  `;
}
