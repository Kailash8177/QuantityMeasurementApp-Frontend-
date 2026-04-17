/* auth.js — handles login/register page */
document.addEventListener('DOMContentLoaded', () => {

  // Redirect if already logged in
  if (TokenManager.isLoggedIn()) {
    window.location.href = 'operations.html';
    return;
  }

  // ── Tab switching ─────────────────────────
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t  => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.form).classList.add('active');
    });
  });

  // ── Role selection ─────────────────────────
  let selectedRole = 'User';
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = btn.dataset.role;
    });
  });

  // ── LOGIN Form ─────────────────────────────
  const loginForm    = document.getElementById('loginForm');
  const loginAlert   = document.getElementById('loginAlert');
  const loginBtn     = document.getElementById('loginBtn');
  const loginSpinner = document.getElementById('loginSpinner');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);

    const username = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username) return showAlert(loginAlert, 'Username is required.');
    if (!password) return showAlert(loginAlert, 'Password is required.');

    setLoading(loginBtn, loginSpinner, true);

    try {
      const result = await AuthAPI.login(username, password);

      if (result.success) {
        const d = result.data;
        // UC18 AuthResponseDTO: { success, accessToken, refreshToken, expiresAt, user: { id, username, email, firstName, lastName, role, isActive } }
        TokenManager.set(d.accessToken);
        TokenManager.setUser({
          fullName: `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || d.user?.username || username,
          email:    d.user?.email    || '',
          role:     d.user?.role     || 'User',
          userId:   d.user?.id
        });
        window.location.href = 'operations.html';
      } else {
        showAlert(loginAlert, result.error || 'Invalid credentials.');
      }
    } catch (err) {
      showAlert(loginAlert, 'Network error. Make sure the backend is running.');
    } finally {
      setLoading(loginBtn, loginSpinner, false);
    }
  });

  // ── REGISTER Form ──────────────────────────
  const registerForm    = document.getElementById('registerForm');
  const registerAlert   = document.getElementById('registerAlert');
  const registerBtn     = document.getElementById('registerBtn');
  const registerSpinner = document.getElementById('registerSpinner');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(registerAlert);

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName  = document.getElementById('regLastName').value.trim();
    const username  = document.getElementById('regUsername').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const confirm   = document.getElementById('regConfirm').value;

    if (!firstName)           return showAlert(registerAlert, 'First name is required.');
    if (!lastName)            return showAlert(registerAlert, 'Last name is required.');
    if (!username)            return showAlert(registerAlert, 'Username is required.');
    if (!email || !email.includes('@')) return showAlert(registerAlert, 'Valid email is required.');
    if (password.length < 6)  return showAlert(registerAlert, 'Password must be at least 6 characters.');
    if (password !== confirm)  return showAlert(registerAlert, 'Passwords do not match.');

    setLoading(registerBtn, registerSpinner, true);

    try {
      const result = await AuthAPI.register(firstName, lastName, username, email, password, selectedRole);

      if (result.success) {
        const d = result.data;
        // UC18 AuthResponseDTO: { success, accessToken, user: { id, username, email, firstName, lastName, role } }
        TokenManager.set(d.accessToken);
        TokenManager.setUser({
          fullName: `${d.user?.firstName || firstName} ${d.user?.lastName || lastName}`.trim(),
          email:    d.user?.email || email,
          role:     d.user?.role  || 'User',
          userId:   d.user?.id
        });
        window.location.href = 'operations.html';
      } else {
        showAlert(registerAlert, result.error || 'Registration failed.');
      }
    } catch (err) {
      showAlert(registerAlert, 'Network error. Make sure the backend is running.');
    } finally {
      setLoading(registerBtn, registerSpinner, false);
    }
  });
});