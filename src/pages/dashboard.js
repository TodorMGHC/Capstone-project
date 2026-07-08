import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url';
import markerIcon from 'leaflet/dist/images/marker-icon.png?url';
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url';

import { createPageContent } from '../components/page-content.js';
import {
  canManagePin,
  clearDraftLocation,
  clearSelection,
  getAppState,
  isAdmin,
  reloadAppData,
  removePin,
  savePin,
  selectPin,
  setDraftLocation,
} from '../lib/app-store.js';
import { escapeHtml } from '../utils/escape-html.js';
import './dashboard.css';

let activeMap = null;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SOFIA_COORDINATES = [42.6977, 23.3219];

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function getSelectedPin(state) {
  return state.pins.find((pin) => pin.id === state.selectedPinId) ?? null;
}

function getPinLocationLabel(pin) {
  return pin.place_name?.trim() || `${formatCoordinate(pin.latitude)}, ${formatCoordinate(pin.longitude)}`;
}

function renderHeroMetrics(state, selectedPin) {
  const visibleCount = state.pins.length;
  const editableCount = state.session ? state.pins.filter((pin) => canManagePin(pin)).length : 0;
  const roleLabel = isAdmin() ? 'Admin' : state.session ? 'Registered user' : 'Visitor';

  return `
    <div class="report-metrics">
      <div class="report-metric">
        <span class="report-metric__value">${visibleCount}</span>
        <span class="report-metric__label">Public reports</span>
      </div>
      <div class="report-metric">
        <span class="report-metric__value">${editableCount}</span>
        <span class="report-metric__label">Editable by you</span>
      </div>
      <div class="report-metric">
        <span class="report-metric__value">${escapeHtml(roleLabel)}</span>
        <span class="report-metric__label">Current access</span>
      </div>
      <div class="report-metric report-metric--wide">
        <span class="report-metric__value">${selectedPin ? escapeHtml(selectedPin.title) : 'No pin selected'}</span>
        <span class="report-metric__label">Current focus</span>
      </div>
    </div>
  `;
}

function renderSelectedPin(selectedPin) {
  if (!selectedPin) {
    return `
      <div class="report-empty-state">
        <h2 class="h5 mb-2">Selected report</h2>
        <p class="mb-0 text-body-secondary">Click a marker or a table row to inspect a report on the map.</p>
      </div>
    `;
  }

  return `
    <div class="report-selected" data-selected-pin>
      <span class="report-selected__eyebrow">Selected report</span>
      <h2 class="h5 mb-2">${escapeHtml(selectedPin.title)}</h2>
      <p class="mb-2 text-body-secondary">${escapeHtml(selectedPin.comment || 'No comment yet.')}</p>
      <div class="report-selected__meta">
        <span>${escapeHtml(getPinLocationLabel(selectedPin))}</span>
        <span>${formatCoordinate(selectedPin.latitude)}, ${formatCoordinate(selectedPin.longitude)}</span>
      </div>
    </div>
  `;
}

function renderPinForm(state, selectedPin) {
  const editablePin = selectedPin && canManagePin(selectedPin) ? selectedPin : null;
  const draft = state.draftLocation;
  const isLocked = Boolean(state.session && selectedPin && !editablePin);
  const formTitle = editablePin ? 'Edit report' : state.session ? 'Add a report' : 'Sign in to add reports';
  const formHint = !state.session
    ? 'Visitors can browse every report, but only signed-in users can add new pins.'
    : selectedPin && !editablePin
      ? 'This report belongs to another user. You can view it, but only the owner or admin can edit it.'
      : 'Click the map to prefill coordinates, then add a title and comment.';

  const initialLatitude = editablePin ? formatCoordinate(editablePin.latitude) : draft?.latitude ?? '';
  const initialLongitude = editablePin ? formatCoordinate(editablePin.longitude) : draft?.longitude ?? '';

  return `
    <section class="report-form-panel">
      <div class="report-form-panel__header">
        <div>
          <span class="report-form-panel__eyebrow">${escapeHtml(formTitle)}</span>
          <p class="report-form-panel__hint mb-0">${escapeHtml(formHint)}</p>
        </div>
        ${state.session ? '<button class="btn btn-sm btn-outline-light" type="button" data-new-report>New report</button>' : ''}
      </div>

      ${state.session
        ? `
          <form class="report-form" data-pin-form>
            <input type="hidden" name="id" value="${editablePin ? escapeHtml(editablePin.id) : ''}" />
            <div class="report-form__grid">
              <div class="report-field report-field--full">
                <label for="pin-title">Title</label>
                <input id="pin-title" name="title" type="text" class="form-control form-control-lg" placeholder="Burnt out lamp on a street corner" value="${editablePin ? escapeHtml(editablePin.title) : ''}" ${isLocked ? 'disabled' : ''} required />
              </div>
              <div class="report-field report-field--full">
                <label for="pin-place">Location label</label>
                <input id="pin-place" name="placeName" type="text" class="form-control form-control-lg" placeholder="Sofia, Vitosha Boulevard" value="${editablePin ? escapeHtml(editablePin.place_name || '') : ''}" ${isLocked ? 'disabled' : ''} />
              </div>
              <div class="report-field">
                <label for="pin-latitude">Latitude</label>
                <input id="pin-latitude" name="latitude" type="text" class="form-control form-control-lg" placeholder="42.697700" value="${escapeHtml(initialLatitude)}" ${isLocked ? 'disabled' : ''} required />
              </div>
              <div class="report-field">
                <label for="pin-longitude">Longitude</label>
                <input id="pin-longitude" name="longitude" type="text" class="form-control form-control-lg" placeholder="23.321900" value="${escapeHtml(initialLongitude)}" ${isLocked ? 'disabled' : ''} required />
              </div>
              <div class="report-field report-field--full">
                <label for="pin-comment">Comments</label>
                <textarea id="pin-comment" name="comment" rows="4" class="form-control form-control-lg" placeholder="What happened here?" ${isLocked ? 'disabled' : ''}>${editablePin ? escapeHtml(editablePin.comment || '') : ''}</textarea>
              </div>
            </div>
            <div class="report-form__actions">
              <button class="btn btn-primary btn-lg" type="submit" ${isLocked ? 'disabled' : ''}>${editablePin ? 'Save changes' : 'Add report'}</button>
              <p class="report-status" data-form-status aria-live="polite"></p>
            </div>
          </form>
        `
        : `
          <div class="report-form-locked">
            <a class="btn btn-primary btn-lg" data-link href="/login">Sign in to add reports</a>
            <p class="mb-0 text-body-secondary">Read-only access still lets visitors inspect every pin on the map and in the table.</p>
          </div>
        `}
    </section>
  `;
}

