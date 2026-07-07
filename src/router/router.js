import { createFooter } from '../components/footer.js';
import { createHeader } from '../components/header.js';
import { matchRoute } from './routes.js';

const fallbackRoute = {
  load: () => import('../pages/home.js'),
  params: {},
};

let appRoot = null;
let routerStarted = false;

function navigate(pathname) {
  if (location.pathname !== pathname) {
    history.pushState({}, '', pathname);
  }

  void renderCurrentRoute();
}

function handleDocumentClick(event) {
  const link = event.target.closest('a[data-link]');

  if (!link) {
    return;
  }

  const href = link.getAttribute('href');

  if (!href || href.startsWith('http') || href.startsWith('mailto:')) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') {
    return;
  }

  event.preventDefault();
  navigate(href);
}

async function renderCurrentRoute() {
  if (!appRoot) {
    return;
  }

  const matchedRoute = matchRoute(location.pathname) ?? fallbackRoute;
  const pageModule = await matchedRoute.load();
  const params = matchedRoute.params ?? {};
  const pageTitle = typeof pageModule.getTitle === 'function' ? pageModule.getTitle(params) : pageModule.title;
  const pageMarkup = pageModule.renderPage(params);

  appRoot.innerHTML = `
    <div class="router-shell">
      ${createHeader(location.pathname)}
      ${pageMarkup}
      ${createFooter()}
    </div>
  `;

  document.title = pageTitle ? `${pageTitle} | Capstone Project` : 'Capstone Project';

  if (typeof pageModule.afterRender === 'function') {
    pageModule.afterRender(appRoot, params);
  }
}

export function startRouter(rootElement) {
  if (routerStarted) {
    return;
  }

  routerStarted = true;
  appRoot = rootElement;

  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('popstate', () => {
    void renderCurrentRoute();
  });

  void renderCurrentRoute();
}
