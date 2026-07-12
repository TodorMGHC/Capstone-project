import { supabase } from './supabase.js';

const state = {
  initialized: false,
  loading: true,
  error: '',
  session: null,
  profile: null,
  lamps: [],
  selectedLampId: null,
  draftLocation: null,
  editingLampId: null,
  authModalOpen: false,
  authMode: 'login',
  authMessage: '',
  lampFormError: '',
  dashboardView: 'map',
  awaitingCoordinates: false,
};

const listeners = new Set();
let authSubscription = null;
let lampChannel = null;
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

function normalizeLamp(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    comments: row.comments ?? '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: row.profiles ?? null,
  };
}

function selectedLampExists() {
  return state.selectedLampId ? state.lamps.some((lamp) => lamp.id === state.selectedLampId) : false;
}

async function fetchLamps() {
  const { data, error } = await supabase
    .from('lamps')
    .select('id, title, comments, latitude, longitude, user_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const lamps = (data ?? []).map(normalizeLamp);
  const ownerIds = [...new Set(lamps.map((lamp) => lamp.user_id).filter(Boolean))];

  if (ownerIds.length === 0) {
    return lamps;
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, role')
    .in('id', ownerIds);

  if (profileError) {
    throw profileError;
  }

  const profilesById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

  return lamps.map((lamp) => ({
    ...lamp,
    owner: profilesById.get(lamp.user_id) ?? null,
  }));
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
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
    const [lamps, profile] = await Promise.all([
      fetchLamps(),
      session?.user?.id ? fetchProfile(session.user.id) : Promise.resolve(null),
    ]);

    const selectedLampId = state.selectedLampId && lamps.some((lamp) => lamp.id === state.selectedLampId) ? state.selectedLampId : null;
    const editingLampId = state.editingLampId && lamps.some((lamp) => lamp.id === state.editingLampId) ? state.editingLampId : null;

    setState({
      initialized: true,
      loading: false,
      session: session ?? null,
      profile,
      lamps,
      selectedLampId,
      draftLocation: state.draftLocation,
      editingLampId,
      authModalOpen: state.authModalOpen,
      authMode: state.authMode,
      authMessage: state.authMessage,
      lampFormError: state.lampFormError,
      dashboardView: state.dashboardView,
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

function subscribeToLampChannel() {
  if (lampChannel) {
    return;
  }

  lampChannel = supabase
    .channel('public:lamps')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lamps' }, () => {
      void refreshLampData();
    })
    .subscribe();
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

    subscribeToLampChannel();
    await syncSession(data.session ?? null);

    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session ?? null);
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

export function canManageLamp(lamp) {
  if (!state.session?.user) {
    return false;
  }

  return lamp.user_id === state.session.user.id || isAdmin();
}

export function getSelectedLamp() {
  return state.lamps.find((lamp) => lamp.id === state.selectedLampId) ?? null;
}

export function openAuthModal(mode = 'login') {
  setState({ authModalOpen: true, authMode: mode, authMessage: '', lampFormError: '' });
}

export function closeAuthModal() {
  setState({ authModalOpen: false, authMessage: '', authMode: 'login' });
}

export function setAuthMode(mode) {
  setState({ authMode: mode, authMessage: '', lampFormError: '' });
}

export function setDashboardView(view) {
  setState({ dashboardView: view });
}

export function setSelectedLampId(lampId) {
  setState({ selectedLampId: lampId, lampFormError: '', authMessage: '' });
}

export function selectLamp(lampId) {
  setSelectedLampId(lampId);
}

export function openCreateLampForm(latitude, longitude) {
  setState({
    editingLampId: null,
    draftLocation: {
      latitude: Number(latitude),
      longitude: Number(longitude),
    },
    lampFormError: '',
    selectedLampId: null,
    awaitingCoordinates: false,
  });
}

export function startLampCoordinatePick() {
  setState({
    awaitingCoordinates: true,
    draftLocation: null,
    editingLampId: null,
    lampFormError: '',
  });
}

export function stopLampCoordinatePick() {
  setState({ awaitingCoordinates: false });
}

export function openEditLampForm(lampId) {
  setState({
    editingLampId: lampId,
    draftLocation: null,
    lampFormError: '',
    selectedLampId: lampId,
  });
}

export function closeLampForm() {
  setState({ editingLampId: null, draftLocation: null, lampFormError: '' });
}

export function clearSelection() {
  setState({ selectedLampId: null });
}

export async function refreshLampData() {
  try {
    const lamps = await fetchLamps();
    const selectedLampId = state.selectedLampId && lamps.some((lamp) => lamp.id === state.selectedLampId) ? state.selectedLampId : null;
    const editingLampId = state.editingLampId && lamps.some((lamp) => lamp.id === state.editingLampId) ? state.editingLampId : null;

    setState({
      lamps,
      selectedLampId,
      editingLampId,
      loading: false,
    });
  } catch (error) {
    setState({
      loading: false,
      error: error instanceof Error ? error.message : 'Unable to refresh lamp data.',
    });
  }
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setState({ authMessage: error.message });
    return { error: error.message, session: null };
  }

  setState({ authMessage: '', authModalOpen: false });
  await syncSession(data.session ?? null);
  return { error: '', session: data.session ?? null };
}

export async function register({ email, password, username }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) {
    setState({ authMessage: error.message });
    return { error: error.message, session: null };
  }

  const successMessage = data.session
    ? ''
    : 'Registration submitted. Check your email if confirmation is enabled.';

  setState({ authMessage: successMessage, authModalOpen: !data.session });
  await syncSession(data.session ?? null);
  return { error: '', session: data.session ?? null };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setState({ authMessage: error.message });
    return { error: error.message };
  }

  setState({
    selectedLampId: null,
    draftLocation: null,
    editingLampId: null,
    authModalOpen: false,
    authMessage: '',
    lampFormError: '',
  });

  await syncSession(null);
  return { error: '' };
}

export async function saveLamp({ id, title, comments, latitude, longitude }) {
  if (!state.session?.user?.id) {
    return { error: 'Sign in to add or update lamps.' };
  }

  const payload = {
    title: title.trim(),
    comments: comments.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  if (!payload.title || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
    return { error: 'Title, latitude, and longitude are required.' };
  }

  const query = id
    ? supabase.from('lamps').update(payload).eq('id', id).select('id').single()
    : supabase.from('lamps').insert({ ...payload, user_id: state.session.user.id }).select('id').single();

  const { data, error } = await query;

  if (error) {
    setState({ lampFormError: error.message });
    return { error: error.message };
  }

  setState({ lampFormError: '', selectedLampId: data?.id ?? id ?? state.selectedLampId });
  await refreshLampData();
  closeLampForm();
  return { error: '' };
}

export async function removeLamp(lampId) {
  if (!state.session?.user?.id) {
    return { error: 'Sign in to delete lamps.' };
  }

  const { error } = await supabase.from('lamps').delete().eq('id', lampId);

  if (error) {
    return { error: error.message };
  }

  if (state.selectedLampId === lampId) {
    clearSelection();
  }

  if (state.editingLampId === lampId) {
    closeLampForm();
  }

  await refreshLampData();
  return { error: '' };
}

export async function signOut() {
  return logout();
}

export async function signIn(email, password) {
  return login(email, password);
}

export async function signUp({ username, email, password }) {
  return register({ username, email, password });
}

export async function reloadAppData() {
  await refreshLampData();
}

export function destroyAppState() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  if (lampChannel) {
    void supabase.removeChannel(lampChannel);
    lampChannel = null;
  }

  initializePromise = null;
}
