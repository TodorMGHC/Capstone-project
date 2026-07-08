import './dashboard-page.css';
import { createAppLayout, afterRenderAppLayout } from '../components/layout/AppLayout.js';
import { afterRenderBulgariaMap } from '../components/map/BulgariaMap.js';
import { afterRenderLampsTable } from '../components/table/LampsTable.js';
import { afterRenderLampForm } from '../components/lamps/LampForm.js';

export function createDashboardPage() {
  return createAppLayout();
}

export function afterRenderDashboardPage(rootElement) {
  afterRenderAppLayout(rootElement);
  afterRenderBulgariaMap(rootElement);
  afterRenderLampsTable(rootElement);
  afterRenderLampForm(rootElement);
}
