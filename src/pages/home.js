import '../components/page-content.js';
import './home.css';
import { createPageContent } from '../components/page-content.js';

export const title = 'Home';

export function renderPage() {
  return createPageContent({
    kicker: 'Homepage',
    title: 'Burnt out Lamps Map',
    description: 'Explore Bulgaria on a live report map, open the dashboard to browse pins, or sign in to add your own report.',
    body: `
      <div class="home-spotlight">
        <p class="mb-0 text-body-secondary">
          Visitors can browse every public pin. Registered users can add and manage their own reports, while admins can manage everything.
        </p>
        <div class="home-badges">
          <span class="home-badge">Map of Bulgaria</span>
          <span class="home-badge">Role-based access</span>
          <span class="home-badge">Supabase Auth</span>
          <span class="home-badge">Supabase RLS</span>
        </div>
      </div>
    `,
    aside: `
      <h2 class="h5 mb-3">Quick links</h2>
      <div class="d-grid gap-2">
        <a class="btn btn-outline-light" data-link href="/dashboard">Go to dashboard</a>
        <a class="btn btn-outline-light" data-link href="/login">Go to login</a>
      </div>
    `,
    actions: `
      <a class="btn btn-primary" data-link href="/dashboard">Open the map</a>
      <a class="btn btn-outline-light" data-link href="/login">Register or sign in</a>
    `,
  });
}
