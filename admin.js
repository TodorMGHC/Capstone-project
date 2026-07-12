import 'bootstrap/dist/css/bootstrap.min.css';
import { supabase } from './src/lib/supabase.js';
import { escapeHtml } from './src/utils/escape-html.js';

const appRoot = document.querySelector('#admin-app');

if (!appRoot) {
  throw new Error('Admin app root was not found.');
}

const state = {
  loading: true,
  error: '',
  message: '',
  session: null,
  profile: null,
  reports: [],
  users: [],
  activeTab: 'reports',
  editReportId: null,
  deleteReportId: null,
  createUserOpen: false,
  editUserId: null,
  deleteUserId: null,
  saving: false,
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-GB');
}

function reportById(reportId) {
  return state.reports.find((report) => report.id === reportId) ?? null;
}

function userById(userId) {
  return state.users.find((user) => user.id === userId) ?? null;
}

function roleOptions(selectedRole) {
  const roles = ['user', 'admin', 'visitor'];
  return roles
    .map((role) => `<option value="${role}" ${selectedRole === role ? 'selected' : ''}>${escapeHtml(role)}</option>`)
    .join('');
}

async function invokeEdgeFunction(functionName, payload) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    return { data: null, error: error.message || `Failed to call function ${functionName}.` };
  }

  if (data?.error) {
    return { data: null, error: data.error };
  }

  return { data, error: '' };
}

function renderNotice() {
  if (state.error) {
    return `<div class="notice error">${escapeHtml(state.error)}</div>`;
  }

  if (state.message) {
    return `<div class="notice">${escapeHtml(state.message)}</div>`;
  }

  return '';
}

