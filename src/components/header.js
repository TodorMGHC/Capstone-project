import './header.css';
import { getAppState } from '../lib/app-store.js';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Map', href: '/dashboard' },
];

function isActiveLink(currentPath, href) {
  if (href === '/') {
    return currentPath === '/';
  }

  if (href.startsWith('/app')) {
    return currentPath.startsWith('/app/');
  }

  return currentPath === href;
}

export function createHeader(currentPath) {
  const state = getAppState();

  const navItemsMarkup = NAV_ITEMS.concat(
    state.session ? [] : [{ label: 'Sign in', href: '/login' }],
  ).map((item) => {
    const active = isActiveLink(currentPath, item.href);

    return `
      <a
        class="nav-link site-nav-link ${active ? 'active' : ''}"
        data-link
        href="${item.href}"
        ${active ? 'aria-current="page"' : ''}
      >
        ${item.label}
      </a>
    `;
  }).join('');

  const roleLabel = state.profile?.role === 'admin' ? 'Admin' : state.session ? 'User' : 'Visitor';
  const authMarkup = state.session
    ? `
      <span class="site-auth-pill">${roleLabel}</span>
      <button class="btn btn-sm btn-light site-auth-button" type="button" data-action="logout">
        Logout
      </button>
    `
    : '';

  return `
    <header class="site-header">
      <nav class="navbar navbar-expand-lg navbar-dark site-navbar">
        <div class="container-xl">
          <a class="navbar-brand site-brand" data-link href="/">
            <span class="site-brand-mark">CP</span>
            Capstone Project
          </a>
          <button
            class="navbar-toggler border-0 shadow-none"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#siteNavigation"
            aria-controls="siteNavigation"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="siteNavigation">
            <div class="ms-auto d-flex flex-column flex-lg-row align-items-lg-center gap-2 mt-3 mt-lg-0">
              ${navItemsMarkup}
              ${authMarkup}
            </div>
          </div>
        </div>
      </nav>
    </header>
  `;
}
