import {
  closeAuthModal,
  getAppState,
  initializeAppState,
  login,
  logout,
  register,
  setAuthMode,
  subscribe,
  openAuthModal,
} from '../lib/app-store.js';

export function getAuthState() {
  const state = getAppState();

  return {
    currentUser: state.session?.user ?? null,
    profile: state.profile,
    loading: state.loading,
    authModalOpen: state.authModalOpen,
    authMode: state.authMode,
    authMessage: state.authMessage,
  };
}

export function subscribeAuth(listener) {
  return subscribe(() => listener(getAuthState()));
}

export function useAuth() {
  return {
    ...getAuthState(),
    login,
    register,
    logout,
    openAuthModal,
    closeAuthModal,
    setAuthMode,
    initializeAppState,
  };
}

export { initializeAppState, login, logout, register, openAuthModal, closeAuthModal, setAuthMode };
