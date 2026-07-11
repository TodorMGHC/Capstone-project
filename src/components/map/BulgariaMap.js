import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import './bulgaria-map.css';
import { canManageLamp, getAppState, openCreateLampForm, openEditLampForm, removeLamp, selectLamp, setDashboardView, setSelectedLampId } from '../../lib/app-store.js';
import { escapeHtml } from '../../utils/escape-html.js';
import { EyeIcon, PencilIcon, TrashIcon } from '../icons.js';

let activeMap = null;
let markersLayer = null;
let markersByLampId = new Map();
let visitorTooltip = null;

const BULGARIA_CENTER = [42.7, 25.5];

function lampIconSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a5 5 0 0 0-3 9v3h6V11a5 5 0 0 0-3-9Z" />
    </svg>
  `;
}

function createLampDivIcon(isSelected = false) {
  return L.divIcon({
    className: `lamp-marker-wrapper${isSelected ? ' lamp-marker-wrapper--selected' : ''}`,
    html: `
      <div class="lamp-marker${isSelected ? ' lamp-marker--selected' : ''}" aria-hidden="true">
        ${lampIconSvg()}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    popupAnchor: [0, -24],
    tooltipAnchor: [0, -12],
  });
}

function buildPopupContent(lamp, editable) {
  return `
    <div class="lamp-popup" data-lamp-popup data-popup-lamp-id="${escapeHtml(lamp.id)}">
      <strong class="lamp-popup__title">${escapeHtml(lamp.title)}</strong>
      <p class="lamp-popup__comments">${escapeHtml(lamp.comments || 'No comments yet.')}</p>
      <small class="lamp-popup__coords">${formatLampCoordinate(lamp.latitude)}, ${formatLampCoordinate(lamp.longitude)}</small>
      <div class="lamp-popup__actions">
        <button class="lamp-icon-btn" type="button" data-popup-action="view" data-lamp-id="${escapeHtml(lamp.id)}" title="View in table" aria-label="View in table">${EyeIcon()}</button>
        ${editable ? `<button class="lamp-icon-btn lamp-icon-btn--warning" type="button" data-popup-action="edit" data-lamp-id="${escapeHtml(lamp.id)}" title="Edit lamp" aria-label="Edit lamp">${PencilIcon()}</button>` : ''}
        ${editable ? `<button class="lamp-icon-btn lamp-icon-btn--danger" type="button" data-popup-action="delete" data-lamp-id="${escapeHtml(lamp.id)}" title="Delete lamp" aria-label="Delete lamp">${TrashIcon()}</button>` : ''}
      </div>
    </div>
  `;
}

export function createBulgariaMap() {
  const state = getAppState();
  const selectedLamp = state.lamps.find((lamp) => lamp.id === state.selectedLampId) ?? null;

  return `
    <section class="bulgaria-map-panel">
      <div class="bulgaria-map-panel__meta">
        <h2 class="bulgaria-map-panel__title h4 mb-0">Lamp map of Bulgaria</h2>
        <p class="bulgaria-map-panel__subtitle mb-0">Click the map to add a lamp report. Click a marker to focus the matching row in the table.</p>
      </div>
      <div class="bulgaria-map-stage" data-bulgaria-map></div>
      <p class="bulgaria-map__hint" data-map-hint>${state.session ? 'Click anywhere on the map to open a new lamp report.' : 'Sign in to add lamps.'}</p>
      ${selectedLamp
        ? `
          <div class="bulgaria-map__selected">
            <span class="bulgaria-map__selected-label">Selected lamp</span>
            <h3 class="h5 mb-1">${escapeHtml(selectedLamp.title)}</h3>
            <p class="mb-1 text-body-secondary">${escapeHtml(selectedLamp.comments || 'No comments yet.')}</p>
            <small class="text-body-secondary">${formatLampCoordinate(selectedLamp.latitude)}, ${formatLampCoordinate(selectedLamp.longitude)}</small>
          </div>
        `
        : ''}
    </section>
  `;
}

export function destroyBulgariaMap() {
  if (activeMap) {
    try {
      activeMap.remove();
    } catch {
      // container already detached from DOM
    }
  }
  activeMap = null;
  markersLayer = null;
  markersByLampId = new Map();
  visitorTooltip = null;
}

