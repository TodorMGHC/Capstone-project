import './app-layout.css';
import { getLampState, setDashboardView } from '../../contexts/LampContext.js';
import { getAuthState } from '../../contexts/AuthContext.js';
import { createBulgariaMap } from '../map/BulgariaMap.js';
import { createLampsTable } from '../table/LampsTable.js';
import { createLampForm } from '../lamps/LampForm.js';
import { openAuthModal, openCreateLampForm } from '../../lib/app-store.js';

function formatSummaryNumber(value) {
  return new Intl.NumberFormat('en-GB').format(value);
}

function selectedLampLabel(selectedLamp) {
  if (!selectedLamp) {
    return 'No lamp selected';
  }

  return selectedLamp.title;
}

export function createAppLayout() {
  const lampState = getLampState();
  const authState = getAuthState();
  const selectedLamp = lampState.selectedLamp;

  const mapPane = createBulgariaMap();
  const tablePane = createLampsTable();

  return `
    <main class="container-xxl py-4 py-lg-5 app-layout">
      <section class="app-layout__hero">
        <div>
          <p class="app-layout__kicker">Burnt out Lamps Map</p>
          <h1 class="app-layout__title">Track non-functioning street lamps across Bulgaria.</h1>
          <p class="app-layout__description">
            Browse the country map, inspect the lamps table, and let authenticated users add or manage reports.
          </p>
        </div>

        <div class="app-layout__tabs" role="tablist" aria-label="Map and table views">
          <button class="app-layout__tab ${lampState.dashboardView === 'map' ? 'is-active' : ''}" type="button" data-view="map">Map</button>
          <button class="app-layout__tab ${lampState.dashboardView === 'table' ? 'is-active' : ''}" type="button" data-view="table">Table</button>
          <button class="app-layout__tab app-layout__tab--action" type="button" data-open-lamp-form>
            Add report
          </button>
        </div>

        <div class="app-layout__stats">
          <div class="app-layout__stat">
            <span class="app-layout__stat-value">${formatSummaryNumber(lampState.lamps.length)}</span>
            <span class="app-layout__stat-label">Lamp reports</span>
          </div>
          <div class="app-layout__stat">
            <span class="app-layout__stat-value">${selectedLampLabel(selectedLamp)}</span>
            <span class="app-layout__stat-label">Selected lamp</span>
          </div>
          <div class="app-layout__stat">
            <span class="app-layout__stat-value">${authState.currentUser ? 'Signed in' : 'Visitor'}</span>
            <span class="app-layout__stat-label">Access level</span>
          </div>
          <div class="app-layout__stat">
            <span class="app-layout__stat-value">${lampState.loading ? 'Loading' : 'Live'}</span>
            <span class="app-layout__stat-label">Realtime sync</span>
          </div>
        </div>
      </section>

      <section class="app-layout__content">
        <div class="app-layout__pane ${lampState.dashboardView === 'map' ? 'is-active' : 'is-hidden'}" data-layout-pane="map">
          ${mapPane}
        </div>
        <div class="app-layout__pane ${lampState.dashboardView === 'table' ? 'is-active' : 'is-hidden'}" data-layout-pane="table">
          ${tablePane}
        </div>
      </section>

      ${createLampForm()}
    </main>
  `;
}

export function afterRenderAppLayout(rootElement) {
  rootElement.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardView(button.dataset.view);
    });
  });

  rootElement.querySelector('[data-open-lamp-form]')?.addEventListener('click', () => {
    if (!getAuthState().currentUser) {
      openAuthModal('login');
      return;
    }

    openCreateLampForm(42.7, 25.5);
  });
}
