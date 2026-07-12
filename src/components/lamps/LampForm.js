import './lamp-form.css';
import { Modal } from 'bootstrap';
import { closeLampForm, getAppState, saveLamp } from '../../lib/app-store.js';

let activeLampModal = null;

function getLampFormState() {
  const state = getAppState();
  const lamp = state.lamps.find((item) => item.id === state.editingLampId) ?? null;
  const isEditing = Boolean(lamp);
  const latitude = lamp ? Number(lamp.latitude).toFixed(6) : state.draftLocation?.latitude?.toFixed?.(6) ?? '';
  const longitude = lamp ? Number(lamp.longitude).toFixed(6) : state.draftLocation?.longitude?.toFixed?.(6) ?? '';

  return { state, lamp, isEditing, latitude, longitude };
}

export function createLampForm() {
  const { state, lamp, isEditing, latitude, longitude } = getLampFormState();
  const open = Boolean(state.editingLampId || state.draftLocation);

  if (!open) {
    return '';
  }

  return `
    <div class="modal fade lamp-form-modal" data-lamp-modal tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header px-4 pt-4 pb-3">
            <div>
              <p class="text-uppercase small mb-1 text-warning fw-semibold">${isEditing ? 'Edit lamp' : 'Add lamp'}</p>
              <h2 class="h4 mb-0">${isEditing ? 'Update the report' : 'Report a burnt out lamp'}</h2>
            </div>
            <button type="button" class="btn-close" data-lamp-close aria-label="Close"></button>
          </div>
          <div class="modal-body px-4 pb-4">
            <form class="lamp-form" data-lamp-form>
              <input type="hidden" name="id" value="${lamp ? lamp.id : ''}" />
              <div class="lamp-form__field">
                <label for="lamp-title">Title</label>
                <input id="lamp-title" name="title" type="text" class="form-control form-control-lg" value="${lamp ? lamp.title : ''}" placeholder="Burnt out lamp near a crossing" required />
              </div>
              <div class="lamp-form__field">
                <label for="lamp-comments">Comments</label>
                <textarea id="lamp-comments" name="comments" rows="4" class="form-control form-control-lg" placeholder="Add extra details about the broken lamp.">${lamp ? lamp.comments || '' : ''}</textarea>
              </div>
              <div class="row g-3">
                <div class="col-md-6 lamp-form__field">
                  <label for="lamp-latitude">Latitude</label>
                  <input id="lamp-latitude" name="latitude" type="text" class="form-control form-control-lg" value="${latitude}" readonly required />
                </div>
                <div class="col-md-6 lamp-form__field">
                  <label for="lamp-longitude">Longitude</label>
                  <input id="lamp-longitude" name="longitude" type="text" class="form-control form-control-lg" value="${longitude}" readonly required />
                </div>
              </div>
              <p class="lamp-form__status" data-lamp-status aria-live="polite">${state.lampFormError || ''}</p>
              <div class="d-flex flex-wrap gap-2 justify-content-end pt-2">
                <button class="btn btn-outline-secondary" type="button" data-lamp-cancel>Cancel</button>
                <button class="btn btn-warning fw-semibold" type="submit">${isEditing ? 'Save changes' : 'Add lamp'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRenderLampForm(rootElement) {
  const modalElement = rootElement.querySelector('[data-lamp-modal]');

  if (!modalElement) {
    return;
  }

  if (activeLampModal) {
    activeLampModal.hide();
    activeLampModal.dispose();
  }

  activeLampModal = Modal.getOrCreateInstance(modalElement, {
    backdrop: 'static',
    focus: true,
    keyboard: true,
  });
  activeLampModal.show();

  modalElement.addEventListener('hidden.bs.modal', () => {
    closeLampForm();
  });

  modalElement.querySelector('[data-lamp-close]')?.addEventListener('click', () => {
    closeLampForm();
  });

  modalElement.querySelector('[data-lamp-cancel]')?.addEventListener('click', () => {
    closeLampForm();
  });

  const form = modalElement.querySelector('[data-lamp-form]');
  const status = modalElement.querySelector('[data-lamp-status]');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      if (status) {
        status.textContent = 'Saving lamp report...';
      }

      const result = await saveLamp({
        id: formData.get('id')?.toString() || '',
        title: formData.get('title')?.toString() || '',
        comments: formData.get('comments')?.toString() || '',
        latitude: formData.get('latitude')?.toString() || '',
        longitude: formData.get('longitude')?.toString() || '',
      });

      if (result.error && status) {
        status.textContent = result.error;
      }
    });
  }
}