function renderReportsTable() {
  if (!state.reports.length) {
    return '<p class="notice">No reports yet.</p>';
  }

  const rows = state.reports
    .map(
      (report) => `
        <tr>
          <td><strong>${escapeHtml(report.title)}</strong></td>
          <td>${escapeHtml(report.comments || '')}</td>
          <td>${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}</td>
          <td>${escapeHtml(report.owner_name || report.user_id)}</td>
          <td><small>${formatDate(report.created_at)}</small></td>
          <td>
            <div class="actions">
              <button type="button" class="btn-lite" data-report-action="edit" data-report-id="${report.id}">Edit</button>
              <button type="button" class="btn-lite btn-danger" data-report-action="delete" data-report-id="${report.id}">Delete</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Comments</th>
            <th>Coordinates</th>
            <th>Owner</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderUsersTable() {
  if (!state.users.length) {
    return `
      <div class="d-flex justify-content-end mb-2">
        <button type="button" class="btn btn-warning btn-sm" data-user-action="add" ${state.saving ? 'disabled' : ''}>Add</button>
      </div>
      <p class="notice">No users found.</p>
    `;
  }

  const rows = state.users
    .map((user) => {
      const isSelf = user.id === state.session?.user?.id;
      const editDisabledAttr = state.saving ? 'disabled' : '';
      const deleteDisabledAttr = state.saving || isSelf ? 'disabled' : '';
      const hint = isSelf ? ' (you)' : '';

      return `
        <tr>
          <td>${escapeHtml(user.username || '-')}</td>
          <td><small>${escapeHtml(user.id)}</small></td>
          <td>${escapeHtml(user.role || 'user')}${hint}</td>
          <td><small>${formatDate(user.created_at)}</small></td>
          <td>
            <div class="actions">
              <button type="button" class="btn-lite" data-user-action="edit" data-user-id="${user.id}" ${editDisabledAttr}>Edit</button>
              <button type="button" class="btn-lite btn-danger" data-user-action="delete" data-user-id="${user.id}" ${deleteDisabledAttr}>Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="d-flex justify-content-end mb-2">
      <button type="button" class="btn btn-warning btn-sm" data-user-action="add" ${state.saving ? 'disabled' : ''}>Add</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>User ID</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderEditPopup() {
  const report = reportById(state.editReportId);
  if (!report) {
    return '';
  }

  return `
    <div class="overlay" data-popup="edit-report">
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="report-edit-title">
        <h2 id="report-edit-title">Edit Report</h2>
        <form data-form="edit-report">
          <input type="hidden" name="id" value="${report.id}" />
          <label>
            Title
            <input name="title" value="${escapeHtml(report.title)}" required />
          </label>
          <label>
            Comments
            <textarea name="comments">${escapeHtml(report.comments || '')}</textarea>
          </label>
          <div class="grid">
            <label>
              Latitude
              <input name="latitude" type="number" step="0.000001" value="${Number(report.latitude).toFixed(6)}" required />
            </label>
            <label>
              Longitude
              <input name="longitude" type="number" step="0.000001" value="${Number(report.longitude).toFixed(6)}" required />
            </label>
          </div>
          <div class="popup-actions">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-popup-close>Cancel</button>
            <button type="submit" class="btn btn-warning btn-sm" ${state.saving ? 'disabled' : ''}>Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderDeletePopup() {
  const report = reportById(state.deleteReportId);
  if (!report) {
    return '';
  }

  return `
    <div class="overlay" data-popup="delete-report">
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="report-delete-title">
        <h2 id="report-delete-title">Delete Report</h2>
        <p>Delete report <strong>${escapeHtml(report.title)}</strong>?</p>
        <p class="muted">This action cannot be undone.</p>
        <div class="popup-actions">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-popup-close>Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" data-confirm-delete ${state.saving ? 'disabled' : ''}>Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderCreateUserPopup() {
  if (!state.createUserOpen) {
    return '';
  }

  return `
    <div class="overlay" data-popup="create-user">
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="user-create-title">
        <h2 id="user-create-title">Create User</h2>
        <form data-form="create-user">
          <label>
            Username
            <input name="username" required maxlength="60" />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minlength="6" required />
          </label>
          <label>
            Role
            <select name="role" required>
              ${roleOptions('user')}
            </select>
          </label>

          <div class="popup-actions">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-popup-close>Cancel</button>
            <button type="submit" class="btn btn-warning btn-sm" ${state.saving ? 'disabled' : ''}>Create</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditUserPopup() {
  const user = userById(state.editUserId);
  if (!user) {
    return '';
  }

  return `
    <div class="overlay" data-popup="edit-user">
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="user-edit-title">
        <h2 id="user-edit-title">Edit User</h2>
        <form data-form="edit-user">
          <input type="hidden" name="id" value="${escapeHtml(user.id)}" />
          <label>
            Username
            <input name="username" value="${escapeHtml(user.username || '')}" required maxlength="60" />
          </label>
          <label>
            Email (optional)
            <input name="email" type="email" placeholder="Leave blank to keep current email" />
          </label>
          <label>
            Password (optional)
            <input name="password" type="password" minlength="6" placeholder="Leave blank to keep current password" />
          </label>
          <label>
            Role
            <select name="role" required>
              ${roleOptions(user.role || 'user')}
            </select>
          </label>
          <p class="muted">User ID: ${escapeHtml(user.id)}</p>

          <div class="popup-actions">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-popup-close>Cancel</button>
            <button type="submit" class="btn btn-warning btn-sm" ${state.saving ? 'disabled' : ''}>Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderDeleteUserPopup() {
  const user = userById(state.deleteUserId);
  if (!user) {
    return '';
  }

  return `
    <div class="overlay" data-popup="delete-user">
      <div class="popup" role="dialog" aria-modal="true" aria-labelledby="user-delete-title">
        <h2 id="user-delete-title">Delete User</h2>
        <p>Delete user <strong>${escapeHtml(user.username || user.id)}</strong>?</p>
        <p class="muted">All reports created by this user will also be removed.</p>
        <div class="popup-actions">
          <button type="button" class="btn btn-outline-secondary btn-sm" data-popup-close>Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" data-confirm-user-delete ${state.saving ? 'disabled' : ''}>Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderAdminContent() {
  if (state.loading) {
    return '<main class="admin-main"><p>Loading admin panel...</p></main>';
  }

  if (!state.session) {
    return '<main class="admin-main"><div class="notice error">Sign in to access the admin panel.</div></main>';
  }

  if (state.profile?.role !== 'admin') {
    return '<main class="admin-main"><div class="notice error">Access denied. Only admins can open this page.</div></main>';
  }

  return `
    <main class="admin-main">
      ${renderNotice()}
      <div class="admin-tabs" role="tablist" aria-label="Admin tabs">
        <button type="button" class="admin-tab ${state.activeTab === 'reports' ? 'is-active' : ''}" data-admin-tab="reports">Reports Admin</button>
        <button type="button" class="admin-tab ${state.activeTab === 'users' ? 'is-active' : ''}" data-admin-tab="users">User Admin</button>
      </div>

      <section class="admin-panel ${state.activeTab === 'reports' ? 'is-active' : ''}" data-admin-panel="reports">
        ${renderReportsTable()}
      </section>

      <section class="admin-panel ${state.activeTab === 'users' ? 'is-active' : ''}" data-admin-panel="users">
        ${renderUsersTable()}
      </section>
    </main>
    ${renderEditPopup()}
    ${renderDeletePopup()}
    ${renderCreateUserPopup()}
    ${renderEditUserPopup()}
    ${renderDeleteUserPopup()}
  `;
}

function render() {
  appRoot.innerHTML = `
    <div class="admin-shell">
      <section class="admin-card">
        <header class="admin-head">
          <div>
            <h1>App Admin Panel</h1>
            <p>Manage reports and user roles.</p>
          </div>
          <div class="d-flex gap-2">
            <a href="/dashboard" class="btn btn-outline-dark btn-sm">Back to Dashboard</a>
            <button type="button" class="btn btn-dark btn-sm" data-admin-logout>Logout</button>
          </div>
        </header>
        ${renderAdminContent()}
      </section>
    </div>
  `;
}

function setState(partial) {
  Object.assign(state, partial);
  render();
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function loadReports() {
  const { data: reportRows, error: reportError } = await supabase
    .from('lamps')
    .select('id, title, comments, latitude, longitude, user_id, created_at')
    .order('created_at', { ascending: false });

  if (reportError) {
    throw reportError;
  }

  const ownerIds = [...new Set((reportRows ?? []).map((row) => row.user_id).filter(Boolean))];
  if (!ownerIds.length) {
    return reportRows ?? [];
  }

  const { data: owners, error: ownersError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ownerIds);

  if (ownersError) {
    throw ownersError;
  }

  const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner.username]));

  return (reportRows ?? []).map((row) => ({
    ...row,
    owner_name: ownersById.get(row.user_id) ?? '',
  }));
}

async function loadUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function refreshData() {
  if (!state.session || state.profile?.role !== 'admin') {
    return;
  }

  setState({ loading: true, error: '', message: '' });

  try {
    const [reports, users] = await Promise.all([loadReports(), loadUsers()]);
    setState({ reports, users, loading: false, error: '' });
  } catch (error) {
    setState({ loading: false, error: error instanceof Error ? error.message : 'Failed to load admin data.' });
  }
}

async function saveReport(formElement) {
  if (state.saving) {
    return;
  }

  const formData = new FormData(formElement);
  const id = String(formData.get('id') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const comments = String(formData.get('comments') || '').trim();
  const latitude = Number(formData.get('latitude'));
  const longitude = Number(formData.get('longitude'));

  if (!id || !title || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    setState({ error: 'Title, latitude, and longitude are required.' });
    return;
  }

  setState({ saving: true, error: '', message: '' });

  const { error } = await supabase
    .from('lamps')
    .update({ title, comments, latitude, longitude })
    .eq('id', id);

  if (error) {
    setState({ saving: false, error: error.message });
    return;
  }

  setState({ saving: false, editReportId: null, message: 'Report updated.' });
  await refreshData();
}

async function confirmDeleteReport() {
  if (!state.deleteReportId || state.saving) {
    return;
  }

  setState({ saving: true, error: '', message: '' });

  const { error } = await supabase.from('lamps').delete().eq('id', state.deleteReportId);

  if (error) {
    setState({ saving: false, error: error.message });
    return;
  }

  setState({ saving: false, deleteReportId: null, message: 'Report deleted.' });
  await refreshData();
}

async function createUser(formElement) {
  if (state.saving) {
    return;
  }

  const formData = new FormData(formElement);
  const username = String(formData.get('username') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'user').trim();

  if (!username || !email || !password || !role) {
    setState({ error: 'Username, email, password, and role are required.' });
    return;
  }

  setState({ saving: true, error: '', message: '' });

  const result = await invokeEdgeFunction('admin-user-create', {
    username,
    email,
    password,
    role,
  });

  if (result.error) {
    setState({ saving: false, error: result.error });
    return;
  }

  setState({ saving: false, createUserOpen: false, message: 'User created successfully.' });
  await refreshData();
}

async function saveUser(formElement) {
  if (state.saving) {
    return;
  }

  const formData = new FormData(formElement);
  const userId = String(formData.get('id') || '').trim();
  const username = String(formData.get('username') || '').trim();
  const emailRaw = String(formData.get('email') || '').trim();
  const passwordRaw = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'user').trim();
  const email = emailRaw || null;
  const password = passwordRaw || null;

  if (!userId || !username || !role) {
    setState({ error: 'User ID, username, and role are required.' });
    return;
  }

  setState({ saving: true, error: '', message: '' });

  const result = await invokeEdgeFunction('admin-user-update', {
    userId,
    username,
    role,
    email,
    password,
  });

  if (result.error) {
    setState({ saving: false, error: result.error });
    return;
  }

  setState({ saving: false, editUserId: null, message: 'User updated successfully.' });
  await refreshData();
}

async function confirmDeleteUser() {
  if (!state.deleteUserId || state.saving) {
    return;
  }

  setState({ saving: true, error: '', message: '' });

  const result = await invokeEdgeFunction('admin-user-delete', {
    userId: state.deleteUserId,
  });

  if (result.error) {
    setState({ saving: false, error: result.error });
    return;
  }

  setState({ saving: false, deleteUserId: null, message: 'User deleted successfully.' });
  await refreshData();
}

async function handleClick(event) {
  const tabButton = event.target.closest('[data-admin-tab]');
  if (tabButton) {
    setState({ activeTab: tabButton.dataset.adminTab, error: '', message: '' });
    return;
  }

  if (event.target.closest('[data-popup-close]')) {
    setState({
      editReportId: null,
      deleteReportId: null,
      createUserOpen: false,
      editUserId: null,
      deleteUserId: null,
      error: '',
      message: '',
    });
    return;
  }

  if (event.target.closest('[data-confirm-delete]')) {
    await confirmDeleteReport();
    return;
  }

  if (event.target.closest('[data-confirm-user-delete]')) {
    await confirmDeleteUser();
    return;
  }

  const reportActionButton = event.target.closest('[data-report-action]');
  if (reportActionButton) {
    const action = reportActionButton.dataset.reportAction;
    const reportId = reportActionButton.dataset.reportId;

    if (action === 'edit') {
      setState({ editReportId: reportId, deleteReportId: null, error: '', message: '' });
      return;
    }

    if (action === 'delete') {
      setState({ deleteReportId: reportId, editReportId: null, error: '', message: '' });
    }

    return;
  }

  const userActionButton = event.target.closest('[data-user-action]');
  if (userActionButton) {
    const action = userActionButton.dataset.userAction;
    const userId = userActionButton.dataset.userId;

    if (action === 'add') {
      setState({ createUserOpen: true, editUserId: null, deleteUserId: null, error: '', message: '' });
      return;
    }

    if (!userId) {
      return;
    }

    if (action === 'edit') {
      setState({ editUserId: userId, createUserOpen: false, deleteUserId: null, error: '', message: '' });
      return;
    }

    if (action === 'delete') {
      if (userId === state.session?.user?.id) {
        setState({ error: 'You cannot delete your own account from this panel.' });
        return;
      }

      setState({ deleteUserId: userId, createUserOpen: false, editUserId: null, error: '', message: '' });
      return;
    }

    return;
  }

  if (event.target.closest('[data-admin-logout]')) {
    await supabase.auth.signOut();
    location.href = '/';
  }
}

async function handleSubmit(event) {
  const formElement = event.target;
  if (!(formElement instanceof HTMLFormElement)) {
    return;
  }

  if (formElement.matches('[data-form="edit-report"]')) {
    event.preventDefault();
    await saveReport(formElement);
    return;
  }

  if (formElement.matches('[data-form="create-user"]')) {
    event.preventDefault();
    await createUser(formElement);
    return;
  }

  if (formElement.matches('[data-form="edit-user"]')) {
    event.preventDefault();
    await saveUser(formElement);
  }
}

async function init() {
  render();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setState({ loading: false, error: error.message });
    return;
  }

  const session = data.session ?? null;
  if (!session) {
    setState({ loading: false, error: 'Sign in to access the admin panel.' });
    return;
  }

  try {
    const profile = await loadProfile(session.user.id);
    setState({ session, profile });

    if (profile?.role !== 'admin') {
      setState({ loading: false, error: 'Access denied. Only admins can open this page.' });
      return;
    }

    await refreshData();
  } catch (profileError) {
    setState({ loading: false, error: profileError instanceof Error ? profileError.message : 'Unable to load profile.' });
  }
}

document.addEventListener('click', (event) => {
  void handleClick(event);
});

document.addEventListener('submit', (event) => {
  void handleSubmit(event);
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    location.href = '/';
  }
});

void init();
