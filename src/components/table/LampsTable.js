import './lamps-table.css';
import { getAppState, canManageLamp, openEditLampForm, removeLamp, selectLamp } from '../../lib/app-store.js';
import { PencilIcon, TrashIcon, MapPinIcon } from '../icons.js';
import { escapeHtml } from '../../utils/escape-html.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Unknown';
}

function formatCoordinates(lamp) {
  return `${Number(lamp.latitude).toFixed(6)}, ${Number(lamp.longitude).toFixed(6)}`;
}

export function createLampsTable() {
  const state = getAppState();

  return `
    <section class="lamps-table-panel">
      <div>
        <h2 class="lamps-table-panel__title h4 mb-0">Lamp reports table</h2>
        <p class="lamps-table-panel__subtitle mb-0">Click a row to select the lamp and keep the map in sync.</p>
      </div>
      <div class="lamps-table-wrap table-responsive">
        <table class="table align-middle lamps-table mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Comments</th>
              <th>Owner</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.lamps
              .map((lamp) => {
                const selected = lamp.id === state.selectedLampId;
                const editable = canManageLamp(lamp);

                return `
                  <tr class="${selected ? 'is-selected' : ''}" data-lamp-row data-lamp-id="${escapeHtml(lamp.id)}" tabindex="0" role="button">
                    <td>
                      <div class="lamps-table__title">${escapeHtml(lamp.title)}</div>
                      <div class="lamps-table__meta d-flex align-items-center gap-1">
                        <span class="lamps-table__badge"><span class="me-1">${MapPinIcon()}</span>Pin</span>
                      </div>
                    </td>
                    <td class="lamps-table__location">${formatCoordinates(lamp)}</td>
                    <td class="lamps-table__comment">${escapeHtml(lamp.comments || 'No comments yet.')}</td>
                    <td>${escapeHtml(lamp.owner?.username || 'Anonymous')}</td>
                    <td>${escapeHtml(formatDate(lamp.created_at))}</td>
                    <td>
                      <div class="lamps-table__actions">
                        ${editable
                          ? `
                            <button class="btn btn-outline-warning btn-sm" type="button" data-lamp-action="edit" data-lamp-id="${escapeHtml(lamp.id)}">
                              <span class="me-1">${PencilIcon()}</span>Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm" type="button" data-lamp-action="delete" data-lamp-id="${escapeHtml(lamp.id)}">
                              <span class="me-1">${TrashIcon()}</span>Delete
                            </button>
                          `
                          : '<span class="text-body-secondary">View only</span>'}
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('') || '<tr><td colspan="6" class="text-body-secondary">No lamp reports yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function afterRenderLampsTable(rootElement) {
  const state = getAppState();
  const selectedRow = rootElement.querySelector(`[data-lamp-id="${CSS.escape(state.selectedLampId || '')}"]`);

  rootElement.querySelectorAll('[data-lamp-row]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        return;
      }

      const lampId = row.dataset.lampId;
      if (lampId) {
        selectLamp(lampId);
      }
    });

    row.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && row.dataset.lampId) {
        event.preventDefault();
        selectLamp(row.dataset.lampId);
      }
    });
  });

  rootElement.querySelectorAll('[data-lamp-action]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const lampId = button.dataset.lampId;

      if (!lampId) {
        return;
      }

      if (button.dataset.lampAction === 'edit') {
        openEditLampForm(lampId);
        return;
      }

      if (button.dataset.lampAction === 'delete') {
        const confirmed = window.confirm('Delete this lamp report?');
        if (!confirmed) {
          return;
        }

        await removeLamp(lampId);
      }
    });
  });

  if (selectedRow) {
    selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
