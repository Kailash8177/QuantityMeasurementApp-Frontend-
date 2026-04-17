// ── API Configuration ──────────────────────────────────────────────
const API_BASE = 'http://localhost:5062/api/v1';

// ── Token Manager ──────────────────────────────────────────────────
class TokenManager {
  static get()        { return localStorage.getItem('jwt_token'); }
  static set(token)   { localStorage.setItem('jwt_token', token); }
  static remove()     { localStorage.removeItem('jwt_token'); }
  static getUser()    { return JSON.parse(localStorage.getItem('user_info') || 'null'); }
  static setUser(u)   { localStorage.setItem('user_info', JSON.stringify(u)); }
  static removeUser() { localStorage.removeItem('user_info'); }
  static isLoggedIn() { return !!this.get(); }
  static isAdmin()    { const u = this.getUser(); return u && (u.role === 'Admin' || u.role === 'ADMIN'); }
}

// ── Headers ────────────────────────────────────────────────────────
const authHeaders   = () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${TokenManager.get()}`
});
const publicHeaders = () => ({ 'Content-Type': 'application/json' });

// ── Generic Fetch Wrapper ──────────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, { credentials: 'include', ...options });
    const data     = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.Message || data.error || 'Request failed');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Auth API  (UC18: POST /api/v1/auth/*) ──────────────────────────
const AuthAPI = {
  // POST /api/v1/auth/register
  // Body: { firstName, lastName, username, email, password, role? }
  register: (firstName, lastName, username, email, password, role = 'User') =>
    apiFetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: publicHeaders(),
      body: JSON.stringify({ firstName, lastName, username, email, password, role })
    }),

  // POST /api/v1/auth/login
  // Body: { username, password }  (UC18 uses username-based login)
  login: (username, password) =>
    apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: publicHeaders(),
      body: JSON.stringify({ username, password })
    }),

  // POST /api/v1/auth/logout  (requires Bearer token)
  logout: (refreshToken) =>
    apiFetch(`${API_BASE}/auth/logout`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ refreshToken })
    }),

  // POST /api/v1/auth/refresh-token
  refreshToken: (refreshToken) =>
    apiFetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST', headers: publicHeaders(),
      body: JSON.stringify({ refreshToken })
    }),

  // GET /api/v1/auth/profile  (requires Bearer token)
  profile: () =>
    apiFetch(`${API_BASE}/auth/profile`, { method: 'GET', headers: authHeaders() }),

  // GET /api/v1/auth/status  (public)
  status: () =>
    apiFetch(`${API_BASE}/auth/status`, { method: 'GET', headers: publicHeaders() })
};

// ── Quantity API  (UC18: POST /api/v1/quantities/*, GET history) ───
//  Request body always:
//    { thisQuantityDTO: {value, unit, measurementType},
//      thatQuantityDTO: {value, unit, measurementType} }
const QuantityAPI = {
  buildQ: (value, unit, measurementType) => ({
    value:           parseFloat(value),
    unit:            unit,
    measurementType: measurementType
  }),

  // POST /api/v1/quantities/compare
  compare: (q1, q2) =>
    apiFetch(`${API_BASE}/quantities/compare`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ thisQuantityDTO: q1, thatQuantityDTO: q2 })
    }),

  // POST /api/v1/quantities/convert
  // thatQuantityDTO.unit = target unit; value/measurementType can be dummy
  convert: (q, targetUnit) =>
    apiFetch(`${API_BASE}/quantities/convert`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        thisQuantityDTO: q,
        thatQuantityDTO: { value: 0, unit: targetUnit, measurementType: q.measurementType }
      })
    }),

  // POST /api/v1/quantities/add?targetUnit=UNIT
  add: (q1, q2, targetUnit) =>
    apiFetch(`${API_BASE}/quantities/add?targetUnit=${encodeURIComponent(targetUnit)}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ thisQuantityDTO: q1, thatQuantityDTO: q2 })
    }),

  // POST /api/v1/quantities/subtract?targetUnit=UNIT
  subtract: (q1, q2, targetUnit) =>
    apiFetch(`${API_BASE}/quantities/subtract?targetUnit=${encodeURIComponent(targetUnit)}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ thisQuantityDTO: q1, thatQuantityDTO: q2 })
    }),

  // POST /api/v1/quantities/divide
  divide: (q1, q2) =>
    apiFetch(`${API_BASE}/quantities/divide`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ thisQuantityDTO: q1, thatQuantityDTO: q2 })
    }),

  // GET /api/v1/quantities/history/operation/{operation}
  getByOperation: (op) =>
    apiFetch(`${API_BASE}/quantities/history/operation/${op}`, {
      method: 'GET', headers: authHeaders()
    }),

  // GET /api/v1/quantities/history/type/{measurementType}
  getByType: (t) =>
    apiFetch(`${API_BASE}/quantities/history/type/${t}`, {
      method: 'GET', headers: authHeaders()
    }),

  // GET /api/v1/quantities/count/{operation}
  getCountByOperation: (op) =>
    apiFetch(`${API_BASE}/quantities/count/${op}`, {
      method: 'GET', headers: authHeaders()
    }),

  // GET /api/v1/quantities/history/errored
  getErroredHistory: () =>
    apiFetch(`${API_BASE}/quantities/history/errored`, {
      method: 'GET', headers: authHeaders()
    })
};

// ── Admin API  (UC18: /api/v1/admin/* — Role=Admin required) ───────
const AdminAPI = {
  // GET /api/v1/admin/users
  getUsers: () =>
    apiFetch(`${API_BASE}/admin/users`, { method: 'GET', headers: authHeaders() }),

  // GET /api/v1/admin/statistics
  getStatistics: () =>
    apiFetch(`${API_BASE}/admin/statistics`, { method: 'GET', headers: authHeaders() }),

  // PUT /api/v1/admin/users/{id}/role  Body: { role }
  updateRole: (id, role) =>
    apiFetch(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ role })
    }),

  // PUT /api/v1/admin/users/{id}/deactivate
  deactivate: (id) =>
    apiFetch(`${API_BASE}/admin/users/${id}/deactivate`, {
      method: 'PUT', headers: authHeaders()
    }),

  // PUT /api/v1/admin/users/{id}/activate
  activate: (id) =>
    apiFetch(`${API_BASE}/admin/users/${id}/activate`, {
      method: 'PUT', headers: authHeaders()
    })
};

// ── Unit Definitions ───────────────────────────────────────────────
const UNITS = {
  LENGTH:      ['Feet', 'Inches', 'Yards', 'Centimeters'],
  WEIGHT:      ['Kilogram', 'Gram', 'Pound'],
  VOLUME:      ['Litre', 'Millilitre', 'Gallon'],
  TEMPERATURE: ['Celsius', 'Fahrenheit']
};

// ── UI Helpers ─────────────────────────────────────────────────────
const showAlert  = (el, msg, type = 'error') => {
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
};
const hideAlert  = (el) => { el.className = 'alert'; el.textContent = ''; };
const showResult = (el, html, type = 'success') => {
  el.className = `result-box show ${type === 'error' ? 'error-box' : ''}`;
  el.innerHTML = html;
};
const hideResult = (el) => { el.className = 'result-box'; el.innerHTML = ''; };

const populateSelect = (select, options) => {
  select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
};

const setLoading = (btn, spinner, loading) => {
  btn.disabled = loading;
  spinner.classList.toggle('show', loading);
  const textEl = btn.querySelector('.btn-text');
  if (textEl) textEl.textContent = loading ? 'Loading…' : btn.dataset.text;
};