export function afterRenderBulgariaMap(rootElement) {
  const mapElement = rootElement.querySelector('[data-bulgaria-map]');
  const hintElement = rootElement.querySelector('[data-map-hint]');
  const state = getAppState();

  if (!mapElement) {
    return;
  }

  destroyBulgariaMap();

  const mapPane = mapElement.closest('[data-layout-pane]');
  if (mapPane && mapPane.classList.contains('is-hidden')) {
    return;
  }

  activeMap = L.map(mapElement, {
    center: BULGARIA_CENTER,
    zoom: 7,
    zoomControl: true,
    scrollWheelZoom: true,
    preferCanvas: true,
  });

  markersLayer = L.layerGroup().addTo(activeMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    className: 'warm-tiles',
  }).addTo(activeMap);

  const bounds = [];
  const defaultIcon = createLampDivIcon(false);
  const selectedIcon = createLampDivIcon(true);

  state.lamps.forEach((lamp) => {
    const isSelected = lamp.id === state.selectedLampId;
    const icon = isSelected ? selectedIcon : defaultIcon;
    const marker = L.marker([lamp.latitude, lamp.longitude], { icon }).addTo(markersLayer);
    markersByLampId.set(lamp.id, marker);

    const editable = canManageLamp(lamp);
    marker.bindPopup(buildPopupContent(lamp, editable));

    marker.on('click', () => {
      selectLamp(lamp.id);
    });

    bounds.push([lamp.latitude, lamp.longitude]);
  });

  const selectedLamp = state.lamps.find((lamp) => lamp.id === state.selectedLampId) ?? null;

  if (selectedLamp) {
    activeMap.setView([selectedLamp.latitude, selectedLamp.longitude], Math.max(activeMap.getZoom(), 11));
    const selectedMarker = markersByLampId.get(selectedLamp.id);
    if (selectedMarker) {
      selectedMarker.setIcon(selectedIcon);
      selectedMarker.openPopup();
    }
  } else if (bounds.length) {
    activeMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
  }

  activeMap.on('click', (event) => {
    if (!state.session) {
      if (hintElement) {
        hintElement.textContent = 'Sign in to add lamps.';
        hintElement.classList.add('bulgaria-map__hint--warn');
      }

      if (visitorTooltip) {
        visitorTooltip.remove();
      }

      visitorTooltip = L.tooltip()
        .setLatLng(event.latlng)
        .setContent('Sign in to add lamps')
        .addTo(activeMap);

      setTimeout(() => {
        if (visitorTooltip) {
          visitorTooltip.remove();
          visitorTooltip = null;
        }
      }, 2500);

      return;
    }

    const latitude = event.latlng.lat.toFixed(6);
    const longitude = event.latlng.lng.toFixed(6);

    openCreateLampForm(latitude, longitude);
    setSelectedLampId(null);

    if (hintElement) {
      hintElement.textContent = `Draft lamp location set to ${latitude}, ${longitude}.`;
      hintElement.classList.remove('bulgaria-map__hint--warn');
    }
  });

  activeMap.on('popupopen', (event) => {
    const popupContent = event.popup.getElement()?.querySelector('[data-lamp-popup]');
    if (!popupContent) {
      return;
    }

    popupContent.querySelectorAll('[data-popup-action]').forEach((button) => {
      button.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const lampId = button.dataset.lampId;
        const action = button.dataset.popupAction;
        if (!lampId) {
          return;
        }

        if (action === 'view') {
          selectLamp(lampId);
          setDashboardView('table');
          activeMap.closePopup();
          return;
        }

        if (action === 'edit') {
          selectLamp(lampId);
          openEditLampForm(lampId);
          activeMap.closePopup();
          return;
        }

        if (action === 'delete') {
          const confirmed = window.confirm('Delete this lamp report?');
          if (!confirmed) {
            return;
          }
          await removeLamp(lampId);
          activeMap.closePopup();
        }
      });
    });
  });

  requestAnimationFrame(() => {
    activeMap?.invalidateSize();
  });
}
