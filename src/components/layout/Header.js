import './header.css';
import { LampIcon, LogInIcon, LogOutIcon, MapPinIcon } from '../icons.js';
import { getAppState, logout, setDashboardView } from '../../lib/app-store.js';

function navLink(label, view, activeView) {
  return `
    <button class="site-nav__link ${activeView === view ? 'is-active' : ''}" type="button" data-view="${view}">
      ${view === 'map' ? MapPinIcon() : label === 'Table' ? '<span aria-hidden="true">▦</span>' : ''}
      <span>${label}</span>
    </button>
  `;
}

export function createHeader(currentPath) {
  const state = getAppState();
  const isDashboardRoute = currentPath === '/dashboard' || currentPath.startsWith('/app/');
  const activeView = state.dashboardView;

  return `
    <header class="site-header">
      <div class="container-xxl site-header__inner d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
        <a class="site-brand" href="/" data-link>
          <span class="site-brand__mark">${LampIcon()}</span>
          <span>Burnt out Lamps Map</span>
        </a>
        <div class="d-flex flex-column flex-md-row align-items-md-center gap-3">
          ${isDashboardRoute ? `<nav class="site-nav" aria-label="Primary">${navLink('Map', 'map', activeView)}${navLink('Table', 'table', activeView)}</nav>` : ''}
          <div class="site-auth">
            ${state.session
              ? `
                <span class="site-auth__name">${state.profile?.username || state.session.user.email}</span>
                <span class="site-auth__role">${state.profile?.role || 'user'}</span>
                ${state.profile?.role === 'admin' ? '<a class="btn btn-dark btn-sm fw-semibold" href="/admin.html">Admin</a>' : ''}
                <button class="btn btn-outline-warning btn-sm" type="button" data-action="logout">
                  <span class="me-1">${LogOutIcon()}</span>
                  Logout
                </button>
              `
              : `
                <button class="btn btn-warning btn-sm fw-semibold" type="button" data-action="open-auth">
                  <span class="me-1">${LogInIcon()}</span>
                  Sign in
                </button>
              `}
          </div>
        </div>
      </div>
    </header>
  `;
}

export function afterRenderHeader(rootElement) {
  rootElement.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardView(button.dataset.view);
    });
  });

  rootElement.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    void logout();
  });
}
