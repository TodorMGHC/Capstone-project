import {
  canManageLamp,
  closeLampForm,
  clearSelection,
  getAppState,
  getSelectedLamp,
  openCreateLampForm,
  openEditLampForm,
  refreshLampData,
  removeLamp,
  saveLamp,
  selectLamp,
  setDashboardView,
  setSelectedLampId,
  subscribe,
} from '../lib/app-store.js';

export function getLampState() {
  const state = getAppState();

  return {
    lamps: state.lamps,
    selectedLampId: state.selectedLampId,
    selectedLamp: getSelectedLamp(),
    editingLampId: state.editingLampId,
    draftLocation: state.draftLocation,
    dashboardView: state.dashboardView,
    lampFormError: state.lampFormError,
    loading: state.loading,
    canManageLamp,
  };
}

export function subscribeLamps(listener) {
  return subscribe(() => listener(getLampState()));
}

export function useLamps() {
  return {
    ...getLampState(),
    setSelectedLampId,
    selectLamp,
    openCreateLampForm,
    openEditLampForm,
    closeLampForm,
    clearSelection,
    setDashboardView,
    saveLamp,
    deleteLamp: removeLamp,
    refreshLamps: refreshLampData,
    canManageLamp,
  };
}

export { setSelectedLampId, selectLamp, openCreateLampForm, openEditLampForm, closeLampForm, clearSelection, setDashboardView, saveLamp, removeLamp, refreshLampData };
