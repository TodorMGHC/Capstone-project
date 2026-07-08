import { createPageContent } from '../components/page-content.js';
import { escapeHtml } from '../utils/escape-html.js';
import './app.css';

export function getTitle(params) {
  return `Report ${params.id}`;
}

export function renderPage(params) {
  const appId = escapeHtml(params.id ?? 'unknown');

  return createPageContent({
    kicker: 'Dynamic route',
    title: `Report ${appId}`,
    description: 'The live report experience now lives on the dashboard. Use this route as a light handoff back to the map.',
    body: `
      <div class="app-panel">
        <div class="app-meta">
          <span class="app-chip">Route: /app/${appId}</span>
          <span class="app-chip">Record ID: ${appId}</span>
        </div>
        <div class="app-panel__code">
          Open the Bulgaria reports dashboard to view the map, table, and editing controls.
        </div>
      </div>
    `,
    aside: `
      <h2 class="h5 mb-3">Next step</h2>
      <ul class="list-unstyled mb-0">
        <li class="mb-2">Open the dashboard</li>
        <li class="mb-2">Sign in to add reports</li>
        <li>Click a pin to inspect it on the map</li>
      </ul>
    `,
    actions: `
      <a class="btn btn-primary" data-link href="/dashboard">Open dashboard</a>
      <a class="btn btn-outline-light" data-link href="/">Home</a>
    `,
  });
}
