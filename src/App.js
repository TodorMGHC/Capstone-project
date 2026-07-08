import { createAuthModal, afterRenderAuthModal } from './components/auth/AuthModal.js';
import { createFooter } from './components/layout/Footer.js';
import { createHeader, afterRenderHeader } from './components/layout/Header.js';
import { createHomePage } from './pages/HomePage.js';
import { createLoginPage, afterRenderLoginPage } from './pages/LoginPage.js';
import { createDashboardPage, afterRenderDashboardPage } from './pages/DashboardPage.js';
import { getAppState, initializeAppState, openAuthModal, selectLamp, setDashboardView, subscribe } from './lib/app-store.js';

let appRoot = null;
let started = false;
let lastSyncedPath = '';

function normalizePath(pathname) {
  return pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
}

function matchRoute(pathname) {
  const normalizedPath = normalizePath(pathname);
  const appMatch = normalizedPath.match(/^\/app\/(?<id>[^/]+)$/);

  if (normalizedPath === '/') {
    return { page: 'home', params: {} };
  }

  if (normalizedPath === '/login') {
    return { page: 'login', params: {} };
  }

  if (normalizedPath === '/dashboard') {
    return { page: 'dashboard', params: {} };
  }

  if (appMatch?.groups?.id) {
    return { page: 'dashboard', params: { selectedLampId: decodeURIComponent(appMatch.groups.id) } };
  }

  return { page: 'home', params: {} };
}

function getPageMarkup(route) {
  switch (route.page) {
    case 'login':
      return createLoginPage(route.params);
    case 'dashboard':
      return createDashboardPage(route.params);
    case 'home':
    default:
      return createHomePage(route.params);
  }
}

function getPageAfterRender(route) {
  switch (route.page) {
    case 'login':
      return afterRenderLoginPage;
    case 'dashboard':
      return afterRenderDashboardPage;
    default:
      return null;
  }
}

function getPageTitle(route) {
  switch (route.page) {
    case 'login':
      return 'Login';
    case 'dashboard':
      return 'Dashboard';
    default:
      return 'Home';
  }
}

function renderApp() {
  if (!appRoot) {
    return;
  }

  const route = matchRoute(location.pathname);
  const appState = getAppState();

  if (lastSyncedPath !== location.pathname && route.page === 'dashboard' && route.params.selectedLampId) {
    if (appState.selectedLampId !== route.params.selectedLampId) {
      setDashboardView('map');
      selectLamp(route.params.selectedLampId);
    }

    lastSyncedPath = location.pathname;
    return;
  }

  lastSyncedPath = location.pathname;

  const pageMarkup = getPageMarkup(route);

  appRoot.innerHTML = `
    <div class="app-shell d-flex flex-column min-vh-100">
      ${createHeader(location.pathname)}
      <div class="flex-grow-1">${pageMarkup}</div>
      ${createFooter()}
      ${createAuthModal()}
    </div>
  `;

  document.title = `${getPageTitle(route)} | Burnt out Lamps Map`;

  const afterRenderPage = getPageAfterRender(route);
  if (afterRenderPage) {
    afterRenderPage(appRoot, route.params);
  }

  afterRenderHeader(appRoot);
  afterRenderAuthModal(appRoot);
}

function handleDocumentClick(event) {
  const link = event.target.closest('a[data-link]');
  if (link) {
    const href = link.getAttribute('href');

    if (!href || href.startsWith('http') || href.startsWith('mailto:')) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') {
      return;
    }

    event.preventDefault();
    history.pushState({}, '', href);
    renderApp();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    return;
  }

  if (actionButton.dataset.action === 'open-auth') {
    openAuthModal('login');
  }
}

export async function startApp(rootElement) {
  if (started) {
    return;
  }

  started = true;
  appRoot = rootElement;

  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('popstate', renderApp);

  subscribe(() => {
    renderApp();
  });

  await initializeAppState();
  renderApp();
}
