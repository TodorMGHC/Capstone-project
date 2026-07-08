import { supabase } from './supabase.js';

const state = {
  initialized: false,
  loading: true,
  error: '',
  session: null,
  profile: null,
  pins: [],
  selectedPinId: null,
  draftLocation: null,
};

const listeners = new Set();
let authSubscription = null;
let initializePromise = null;

function emitChange() {
  for (const listener of listeners) {
    listener(state);
  }
}

function setState(partialState) {
  Object.assign(state, partialState);
  emitChange();
}

async function fetchPins() {
  const { data, error } = await supabase
    .from('pins')
    .select('id, owner_id, title, comment, latitude, longitude, place_name, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function syncSession(session) {
  setState({ loading: true, error: '' });

  try {
    const pins = await fetchPins();
    let profile = null;

    if (session?.user?.id) {
      profile = await fetchProfile(session.user.id);
    }

    setState({
      initialized: true,
      loading: false,
      session: session ?? null,
      profile,
      pins,
      selectedPinId: state.selectedPinId && pins.some((pin) => pin.id === state.selectedPinId) ? state.selectedPinId : null,
      draftLocation: state.draftLocation,
      error: '',
    });
  } catch (error) {
    setState({
      initialized: true,
      loading: false,
      error: error instanceof Error ? error.message : 'Unable to load app data.',
    });
  }
}

export async function initializeAppState() {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setState({ initialized: true, loading: false, error: error.message });
      return;
    }

    await syncSession(data.session);

    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    authSubscription = authData.subscription;
  })();

  return initializePromise;
}

export function getAppState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAuthenticated() {
  return Boolean(state.session?.user);
}

export function isAdmin() {
  return state.profile?.role === 'admin';
}

export function canManagePin(pin) {
  if (!state.session?.user) {
    return false;
  }

  return pin.owner_id === state.session.user.id || isAdmin();
}

export function selectPin(pinId) {
  setState({ selectedPinId: pinId, draftLocation: null });
}

export function clearSelection() {
  setState({ selectedPinId: null });
}

export function setDraftLocation(latitude, longitude) {
  setState({
    draftLocation: {
      latitude,
      longitude,
    },
    selectedPinId: null,
  });
}

export function clearDraftLocation() {
  setState({ draftLocation: null });
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, session: null };
  }

  await syncSession(data.session ?? null);
  return { error: '', session: data.session ?? null };
}

export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message, session: null };
  }

  await syncSession(data.session ?? null);
  return { error: '', session: data.session ?? null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  await syncSession(null);
  return { error: '' };
}

export async function savePin({ id, title, comment, latitude, longitude, placeName }) {
  if (!state.session?.user?.id) {
    return { error: 'Sign in to add or update reports.' };
  }

  const payload = {
    title: title.trim(),
    comment: comment.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    place_name: placeName.trim(),
  };

  if (!payload.title || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
    return { error: 'Title, latitude, and longitude are required.' };
  }

  const query = id
    ? supabase.from('pins').update(payload).eq('id', id)
    : supabase.from('pins').insert({ ...payload, owner_id: state.session.user.id });

  const { error } = await query;

  if (error) {
    return { error: error.message };
  }

  await syncSession(state.session);
  return { error: '' };
}

export async function removePin(pinId) {
  if (!state.session?.user?.id) {
    return { error: 'Sign in to delete reports.' };
  }

  const { error } = await supabase.from('pins').delete().eq('id', pinId);

  if (error) {
    return { error: error.message };
  }

  if (state.selectedPinId === pinId) {
    clearSelection();
  }

  clearDraftLocation();
  await syncSession(state.session);
  return { error: '' };
}

export async function reloadAppData() {
  await syncSession(state.session);
}

export function destroyAppState() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  initializePromise = null;
}
