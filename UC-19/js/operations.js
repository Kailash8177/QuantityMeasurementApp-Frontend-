/* operations.js — all quantity operations + history
   Guest users: can perform all operations (client-side calc)
                but History tab shows login prompt
   Logged-in:   full API + history saved to backend
*/
document.addEventListener('DOMContentLoaded', () => {

  const isLoggedIn = TokenManager.isLoggedIn();

  initNavbar();
  initTabs();
  initAllForms();

  // ── Navbar ─────────────────────────────────────────────────────
  function initNavbar() {
    const logoutBtn   = document.getElementById('logoutBtn');
    const loginNavBtn = document.getElementById('loginNavBtn');

    if (isLoggedIn) {
      const user    = TokenManager.getUser();
      const navUser = document.getElementById('navUser');
      const navRole = document.getElementById('navRole');
      if (navUser) navUser.textContent = user?.fullName || user?.email || 'User';
      if (navRole && user) {
        navRole.textContent = user.role;
        navRole.className   = 'badge badge-' + user.role.toLowerCase();
      }
      if (logoutBtn)   logoutBtn.style.display   = 'inline-flex';
      if (loginNavBtn) loginNavBtn.style.display  = 'none';

      const adminLink = document.getElementById('adminLink');
      if (adminLink) adminLink.style.display = TokenManager.isAdmin() ? 'inline-flex' : 'none';

      logoutBtn && logoutBtn.addEventListener('click', async () => {
        await AuthAPI.logout();
        TokenManager.remove();
        TokenManager.removeUser();
        window.location.href = 'index.html';
      });

    } else {
      const navUser = document.getElementById('navUser');
      const navRole = document.getElementById('navRole');
      if (navUser) navUser.textContent = 'Guest';
      if (navRole) { navRole.textContent = 'Guest'; navRole.className = 'badge badge-guest'; }
      if (logoutBtn)   logoutBtn.style.display   = 'none';
      if (loginNavBtn) loginNavBtn.style.display  = 'inline-flex';

      // Inject guest banner
      const tabContent = document.querySelector('.tab-content');
      if (tabContent) {
        const banner = document.createElement('div');
        banner.className = 'guest-banner';
        banner.innerHTML = 'INFO: You\'re using <strong>Guest Mode</strong> — results won\'t be saved. <a href="index.html">Login</a> to save history.';
        tabContent.insertBefore(banner, tabContent.firstChild);
      }
    }
  }

  // ── Tab Switching ───────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'historyPanel') loadHistory();
      });
    });
  }

  // ── Unit sync helper ────────────────────────────────────────────
  function syncUnits(typeId, unitIds) {
    var sel = document.getElementById(typeId);
    if (!sel) return;
    var update = function() {
      var units = UNITS[sel.value] || [];
      unitIds.forEach(function(id) {
        var u = document.getElementById(id);
        if (u) populateSelect(u, units);
      });
    };
    sel.addEventListener('change', update);
    update();
  }

  // ── Guest calculation engine ────────────────────────────────────
  var TO_BASE = {
    LENGTH:      { Feet: 30.48, Inches: 2.54, Yards: 91.44, Centimeters: 1 },
    WEIGHT:      { Kilogram: 1000, Gram: 1, Pound: 453.592 },
    VOLUME:      { Litre: 1000, Millilitre: 1, Gallon: 3785.41 }
  };

  function toBase(value, unit, type) {
    if (type === 'TEMPERATURE') {
      return unit === 'Celsius' ? value : (value - 32) * 5 / 9;
    }
    return value * ((TO_BASE[type] || {})[unit] || 1);
  }
  function fromBase(value, unit, type) {
    if (type === 'TEMPERATURE') {
      return unit === 'Celsius' ? value : value * 9 / 5 + 32;
    }
    return value / ((TO_BASE[type] || {})[unit] || 1);
  }
  function r6(n) { return parseFloat(parseFloat(n).toFixed(6)); }

  function guestCalc(op, q1, q2, targetUnit) {
    var type = q1.measurementType;
    var b1   = toBase(q1.value, q1.unit, type);
    var b2   = q2 ? toBase(q2.value, q2.unit, type) : 0;
    if (op === 'compare')  return { success: true, data: { resultString: Math.abs(b1 - b2) < 1e-9 ? 'true' : 'false' } };
    if (op === 'convert')  return { success: true, data: { resultValue: r6(fromBase(b1, q2.unit, type)), resultUnit: q2.unit } };
    if (op === 'add')      return { success: true, data: { resultValue: r6(fromBase(b1 + b2, targetUnit, type)), resultUnit: targetUnit } };
    if (op === 'subtract') return { success: true, data: { resultValue: r6(fromBase(b1 - b2, targetUnit, type)), resultUnit: targetUnit } };
    if (op === 'divide') {
      if (b2 === 0) return { success: false, error: 'Cannot divide by zero.' };
      return { success: true, data: { resultValue: r6(b1 / b2) } };
    }
    return { success: false, error: 'Unknown operation.' };
  }

  async function doCalc(op, q1, q2, targetUnit) {
    if (isLoggedIn) {
      if (op === 'compare')  return QuantityAPI.compare(q1, q2);
      if (op === 'convert')  return QuantityAPI.convert(q1, q2.unit);
      if (op === 'add')      return QuantityAPI.add(q1, q2, targetUnit);
      if (op === 'subtract') return QuantityAPI.subtract(q1, q2, targetUnit);
      if (op === 'divide')   return QuantityAPI.divide(q1, q2);
    }
    return guestCalc(op, q1, q2, targetUnit);
  }

  // ── Init all 5 operation forms ──────────────────────────────────
  function initAllForms() {

    // COMPARE
    syncUnits('compareType', ['compareUnit1', 'compareUnit2']);
    document.getElementById('compareForm') && document.getElementById('compareForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('compareAlert'), resultEl = document.getElementById('compareResult');
      hideAlert(alertEl); hideResult(resultEl);
      var type = document.getElementById('compareType').value;
      var val1 = document.getElementById('compareVal1').value;
      var val2 = document.getElementById('compareVal2').value;
      var u1   = document.getElementById('compareUnit1').value;
      var u2   = document.getElementById('compareUnit2').value;
      if (!val1 || !val2) return showAlert(alertEl, 'Both values are required.');
      var btn = e.target.querySelector('button[type=submit]'), sp = btn.querySelector('.spinner');
      setLoading(btn, sp, true);
      var res = await doCalc('compare', QuantityAPI.buildQ(val1, u1, type), QuantityAPI.buildQ(val2, u2, type));
      setLoading(btn, sp, false);
      if (res.success) {
        var isEq = res.data.resultString === 'true' || res.data.resultValue === 1;
        showResult(resultEl, '<div class="result-value">' + (isEq ? '✅ EQUAL' : '❌ NOT EQUAL') + '</div><div class="result-label">' + val1 + ' ' + u1 + ' ' + (isEq ? '==' : '!=') + ' ' + val2 + ' ' + u2 + '</div>');
      } else { showResult(resultEl, '<div class="err-msg">⚠ ' + res.error + '</div>', 'error'); }
    });

    // CONVERT
    syncUnits('convertType', ['convertFromUnit', 'convertToUnit']);
    document.getElementById('convertForm') && document.getElementById('convertForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('convertAlert'), resultEl = document.getElementById('convertResult');
      hideAlert(alertEl); hideResult(resultEl);
      var type = document.getElementById('convertType').value;
      var val  = document.getElementById('convertVal').value;
      var fromU = document.getElementById('convertFromUnit').value;
      var toU   = document.getElementById('convertToUnit').value;
      if (!val) return showAlert(alertEl, 'Value is required.');
      if (fromU === toU) return showAlert(alertEl, 'From and To units must differ.');
      var btn = e.target.querySelector('button[type=submit]'), sp = btn.querySelector('.spinner');
      setLoading(btn, sp, true);
      var res = await doCalc('convert', QuantityAPI.buildQ(val, fromU, type), { unit: toU, measurementType: type });
      setLoading(btn, sp, false);
      if (res.success) {
        showResult(resultEl, '<div class="result-value">' + res.data.resultValue + ' <span class="unit-label">' + res.data.resultUnit + '</span></div><div class="result-label">' + val + ' ' + fromU + ' → ' + toU + '</div>');
      } else { showResult(resultEl, '<div class="err-msg">⚠ ' + res.error + '</div>', 'error'); }
    });

    // ADD
    syncUnits('addType', ['addUnit1', 'addUnit2', 'addTargetUnit']);
    document.getElementById('addForm') && document.getElementById('addForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('addAlert'), resultEl = document.getElementById('addResult');
      hideAlert(alertEl); hideResult(resultEl);
      var type = document.getElementById('addType').value;
      var val1 = document.getElementById('addVal1').value, val2 = document.getElementById('addVal2').value;
      var u1 = document.getElementById('addUnit1').value, u2 = document.getElementById('addUnit2').value;
      var target = document.getElementById('addTargetUnit').value;
      if (!val1 || !val2) return showAlert(alertEl, 'Both values are required.');
      var btn = e.target.querySelector('button[type=submit]'), sp = btn.querySelector('.spinner');
      setLoading(btn, sp, true);
      var res = await doCalc('add', QuantityAPI.buildQ(val1, u1, type), QuantityAPI.buildQ(val2, u2, type), target);
      setLoading(btn, sp, false);
      if (res.success) {
        showResult(resultEl, '<div class="result-value">' + res.data.resultValue + ' <span class="unit-label">' + res.data.resultUnit + '</span></div><div class="result-label">' + val1 + ' ' + u1 + ' + ' + val2 + ' ' + u2 + '</div>');
      } else { showResult(resultEl, '<div class="err-msg">⚠ ' + res.error + '</div>', 'error'); }
    });

    // SUBTRACT
    syncUnits('subtractType', ['subtractUnit1', 'subtractUnit2', 'subtractTargetUnit']);
    document.getElementById('subtractForm') && document.getElementById('subtractForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('subtractAlert'), resultEl = document.getElementById('subtractResult');
      hideAlert(alertEl); hideResult(resultEl);
      var type = document.getElementById('subtractType').value;
      var val1 = document.getElementById('subtractVal1').value, val2 = document.getElementById('subtractVal2').value;
      var u1 = document.getElementById('subtractUnit1').value, u2 = document.getElementById('subtractUnit2').value;
      var target = document.getElementById('subtractTargetUnit').value;
      if (!val1 || !val2) return showAlert(alertEl, 'Both values are required.');
      var btn = e.target.querySelector('button[type=submit]'), sp = btn.querySelector('.spinner');
      setLoading(btn, sp, true);
      var res = await doCalc('subtract', QuantityAPI.buildQ(val1, u1, type), QuantityAPI.buildQ(val2, u2, type), target);
      setLoading(btn, sp, false);
      if (res.success) {
        showResult(resultEl, '<div class="result-value">' + res.data.resultValue + ' <span class="unit-label">' + res.data.resultUnit + '</span></div><div class="result-label">' + val1 + ' ' + u1 + ' − ' + val2 + ' ' + u2 + '</div>');
      } else { showResult(resultEl, '<div class="err-msg">⚠ ' + res.error + '</div>', 'error'); }
    });

    // DIVIDE
    syncUnits('divideType', ['divideUnit1', 'divideUnit2']);
    document.getElementById('divideForm') && document.getElementById('divideForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var alertEl = document.getElementById('divideAlert'), resultEl = document.getElementById('divideResult');
      hideAlert(alertEl); hideResult(resultEl);
      var type = document.getElementById('divideType').value;
      var val1 = document.getElementById('divideVal1').value, val2 = document.getElementById('divideVal2').value;
      var u1 = document.getElementById('divideUnit1').value, u2 = document.getElementById('divideUnit2').value;
      if (!val1 || !val2) return showAlert(alertEl, 'Both values are required.');
      if (parseFloat(val2) === 0) return showAlert(alertEl, 'Cannot divide by zero.');
      var btn = e.target.querySelector('button[type=submit]'), sp = btn.querySelector('.spinner');
      setLoading(btn, sp, true);
      var res = await doCalc('divide', QuantityAPI.buildQ(val1, u1, type), QuantityAPI.buildQ(val2, u2, type));
      setLoading(btn, sp, false);
      if (res.success) {
        showResult(resultEl, '<div class="result-value">' + parseFloat(res.data.resultValue).toFixed(6) + ' <small style="font-size:1rem;color:var(--text-muted)">(scalar)</small></div><div class="result-label">' + val1 + ' ' + u1 + ' ÷ ' + val2 + ' ' + u2 + '</div>');
      } else { showResult(resultEl, '<div class="err-msg">⚠ ' + res.error + '</div>', 'error'); }
    });
  }

  // ── History panel ───────────────────────────────────────────────
  async function loadHistory(op, type) {
    op   = op   || 'ALL';
    type = type || 'ALL';
    var tbody = document.getElementById('historyBody');
    if (!tbody) return;

    // Guest: replace panel content with login prompt
    if (!isLoggedIn) {
      var panel = document.getElementById('historyPanel');
      if (panel) {
        panel.innerHTML =
          '<div class="history-login-prompt">' +
          '<div class="lock-icon">🔒</div>' +
          '<h3>History requires login</h3>' +
          '<p>Your calculations are not saved in Guest Mode.<br>Login to save and view your operation history.</p>' +
          '<a href="index.html" class="btn btn-primary">🔑 Login / Register</a>' +
          '</div>';
      }
      return;
    }

    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><span class="spinner show"></span> Loading…</td></tr>';

    var res;
    if (op !== 'ALL')        res = await QuantityAPI.getByOperation(op);
    else if (type !== 'ALL') res = await QuantityAPI.getByType(type);
    else                     res = null;

    if (!res) {
      var ops  = ['compare','convert','add','subtract','divide'];
      var rows = [];
      for (var i = 0; i < ops.length; i++) {
        var r = await QuantityAPI.getByOperation(ops[i]);
        if (r.success && Array.isArray(r.data)) rows = rows.concat(r.data);
      }
      renderHistoryTable(rows);
      return;
    }
    renderHistoryTable(res.success ? res.data : []);
  }

  window.loadHistory = loadHistory;

  document.getElementById('filterOperation') && document.getElementById('filterOperation').addEventListener('change', async function(e) {
    var typeF = document.getElementById('filterType');
    if (typeF) typeF.value = 'ALL';
    await loadHistory(e.target.value, 'ALL');
  });

  document.getElementById('filterType') && document.getElementById('filterType').addEventListener('change', async function(e) {
    var opF = document.getElementById('filterOperation');
    if (opF) opF.value = 'ALL';
    await loadHistory('ALL', e.target.value);
  });

  document.getElementById('showErroredBtn') && document.getElementById('showErroredBtn').addEventListener('click', async function() {
    if (!isLoggedIn) return;
    var res = await QuantityAPI.getErroredHistory();
    renderHistoryTable(res.success ? res.data : []);
  });

  document.getElementById('refreshHistoryBtn') && document.getElementById('refreshHistoryBtn').addEventListener('click', function() { loadHistory(); });
});