function renderPinsTable(state, selectedPin) {
  const canEditAnyPin = Boolean(state.session);
  const tableRows = state.pins
    .map((pin) => {
      const isSelected = selectedPin?.id === pin.id;
      const editable = canManagePin(pin);
      const comment = pin.comment ? pin.comment : 'No comment yet.';
      const rowActions = editable
        ? `
          <button class="btn btn-sm btn-outline-light" type="button" data-pin-action="edit" data-pin-id="${escapeHtml(pin.id)}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" type="button" data-pin-action="delete" data-pin-id="${escapeHtml(pin.id)}">Delete</button>
        `
        : '';

      return `
        <tr class="${isSelected ? 'is-selected' : ''}" data-pin-row data-pin-id="${escapeHtml(pin.id)}" tabindex="0" role="button">
          <td>
            <div class="report-table__title">${escapeHtml(pin.title)}</div>
            <div class="report-table__subtitle">${escapeHtml(getPinLocationLabel(pin))}</div>
          </td>
          <td>${escapeHtml(comment)}</td>
          <td>${formatCoordinate(pin.latitude)}, ${formatCoordinate(pin.longitude)}</td>
          <td>
            <div class="report-table__actions">${rowActions || '<span class="report-table__muted">View only</span>'}</div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="report-table-panel">
      <div class="report-table-panel__header">
        <div>
          <span class="report-form-panel__eyebrow">All reports</span>
          <p class="report-form-panel__hint mb-0">${canEditAnyPin ? 'Select a row to focus the map. Use the buttons to edit or remove your accessible reports.' : 'Select any row to focus the map.'}</p>
        </div>
      </div>
      <div class="table-responsive report-table-wrap">
        <table class="table align-middle report-table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Comment</th>
              <th>Coordinates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" class="text-body-secondary">No reports available yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMapPanel(state, selectedPin) {
  const mapMessage = state.session
    ? 'Click the map to capture coordinates for a new report.'
    : 'Visitors can browse the map and table in read-only mode.';

  return `
    <section class="report-map-panel">
      <div class="report-map-panel__header">
        <div>
          <span class="report-form-panel__eyebrow">Bulgaria map</span>
          <p class="report-form-panel__hint mb-0">${escapeHtml(mapMessage)}</p>
        </div>
      </div>
      <div class="report-map" data-bulgaria-map></div>
      <p class="report-map__hint" data-map-hint>${escapeHtml(mapMessage)}</p>
      ${renderSelectedPin(selectedPin)}
    </section>
  `;
}

export function getTitle() {
  return 'Burnt out Lamps Map';
}

export function renderPage() {
  const state = getAppState();
  const selectedPin = getSelectedPin(state);

  return createPageContent({
    kicker: 'Burnt out Lamps Map',
    title: 'Bulgaria reports dashboard',
    description:
      'Visitors can browse every public report. Registered users can add new reports and edit or delete only their own pins. Admins can manage all user reports.',
    body: `
      <div class="report-shell">
        ${renderHeroMetrics(state, selectedPin)}
        ${renderMapPanel(state, selectedPin)}
        ${renderPinsTable(state, selectedPin)}
      </div>
    `,
    aside: `
      ${renderPinForm(state, selectedPin)}
      <section class="report-summary-panel">
        <h2 class="h5 mb-3">How it works</h2>
        <div class="report-summary-list">
          <div class="report-summary-item">
            <span class="report-summary-item__title">Visitors</span>
            <span class="report-summary-item__text">Read-only view of all pins.</span>
          </div>
          <div class="report-summary-item">
            <span class="report-summary-item__title">Registered users</span>
            <span class="report-summary-item__text">Add a new report by clicking the map, then save it with a title and comment.</span>
          </div>
          <div class="report-summary-item">
            <span class="report-summary-item__title">Admin</span>
            <span class="report-summary-item__text">Can edit or delete any report in the table.</span>
          </div>
        </div>
      </section>
    `,
    actions: state.session
      ? `
        <button class="btn btn-primary" type="button" data-new-report>New report</button>
        <button class="btn btn-outline-light" type="button" data-refresh-pins>Refresh pins</button>
      `
      : `
        <a class="btn btn-primary" data-link href="/login">Register or sign in</a>
        <a class="btn btn-outline-light" data-link href="/">Home</a>
      `,
  });
}

export async function afterRender(rootElement) {
  const state = getAppState();
  const selectedPin = getSelectedPin(state);
  const mapElement = rootElement.querySelector('[data-bulgaria-map]');
  const mapHint = rootElement.querySelector('[data-map-hint]');
  const form = rootElement.querySelector('[data-pin-form]');
  const formStatus = rootElement.querySelector('[data-form-status]');
  const newReportButton = rootElement.querySelector('[data-new-report]');
  const refreshButton = rootElement.querySelector('[data-refresh-pins]');

  if (newReportButton) {
    newReportButton.addEventListener('click', () => {
      clearSelection();
      clearDraftLocation();
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      void reloadAppData();
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (formStatus) {
        formStatus.textContent = 'Saving report...';
      }

      const formData = new FormData(form);
      const result = await savePin({
        id: formData.get('id')?.toString() || '',
        title: formData.get('title')?.toString() || '',
        comment: formData.get('comment')?.toString() || '',
        latitude: formData.get('latitude')?.toString() || '',
        longitude: formData.get('longitude')?.toString() || '',
        placeName: formData.get('placeName')?.toString() || '',
      });

      if (result.error) {
        if (formStatus) {
          formStatus.textContent = result.error;
        }
        return;
      }

      clearSelection();
      clearDraftLocation();
    });
  }

  rootElement.querySelectorAll('[data-pin-row]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        return;
      }

      const pinId = row.dataset.pinId;
      if (pinId) {
        selectPin(pinId);
      }
    });

    row.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && row.dataset.pinId) {
        event.preventDefault();
        selectPin(row.dataset.pinId);
      }
    });
  });

  rootElement.querySelectorAll('[data-pin-action]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const action = button.dataset.pinAction;
      const pinId = button.dataset.pinId;

      if (!pinId) {
        return;
      }

      if (action === 'edit') {
        selectPin(pinId);
        return;
      }

      if (action === 'delete') {
        const confirmed = window.confirm('Delete this report?');
        if (!confirmed) {
          return;
        }

        const result = await removePin(pinId);
        if (result.error && formStatus) {
          formStatus.textContent = result.error;
        }
      }
    });
  });

  if (mapElement) {
    if (activeMap) {
      activeMap.remove();
    }

    activeMap = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 6,
      maxZoom: 15,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(activeMap);

    const markerBounds = [];

    state.pins.forEach((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude]).addTo(activeMap);
      marker.bindPopup(`
        <strong>${escapeHtml(pin.title)}</strong><br />
        ${escapeHtml(pin.comment || 'No comment yet.')}
      `);
      marker.on('click', () => {
        selectPin(pin.id);
      });
      markerBounds.push([pin.latitude, pin.longitude]);
    });

    if (selectedPin) {
      activeMap.setView([selectedPin.latitude, selectedPin.longitude], 11);
    } else if (markerBounds.length) {
      activeMap.fitBounds(markerBounds, { padding: [40, 40], maxZoom: 11 });
    } else {
      activeMap.setView(SOFIA_COORDINATES, 7);
    }

    activeMap.on('click', (event) => {
      if (!state.session) {
        if (mapHint) {
          mapHint.textContent = 'Sign in to add a new report.';
        }
        return;
      }

      setDraftLocation(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6));
      if (mapHint) {
        mapHint.textContent = `Draft location set to ${event.latlng.lat.toFixed(6)}, ${event.latlng.lng.toFixed(6)}.`;
      }
    });

    requestAnimationFrame(() => {
      activeMap?.invalidateSize();
    });
  }
}
