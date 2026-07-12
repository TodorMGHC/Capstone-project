import './lamp-form.css';
import { closeLampForm, getAppState, saveLamp, startLampCoordinatePick } from '../../lib/app-store.js';
import { escapeHtml } from '../../utils/escape-html.js';

let isSubmitting = false;

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
    <div class="lamp-form-overlay" data-lamp-modal>
      <div class="lamp-form-dialog" role="dialog" aria-modal="true" aria-label="Add lamp report">
        <div class="lamp-form-card">
          <div class="lamp-form-card__header px-4 pt-4 pb-3">
            <div>
              <p class="text-uppercase small mb-1 text-warning fw-semibold">${isEditing ? 'Edit lamp' : 'Add lamp'}</p>
              <h2 class="h4 mb-0">${isEditing ? 'Update the report' : 'Report a burnt out lamp'}</h2>
            </div>
            <button type="button" class="btn-close" data-lamp-close aria-label="Close"></button>
          </div>
          <div class="lamp-form-card__body px-4 pb-4">
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
              <div class="lamp-form__field">
                <label for="lamp-cover-image">Cover image (max 5 MB)</label>
                ${lamp?.cover_image_url ? `<img class="lamp-form__image-preview" src="${escapeHtml(lamp.cover_image_url)}" alt="Current report cover" />` : ''}
                <input id="lamp-cover-image" name="coverImage" type="file" class="form-control" accept="image/jpeg,image/png,image/webp,image/gif" />
                ${lamp?.cover_image_url
                  ? '<label class="lamp-form__checkbox"><input type="checkbox" name="removeCoverImage" /> Remove current image</label>'
                  : '<small class="text-body-secondary">Optional image shown on report cards and in admin panel.</small>'}
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
                ${isEditing ? '' : '<button class="btn btn-outline-warning" type="button" data-lamp-view-map>View map</button>'}
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
    isSubmitting = false;
    return;
  }

  modalElement.addEventListener('click', (event) => {
    if (event.target === modalElement) {
      closeLampForm();
    }
  });

  modalElement.querySelector('[data-lamp-close]')?.addEventListener('click', () => {
    closeLampForm();
  });

  modalElement.querySelector('[data-lamp-cancel]')?.addEventListener('click', () => {
    closeLampForm();
  });

  modalElement.querySelector('[data-lamp-view-map]')?.addEventListener('click', () => {
    closeLampForm();
    startLampCoordinatePick();
  });

  const form = modalElement.querySelector('[data-lamp-form]');
  const status = modalElement.querySelector('[data-lamp-status]');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }
      isSubmitting = true;

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
        coverImageFile: formData.get('coverImage'),
        removeCoverImage: formData.get('removeCoverImage') === 'on',
      });

      if (result.error && status) {
        status.textContent = result.error;
      }

      isSubmitting = false;
    });
  }
}
