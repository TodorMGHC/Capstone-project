import '../components/page-content.js';
import './home.css';
import { createPageContent } from '../components/page-content.js';

export const title = 'Home';

export function renderPage() {
  return createPageContent({
    kicker: 'Homepage',
    title: 'Hello, world!',
    description: 'This empty homepage is wired into the router and ready for your next feature.',
    body: `
      <div class="home-spotlight">
        <p class="mb-0 text-body-secondary">
          The scaffold already supports nested components, page fragments, and navigation.
        </p>
        <div class="home-badges">
          <span class="home-badge">Vite</span>
          <span class="home-badge">Bootstrap 5</span>
          <span class="home-badge">JavaScript modules</span>
          <span class="home-badge">History API routing</span>
        </div>
      </div>
    `,
    aside: `
      <h2 class="h5 mb-3">Quick links</h2>
      <div class="d-grid gap-2">
        <a class="btn btn-outline-light" data-link href="/login">Go to login</a>
        <a class="btn btn-outline-light" data-link href="/dashboard">Go to dashboard</a>
        <a class="btn btn-outline-light" data-link href="/app/42">Open App 42</a>
      </div>
    `,
    actions: `
      <a class="btn btn-primary" data-link href="/dashboard">Enter dashboard</a>
      <a class="btn btn-outline-light" data-link href="/login">Sign in</a>
    `,
  });
}
