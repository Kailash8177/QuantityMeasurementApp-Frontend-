/* admin.js — Admin-only dashboard */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth + Role Guard ─────────────────────
  if (!TokenManager.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }
  if (!TokenManager.isAdmin()) {
    window.location.href = 'operations.html';
    return;
  }

  initNavbar();
  await loadStats();
  await loadUsers();

  // ── Navbar ────────────────────────────────
  function initNavbar() {
    const user = TokenManager.getUser();
    const navUser = document.getElementById('navUser');
    const navRole = document.getElementById('navRole');
    if (navUser) navUser.textContent = user?.fullName || 'Admin';
    if (navRole) { navRole.textContent = 'Admin'; navRole.className = 'badge badge-admin'; }

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await AuthAPI.logout();
      TokenManager.remove();
      TokenManager.removeUser();
      window.location.href = 'index.html';
    });
  }

  // ── Stats Cards ───────────────────────────
  async function loadStats() {
    const res = await AdminAPI.getStatistics();
    if (!res.success) return;
    const d = res.data;
    setText('statTotal',    d.TotalUsers    ?? 0);
    setText('statActive',   d.ActiveUsers   ?? 0);
    setText('statInactive', d.InactiveUsers ?? 0);
    setText('statAdmins',   d.AdminUsers    ?? 0);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Users Table ───────────────────────────
  async function loadUsers() {
    const tbody  = document.getElementById('usersBody');
    const alertEl = document.getElementById('adminAlert');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell"><span class="spinner show"></span> Loading users…</td></tr>`;

    const res = await AdminAPI.getUsers();
    if (!res.success) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Failed to load users.</td></tr>`;
      return;
    }

    const users = res.data;
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr id="user-row-${u.id}">
        <td>${u.id}</td>
        <td>
          <div class="user-cell">
            <span class="user-avatar">${(u.firstName?.[0] || u.username?.[0] || '?').toUpperCase()}</span>
            <div>
              <div class="user-name">${u.firstName || ''} ${u.lastName || ''}</div>
              <div class="user-username">@${u.username}</div>
            </div>
          </div>
        </td>
        <td class="muted-cell">${u.email}</td>
        <td><span class="badge badge-${(u.role || '').toLowerCase()}">${u.role}</span></td>
        <td>
          <span class="status-dot ${u.isActive ? 'active' : 'inactive'}"></span>
          ${u.isActive ? 'Active' : 'Inactive'}
        </td>
        <td class="muted-cell">${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-outline" onclick="toggleRole(${u.id}, '${u.role}')">
              ${u.role === 'Admin' ? '👤 Make User' : '🛡 Make Admin'}
            </button>
            <button class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}"
              onclick="toggleActive(${u.id}, ${u.isActive})">
              ${u.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ── Role toggle ───────────────────────────
  window.toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'Admin' ? 'User' : 'Admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    const res = await AdminAPI.updateRole(id, newRole);
    if (res.success) { await loadUsers(); await loadStats(); }
    else alert(res.error || 'Failed to update role.');
  };

  // ── Active toggle ─────────────────────────
  window.toggleActive = async (id, isActive) => {
    const action  = isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    const res = isActive ? await AdminAPI.deactivate(id) : await AdminAPI.activate(id);
    if (res.success) { await loadUsers(); await loadStats(); }
    else alert(res.error || 'Failed to update user.');
  };

  // ── Refresh button ────────────────────────
  document.getElementById('refreshUsersBtn')?.addEventListener('click', async () => {
    await loadStats();
    await loadUsers();
  });
});