// ── Render History Table ─────────────────────────────────────────
function renderHistoryTable(data) {
  var tbody = document.getElementById('historyBody');
  if (!tbody) return;
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No records found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(function(row) {
    var op      = (row.operation || '').toLowerCase();
    var thisVal = ((row.thisValue != null ? row.thisValue : (row.operand1Value != null ? row.operand1Value : '—')) + ' ' + (row.thisUnit || row.operand1Unit || '')).trim();
    var thatVal = row.thatValue != null ? (row.thatValue + ' ' + (row.thatUnit || '')).trim() : (row.operand2Value != null ? (row.operand2Value + ' ' + (row.operand2Unit || '')).trim() : '—');
    var result  = formatHistoryResult(row);
    var mtype   = row.thisMeasurementType || row.resultMeasurementType || row.operand1MeasurementType || '';
    var err     = row.error || row.hasError;
    return '<tr class="' + (err ? 'row-error' : '') + '"><td><span class="op-badge op-' + op + '">' + op.toUpperCase() + '</span></td><td>' + thisVal + '</td><td>' + thatVal + '</td><td>' + result + '</td><td><span class="type-badge">' + mtype + '</span></td><td class="muted-cell">' + (err ? '<span class="err-tag">Error</span>' : '') + (row.errorMessage ? '<abbr title="' + row.errorMessage + '">⚠</abbr>' : '') + '</td></tr>';
  }).join('');
}

function formatHistoryResult(row) {
  if (row.error || row.hasError) return '<span class="err-msg">⚠ ' + (row.errorMessage || 'Error') + '</span>';
  var op = (row.operation || '').toLowerCase();
  if (op === 'compare') return (row.resultString === 'true' || row.resultValue === 1) ? '✅ Equal' : '❌ Not Equal';
  if (op === 'divide')  return parseFloat(row.resultValue).toFixed(4) + ' <small>(scalar)</small>';
  return ((row.resultValue != null ? row.resultValue : '—') + ' ' + (row.resultUnit || '')).trim();
}
