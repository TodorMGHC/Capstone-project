import './home-page.css';

export function createHomePage() {
  return `
    <main class="container-xxl py-4 py-lg-5 home-page">
      <section class="home-page__card">
        <span class="home-page__eyebrow">Bulgaria street lighting</span>
        <h1 class="home-page__title">Hello, world!</h1>
        <p class="home-page__body">
          Report burnt out lamps, inspect the public map, and switch between map and table views without losing your selected lamp.
        </p>
        <div class="home-page__actions">
          <a class="btn btn-warning fw-semibold" href="/dashboard" data-link>Open the dashboard</a>
          <a class="btn btn-outline-secondary" href="/login" data-link>Sign in</a>
        </div>
      </section>
    </main>
  `;
}
