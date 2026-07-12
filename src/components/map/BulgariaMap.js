import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import './bulgaria-map.css';
import {
  canManageLamp,
  consumeNextSelectedLampZoomLevel,
  consumeSelectedLampPopupSuppression,
  getAppState,
  openCreateLampForm,
  openEditLampForm,
  removeLamp,
  selectLamp,
  setDashboardView,
  setSelectedLampId,
  stopLampCoordinatePick,
} from '../../lib/app-store.js';
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

function formatLampCoordinate(value) {
  return Number(value).toFixed(6);
}

function buildPopupContent(lamp, editable) {
  return `
    <div class="lamp-popup" data-lamp-popup data-popup-lamp-id="${escapeHtml(lamp.id)}">
      <strong class="lamp-popup__title">${escapeHtml(lamp.title)}</strong>
      ${lamp.cover_image_url ? `<img class="lamp-popup__image" src="${escapeHtml(lamp.cover_image_url)}" alt="Cover for ${escapeHtml(lamp.title)}" />` : ''}
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

  return `
    <section class="bulgaria-map-panel">
      <div class="bulgaria-map-panel__meta">
        <h2 class="bulgaria-map-panel__title h4 mb-0">Lamp map of Bulgaria</h2>
        <p class="bulgaria-map-panel__subtitle mb-0">${state.awaitingCoordinates ? 'Double-click the map to choose coordinates for the new lamp report.' : 'Double-click the map to add a lamp report. Click a marker to focus the matching row in the table.'}</p>
      </div>
      <div class="bulgaria-map-stage" data-bulgaria-map></div>
      <p class="bulgaria-map__hint ${state.awaitingCoordinates ? 'bulgaria-map__hint--warn' : ''}" data-map-hint>${state.awaitingCoordinates ? 'Double-click a point on the map to fill latitude and longitude.' : state.session ? 'Double-click anywhere on the map to open a new lamp report.' : 'Sign in to add lamps.'}</p>
    </section>
  `;
}

export function destroyBulgariaMap() {
  if (activeMap) {
    activeMap._zooming = false;
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
    doubleClickZoom: false,
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
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

  const handleMapPick = (clickPoint) => {
    if (!getAppState().session) {
      if (hintElement) {
        hintElement.textContent = 'Sign in to add lamps.';
        hintElement.classList.add('bulgaria-map__hint--warn');
      }

      if (visitorTooltip) {
        visitorTooltip.remove();
      }

      visitorTooltip = L.tooltip()
        .setLatLng(clickPoint)
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

    const latitude = clickPoint.lat.toFixed(6);
    const longitude = clickPoint.lng.toFixed(6);

    if (hintElement) {
      hintElement.textContent = `Draft lamp location set to ${latitude}, ${longitude}.`;
      hintElement.classList.remove('bulgaria-map__hint--warn');
    }

    stopLampCoordinatePick();
    openCreateLampForm(latitude, longitude);
  };

  state.lamps.forEach((lamp) => {
    const isSelected = lamp.id === state.selectedLampId;
    const icon = isSelected ? selectedIcon : defaultIcon;
    const marker = L.marker([lamp.latitude, lamp.longitude], { icon }).addTo(markersLayer);
    markersByLampId.set(lamp.id, marker);

    const editable = canManageLamp(lamp);
    marker.bindPopup(buildPopupContent(lamp, editable));

    marker.on('click', () => {
      setTimeout(() => selectLamp(lamp.id), 0);
    });

    bounds.push([lamp.latitude, lamp.longitude]);
  });

  mapElement.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-popup-action]');
    if (!actionButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const lampId = actionButton.dataset.lampId;
    const action = actionButton.dataset.popupAction;
    if (!lampId) {
      return;
    }

    if (action === 'view') {
      activeMap.closePopup();
      setTimeout(() => {
        selectLamp(lampId);
        setDashboardView('table');
      }, 0);
      return;
    }

    if (action === 'edit') {
      activeMap.closePopup();
      setTimeout(() => {
        selectLamp(lampId);
        openEditLampForm(lampId);
      }, 0);
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm('Delete this lamp report?');
      if (!confirmed) {
        return;
      }

      activeMap.closePopup();
      setTimeout(async () => {
        const result = await removeLamp(lampId);
        if (result?.error) {
          window.alert(result.error);
        }
      }, 0);
    }
  });

  const selectedLamp = state.lamps.find((lamp) => lamp.id === state.selectedLampId) ?? null;

  if (selectedLamp) {
    const zoomOverride = consumeNextSelectedLampZoomLevel();
    const focusZoom = zoomOverride ?? Math.max(activeMap.getZoom(), 14);
    activeMap.setView([selectedLamp.latitude, selectedLamp.longitude], focusZoom, { animate: false });
    const selectedMarker = markersByLampId.get(selectedLamp.id);
    if (selectedMarker) {
      selectedMarker.setIcon(selectedIcon);
      if (!consumeSelectedLampPopupSuppression()) {
        selectedMarker.openPopup();
      }
    }
  } else if (bounds.length) {
    activeMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: false });
  }

  activeMap.on('dblclick', (event) => {
    handleMapPick(event.latlng);
  });

  mapElement.addEventListener('dblclick', (event) => {
    if (event.target.closest('.leaflet-control, .leaflet-marker-icon, .leaflet-popup')) {
      return;
    }

    handleMapPick(activeMap.mouseEventToLatLng(event));
  });

  requestAnimationFrame(() => {
    activeMap?.invalidateSize();
  });
}
