import { createPageContent } from '../components/page-content.js';
import { escapeHtml } from '../utils/escape-html.js';
import './app.css';

export function getTitle(params) {
  return `App ${params.id}`;
}

export function renderPage(params) {
  const appId = escapeHtml(params.id ?? 'unknown');

  return createPageContent({
    kicker: 'Dynamic route',
    title: `App ${appId}`,
    description: `This page is rendered from the /app/${appId} route.`,
    body: `
      <div class="app-panel">
        <div class="app-meta">
          <span class="app-chip">Route: /app/${appId}</span>
          <span class="app-chip">Record ID: ${appId}</span>
        </div>
        <div class="app-panel__code">
          The page body can be swapped per app id.
        </div>
      </div>
    `,
    aside: `
      <h2 class="h5 mb-3">Next steps</h2>
      <ul class="list-unstyled mb-0">
        <li class="mb-2">Connect real data</li>
        <li class="mb-2">Add nested views</li>
        <li>Handle loading states</li>
      </ul>
    `,
    actions: `
      <a class="btn btn-primary" data-link href="/dashboard">Back to dashboard</a>
      <a class="btn btn-outline-light" data-link href="/">Home</a>
    `,
  });
}
