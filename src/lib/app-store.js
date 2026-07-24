import { supabase } from './supabase.js';

const REPORT_IMAGES_BUCKET = 'lamp-report-images';
const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  suppressNextSelectedLampPopup: false,
  nextSelectedLampZoomLevel: null,
  nextSelectedLampFocus: null,
};

const listeners = new Set();
let authSubscription = null;
let lampChannel = null;
let initializePromise = null;

function buildEmailRedirectUrl() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const baseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  return new URL('login', baseUrl).toString();
}

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

  const coverImagePath = row.cover_image_path ?? '';
  const { data: publicUrlData } = coverImagePath
    ? supabase.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(coverImagePath)
    : { data: { publicUrl: '' } };

  return {
    id: row.id,
    title: row.title,
    comments: row.comments ?? '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cover_image_path: coverImagePath,
    cover_image_url: publicUrlData?.publicUrl ?? '',
    owner: row.profiles ?? null,
  };
}

function isValidImageFile(file) {
  return file && typeof file === 'object' && typeof file.size === 'number' && file.size > 0;
}

function sanitizeFileName(fileName) {
  const baseName = String(fileName || 'cover-image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-');

  return baseName || 'cover-image';
}

async function uploadCoverImage(userId, imageFile) {
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(imageFile.name)}`;
  const imagePath = `${userId}/${uniqueName}`;

  const { error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).upload(imagePath, imageFile, {
    upsert: false,
    cacheControl: '3600',
    contentType: imageFile.type || 'application/octet-stream',
  });

  if (error) {
    return { path: '', error: error.message };
  }

  return { path: imagePath, error: '' };
}

async function removeCoverImage(imagePath) {
  if (!imagePath) {
    return;
  }

  await supabase.storage.from(REPORT_IMAGES_BUCKET).remove([imagePath]);
}

function selectedLampExists() {
  return state.selectedLampId ? state.lamps.some((lamp) => lamp.id === state.selectedLampId) : false;
}

async function fetchLamps() {
  const { data, error } = await supabase
    .from('lamps')
    .select('id, title, comments, latitude, longitude, cover_image_path, user_id, created_at, updated_at')
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

export function suppressNextSelectedLampPopup() {
  state.suppressNextSelectedLampPopup = true;
}

export function consumeSelectedLampPopupSuppression() {
  const suppressed = Boolean(state.suppressNextSelectedLampPopup);
  state.suppressNextSelectedLampPopup = false;
  return suppressed;
}

export function setNextSelectedLampZoomLevel(zoomLevel) {
  const numericZoom = Number(zoomLevel);
  if (Number.isNaN(numericZoom)) {
    return;
  }

  state.nextSelectedLampZoomLevel = numericZoom;
}

export function setNextSelectedLampFocus({ latitude, longitude, zoom }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const zoomLevel = Number(zoom);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return;
  }

  state.nextSelectedLampFocus = {
    latitude: lat,
    longitude: lng,
    zoom: Number.isNaN(zoomLevel) ? null : zoomLevel,
  };
}

export function consumeNextSelectedLampFocus() {
  const focus = state.nextSelectedLampFocus;
  state.nextSelectedLampFocus = null;
  return focus;
}

export function consumeNextSelectedLampZoomLevel() {
  const zoomLevel = state.nextSelectedLampZoomLevel;
  state.nextSelectedLampZoomLevel = null;
  return typeof zoomLevel === 'number' ? zoomLevel : null;
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
  const emailRedirectTo = buildEmailRedirectUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
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

export async function saveLamp({ id, title, comments, latitude, longitude, coverImageFile, removeCoverImage: shouldRemoveCoverImage }) {
  if (!state.session?.user?.id) {
    return { error: 'Sign in to add or update lamps.' };
  }

  const editingLamp = id ? state.lamps.find((lamp) => lamp.id === id) ?? null : null;
  const existingCoverImagePath = editingLamp?.cover_image_path ?? '';

  if (isValidImageFile(coverImageFile)) {
    if (coverImageFile.size > MAX_COVER_IMAGE_BYTES) {
      return { error: 'Cover image must be 5 MB or smaller.' };
    }

    if (coverImageFile.type && !ALLOWED_IMAGE_TYPES.has(coverImageFile.type)) {
      return { error: 'Cover image must be JPG, PNG, WEBP, or GIF.' };
    }
  }

  const payload = {
    title: title.trim(),
    comments: comments.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    cover_image_path: existingCoverImagePath || null,
  };

  if (!payload.title || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
    return { error: 'Title, latitude, and longitude are required.' };
  }

  let uploadedCoverImagePath = '';

  if (isValidImageFile(coverImageFile)) {
    const uploadResult = await uploadCoverImage(state.session.user.id, coverImageFile);
    if (uploadResult.error) {
      setState({ lampFormError: uploadResult.error });
      return { error: uploadResult.error };
    }

    uploadedCoverImagePath = uploadResult.path;
    payload.cover_image_path = uploadedCoverImagePath;
  } else if (shouldRemoveCoverImage) {
    payload.cover_image_path = null;
  }

  const query = id
    ? supabase.from('lamps').update(payload).eq('id', id).select('id').single()
    : supabase.from('lamps').insert({ ...payload, user_id: state.session.user.id }).select('id').single();

  const { data, error } = await query;

  if (error) {
    if (uploadedCoverImagePath) {
      await removeCoverImage(uploadedCoverImagePath);
    }

    setState({ lampFormError: error.message });
    return { error: error.message };
  }

  const coverPathChanged = Boolean(id) && existingCoverImagePath !== (payload.cover_image_path || '');
  if (coverPathChanged && existingCoverImagePath) {
    await removeCoverImage(existingCoverImagePath);
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
