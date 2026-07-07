import { createPageContent } from '../components/page-content.js';
import './dashboard.css';

export const title = 'Dashboard';

const stats = [
  { value: '128', label: 'Open tasks' },
  { value: '24', label: 'Active users' },
  { value: '99.8%', label: 'Uptime' },
];

const recentActivity = [
  { label: 'Build deployed', time: '2m ago' },
  { label: 'New login event', time: '12m ago' },
  { label: 'Feature flag updated', time: '1h ago' },
];

export function renderPage() {
  return createPageContent({
    kicker: 'Overview',
    title: 'Dashboard',
    description: 'A dashboard shell with placeholder data and dedicated layout.',
    body: `
      <div class="dashboard-grid">
        ${stats
          .map(
            (stat) => `
              <article class="dashboard-card">
                <span class="dashboard-card__value">${stat.value}</span>
                <span class="dashboard-card__label">${stat.label}</span>
              </article>
            `,
          )
          .join('')}
      </div>
    `,
    aside: `
      <h2 class="h5 mb-3">Recent activity</h2>
      <div class="dashboard-feed">
        ${recentActivity
          .map(
            (activity) => `
              <div class="dashboard-feed__item">
                <span>${activity.label}</span>
                <span class="dashboard-feed__time">${activity.time}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    `,
    actions: `
      <a class="btn btn-primary" data-link href="/app/42">Open App 42</a>
      <a class="btn btn-outline-light" data-link href="/login">Go to login</a>
    `,
  });
}
