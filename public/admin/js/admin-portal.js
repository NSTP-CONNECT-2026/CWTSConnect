/**
 * NSTPConnect - System Administrator Portal Client Controller
 * Powers:
 * - Module 1: Account Management & Helpdesk (User lookup, email correction, password reset)
 * - Module 2: Audit Logs & Traceability (Filter, search & CSV export)
 * - Module 3: System Health Diagnostics & Technical Error Monitoring
 */

(function () {
  'use strict';

  // Extract and persist admin key if provided in URL or sessionStorage (for remote/deployment access)
  const urlParams = new URLSearchParams(window.location.search);
  const urlKey = urlParams.get('key') || urlParams.get('admin_key');
  if (urlKey) {
    try { sessionStorage.setItem('cwts_admin_key', urlKey); } catch (e) {}
  }
  const storedKey = (function() {
    try { return sessionStorage.getItem('cwts_admin_key') || ''; } catch (e) { return ''; }
  })();
  const effectiveKey = urlKey || storedKey;

  // Unified fetch helper that automatically includes credentials & admin header
  async function adminFetch(url, options = {}) {
    options.credentials = options.credentials || 'include';
    options.headers = options.headers || {};
    if (effectiveKey) {
      if (options.headers instanceof Headers) {
        options.headers.set('x-admin-key', effectiveKey);
      } else {
        options.headers['x-admin-key'] = effectiveKey;
      }
    }
    return fetch(url, options);
  }

  // State Management
  let currentTab = 'accounts';
  
  // Users state
  let usersPage = 1;
  let usersTotalPages = 1;
  let userSearchDebounceTimer = null;
  let activeEditingUserId = null;
  let activeResetUserId = null;

  // Audit state
  let auditPage = 1;
  let auditTotalPages = 1;
  let auditSearchDebounceTimer = null;

  // DOM Elements
  const tabBtnAccounts = document.getElementById('tabBtnAccounts');
  const tabBtnAudit = document.getElementById('tabBtnAudit');
  const tabBtnHealth = document.getElementById('tabBtnHealth');
  const panelAccounts = document.getElementById('panelAccounts');
  const panelAudit = document.getElementById('panelAudit');
  const panelHealth = document.getElementById('panelHealth');

  // Users DOM
  const usersTableBody = document.getElementById('usersTableBody');
  const userSearchInput = document.getElementById('userSearchInput');
  const userRoleFilter = document.getElementById('userRoleFilter');
  const userStatusFilter = document.getElementById('userStatusFilter');
  const userTotalCountLabel = document.getElementById('userTotalCountLabel');
  const userPaginationInfo = document.getElementById('userPaginationInfo');
  const btnPrevUsersPage = document.getElementById('btnPrevUsersPage');
  const btnNextUsersPage = document.getElementById('btnNextUsersPage');

  // Edit Email Modal DOM
  const modalEditEmail = document.getElementById('modalEditEmail');
  const editEmailUserName = document.getElementById('editEmailUserName');
  const editEmailUserMeta = document.getElementById('editEmailUserMeta');
  const editEmailCurrent = document.getElementById('editEmailCurrent');
  const editEmailNew = document.getElementById('editEmailNew');
  const btnSaveEmailUpdate = document.getElementById('btnSaveEmailUpdate');

  // Reset Password Modal DOM
  const modalResetPassword = document.getElementById('modalResetPassword');
  const resetPasswordUserName = document.getElementById('resetPasswordUserName');
  const resetPasswordUserEmail = document.getElementById('resetPasswordUserEmail');
  const resetPasswordInput = document.getElementById('resetPasswordInput');
  const btnConfirmPasswordReset = document.getElementById('btnConfirmPasswordReset');

  // Create Coordinator Modal DOM
  const modalCreateCoord = document.getElementById('modalCreateCoord');
  const btnOpenCreateCoordModal = document.getElementById('btnOpenCreateCoordModal');
  const createCoordEmail = document.getElementById('createCoordEmail');
  const createCoordName = document.getElementById('createCoordName');
  const createCoordPassword = document.getElementById('createCoordPassword');
  const btnSubmitCreateCoord = document.getElementById('btnSubmitCreateCoord');

  // Audit DOM
  const auditTableBody = document.getElementById('auditTableBody');
  const auditSearchInput = document.getElementById('auditSearchInput');
  const auditRoleFilter = document.getElementById('auditRoleFilter');
  const auditActionFilter = document.getElementById('auditActionFilter');
  const auditTotalLogsMetric = document.getElementById('auditTotalLogsMetric');
  const auditTodayLogsMetric = document.getElementById('auditTodayLogsMetric');
  const auditCoordinatorsActiveMetric = document.getElementById('auditCoordinatorsActiveMetric');
  const auditPaginationInfo = document.getElementById('auditPaginationInfo');
  const btnPrevAuditPage = document.getElementById('btnPrevAuditPage');
  const btnNextAuditPage = document.getElementById('btnNextAuditPage');
  const btnExportAuditCsv = document.getElementById('btnExportAuditCsv');

  // Health DOM
  const dbStatusPill = document.getElementById('dbStatusPill');
  const dbLatencyMetric = document.getElementById('dbLatencyMetric');
  const dbMessageSubtext = document.getElementById('dbMessageSubtext');
  const cardHealthDb = document.getElementById('cardHealthDb');
  const storageStatusPill = document.getElementById('storageStatusPill');
  const storageNameMetric = document.getElementById('storageNameMetric');
  const storageSubtext = document.getElementById('storageSubtext');
  const cardHealthStorage = document.getElementById('cardHealthStorage');
  const serverUptimePill = document.getElementById('serverUptimePill');
  const serverUptimeMetric = document.getElementById('serverUptimeMetric');
  const serverMemorySubtext = document.getElementById('serverMemorySubtext');
  const systemTotalUsersMetric = document.getElementById('systemTotalUsersMetric');
  const systemUsersBreakdownSubtext = document.getElementById('systemUsersBreakdownSubtext');
  const errorLogsTableBody = document.getElementById('errorLogsTableBody');
  const btnPingServicesNow = document.getElementById('btnPingServicesNow');
  const btnGlobalRefresh = document.getElementById('btnGlobalRefresh');

  // Initialize
  init();

  function init() {
    setupTabSwitching();
    setupAccountsModule();
    setupAuditModule();
    setupHealthModule();

    // Initial load
    loadUsers();
    loadAuditSummary();

    if (btnGlobalRefresh) {
      btnGlobalRefresh.addEventListener('click', () => {
        refreshCurrentTab();
        showToast('Data refreshed.', 'info');
      });
    }
  }

  // --------------------------------------------------------------------------
  // TAB NAVIGATION
  // --------------------------------------------------------------------------
  function setupTabSwitching() {
    window.switchAdminTab = function (tab) {
      currentTab = tab;
      
      tabBtnAccounts.classList.toggle('active', tab === 'accounts');
      tabBtnAudit.classList.toggle('active', tab === 'audit');
      tabBtnHealth.classList.toggle('active', tab === 'health');

      panelAccounts.classList.toggle('active', tab === 'accounts');
      panelAudit.classList.toggle('active', tab === 'audit');
      panelHealth.classList.toggle('active', tab === 'health');

      refreshCurrentTab();
    };
  }

  function refreshCurrentTab() {
    if (currentTab === 'accounts') {
      loadUsers();
    } else if (currentTab === 'audit') {
      loadAuditLogs();
      loadAuditSummary();
    } else if (currentTab === 'health') {
      loadHealthDiagnostics();
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 1: USER ACCOUNT MANAGEMENT & HELPDESK
  // --------------------------------------------------------------------------
  function setupAccountsModule() {
    if (userSearchInput) {
      userSearchInput.addEventListener('input', () => {
        clearTimeout(userSearchDebounceTimer);
        userSearchDebounceTimer = setTimeout(() => {
          usersPage = 1;
          loadUsers();
        }, 300);
      });
    }

    if (userRoleFilter) {
      userRoleFilter.addEventListener('change', () => {
        usersPage = 1;
        loadUsers();
      });
    }

    if (userStatusFilter) {
      userStatusFilter.addEventListener('change', () => {
        usersPage = 1;
        loadUsers();
      });
    }

    if (btnPrevUsersPage) {
      btnPrevUsersPage.addEventListener('click', () => {
        if (usersPage > 1) {
          usersPage--;
          loadUsers();
        }
      });
    }

    if (btnNextUsersPage) {
      btnNextUsersPage.addEventListener('click', () => {
        if (usersPage < usersTotalPages) {
          usersPage++;
          loadUsers();
        }
      });
    }

    // Edit email modal events
    if (btnSaveEmailUpdate) {
      btnSaveEmailUpdate.addEventListener('click', handleSaveEmailUpdate);
    }

    // Reset password modal events
    if (btnConfirmPasswordReset) {
      btnConfirmPasswordReset.addEventListener('click', handleConfirmPasswordReset);
    }

    // Create coordinator modal events
    if (btnOpenCreateCoordModal) {
      btnOpenCreateCoordModal.addEventListener('click', () => {
        if (createCoordEmail) createCoordEmail.value = '';
        if (createCoordName) createCoordName.value = '';
        if (createCoordPassword) createCoordPassword.value = 'Lspu2026!Coord';
        window.openModal('modalCreateCoord');
      });
    }

    if (btnSubmitCreateCoord) {
      btnSubmitCreateCoord.addEventListener('click', handleCreateCoordinator);
    }
  }

  async function loadUsers() {
    if (!usersTableBody) return;

    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
          Loading user records...
        </td>
      </tr>
    `;

    try {
      const search = (userSearchInput?.value || '').trim();
      const role = userRoleFilter?.value || 'all';
      const status = userStatusFilter?.value || 'all';

      const url = `/api/admin/users?role=${encodeURIComponent(role)}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&page=${usersPage}&limit=15`;
      const res = await adminFetch(url);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to load users.');
      }

      const { users, total, page, totalPages, limit } = json.data;
      usersTotalPages = totalPages || 1;

      if (userTotalCountLabel) {
        userTotalCountLabel.textContent = `${total} Total Accounts Found`;
      }

      if (userPaginationInfo) {
        const start = total === 0 ? 0 : (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        userPaginationInfo.textContent = `Showing ${start}-${end} of ${total} accounts`;
      }

      if (btnPrevUsersPage) btnPrevUsersPage.disabled = page <= 1;
      if (btnNextUsersPage) btnNextUsersPage.disabled = page >= totalPages;

      if (!users || users.length === 0) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
              No accounts match the current filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      usersTableBody.innerHTML = users.map(u => {
        const roleClass = u.role || 'student';
        const roleLabel = u.role === 'nstp_official' ? 'Coordinator' : (u.role === 'community_official' ? 'Community Partner' : 'Student');
        const statusClass = u.account_status || 'active';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--admin-text-main); font-size: 0.9375rem;">${escapeHtml(u.display_name)}</div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                <span class="badge-role ${roleClass}">${roleLabel}</span>
                ${u.student_number && u.student_number !== 'N/A' ? `<span style="font-size: 0.75rem; color: var(--admin-text-muted); font-family: monospace; font-weight: 600;">#${escapeHtml(u.student_number)}</span>` : ''}
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 0.84rem; font-weight: 600; color: var(--admin-text-main);">${escapeHtml(u.email)}</span>
                <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" style="padding: 2px 6px;" title="Correct email typo" onclick="window.adminOpenEditEmail('${escapeHtml(u.user_id)}', '${escapeHtml(u.display_name)}', '${escapeHtml(u.student_number)}', '${escapeHtml(u.email)}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </td>
            <td>
              <div style="font-size: 0.84rem; color: var(--admin-text-main); font-weight: 500;">${escapeHtml(u.course_info)}</div>
              ${u.contact_number && u.contact_number !== 'N/A' ? `<div style="font-size: 0.75rem; color: var(--admin-text-muted); margin-top: 2px;">Tel: ${escapeHtml(u.contact_number)}</div>` : ''}
            </td>
            <td>
              <div style="font-size: 0.84rem; color: var(--admin-text-muted);">${escapeHtml(u.location_info)}</div>
            </td>
            <td>
              <span class="badge-status ${statusClass}">${capitalize(statusClass)}</span>
            </td>
            <td style="text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                
                <!-- Reset Password -->
                <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" title="Reset password" onclick="window.adminOpenResetPassword('${escapeHtml(u.user_id)}', '${escapeHtml(u.display_name)}', '${escapeHtml(u.email)}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Reset</span>
                </button>

                <!-- Status Toggle -->
                <select class="admin-select" style="padding: 4px 8px; font-size: 0.78rem;" onchange="window.adminToggleStatus('${escapeHtml(u.user_id)}', this.value)">
                  <option value="active" ${u.account_status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="inactive" ${u.account_status === 'inactive' ? 'selected' : ''}>Inactive</option>
                  <option value="suspended" ${u.account_status === 'suspended' ? 'selected' : ''}>Suspended</option>
                </select>

              </div>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--admin-danger);">
            Error loading user accounts: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  window.adminOpenEditEmail = function (userId, name, studentNum, currentEmail) {
    activeEditingUserId = userId;
    if (editEmailUserName) editEmailUserName.textContent = name || 'User';
    if (editEmailUserMeta) editEmailUserMeta.textContent = studentNum && studentNum !== 'N/A' ? `Student No: #${studentNum}` : 'Account ID: ' + userId;
    if (editEmailCurrent) editEmailCurrent.value = currentEmail;
    if (editEmailNew) {
      editEmailNew.value = currentEmail;
      setTimeout(() => editEmailNew.focus(), 100);
    }
    window.openModal('modalEditEmail');
  };

  async function handleSaveEmailUpdate() {
    if (!activeEditingUserId) return;
    const newEmail = (editEmailNew?.value || '').trim();

    if (!newEmail || !newEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      btnSaveEmailUpdate.disabled = true;
      btnSaveEmailUpdate.textContent = 'Saving...';

      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(activeEditingUserId)}/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to update email.');
      }

      showToast(data.message || 'Email successfully updated!', 'success');
      window.closeModal('modalEditEmail');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSaveEmailUpdate.disabled = false;
      btnSaveEmailUpdate.textContent = 'Save Corrected Email';
    }
  }

  window.adminOpenResetPassword = function (userId, name, email) {
    activeResetUserId = userId;
    if (resetPasswordUserName) resetPasswordUserName.textContent = name || 'User';
    if (resetPasswordUserEmail) resetPasswordUserEmail.textContent = email;
    if (resetPasswordInput) resetPasswordInput.value = 'Lspu2026!Temp';
    window.openModal('modalResetPassword');
  };

  async function handleConfirmPasswordReset() {
    if (!activeResetUserId) return;
    const pwd = (resetPasswordInput?.value || '').trim() || 'Lspu2026!Temp';

    try {
      btnConfirmPasswordReset.disabled = true;
      btnConfirmPasswordReset.textContent = 'Resetting...';

      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(activeResetUserId)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      showToast(`Password reset! Temporary password is "${data.temporaryPassword || pwd}".`, 'success');
      window.closeModal('modalResetPassword');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnConfirmPasswordReset.disabled = false;
      btnConfirmPasswordReset.textContent = 'Confirm Password Reset';
    }
  }

  window.adminToggleStatus = async function (userId, newStatus) {
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Account status updated to ${newStatus}.`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
      loadUsers();
    }
  };

  async function handleCreateCoordinator() {
    const email = (createCoordEmail?.value || '').trim();
    const name = (createCoordName?.value || '').trim();
    const pwd = (createCoordPassword?.value || '').trim() || 'Lspu2026!Coord';

    if (!email || !email.includes('@')) {
      showToast('Please enter a valid coordinator email.', 'error');
      return;
    }

    try {
      btnSubmitCreateCoord.disabled = true;
      btnSubmitCreateCoord.textContent = 'Creating...';

      const res = await adminFetch('/api/admin/coordinators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, password: pwd })
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message);

      showToast(`Coordinator account created! Temporary password: ${data.temporaryPassword}`, 'success');
      window.closeModal('modalCreateCoord');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmitCreateCoord.disabled = false;
      btnSubmitCreateCoord.textContent = 'Create Coordinator Account';
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 2: AUDIT LOGS & TRACEABILITY
  // --------------------------------------------------------------------------
  function setupAuditModule() {
    if (auditSearchInput) {
      auditSearchInput.addEventListener('input', () => {
        clearTimeout(auditSearchDebounceTimer);
        auditSearchDebounceTimer = setTimeout(() => {
          auditPage = 1;
          loadAuditLogs();
        }, 300);
      });
    }

    if (auditRoleFilter) {
      auditRoleFilter.addEventListener('change', () => {
        auditPage = 1;
        loadAuditLogs();
      });
    }

    if (auditActionFilter) {
      auditActionFilter.addEventListener('change', () => {
        auditPage = 1;
        loadAuditLogs();
      });
    }

    if (btnPrevAuditPage) {
      btnPrevAuditPage.addEventListener('click', () => {
        if (auditPage > 1) {
          auditPage--;
          loadAuditLogs();
        }
      });
    }

    if (btnNextAuditPage) {
      btnNextAuditPage.addEventListener('click', () => {
        if (auditPage < auditTotalPages) {
          auditPage++;
          loadAuditLogs();
        }
      });
    }

    if (btnExportAuditCsv) {
      btnExportAuditCsv.addEventListener('click', () => {
        const role = auditRoleFilter?.value || 'all';
        const action = auditActionFilter?.value || 'all';
        const search = (auditSearchInput?.value || '').trim();
        window.location.href = `/api/admin/audit-export?role=${encodeURIComponent(role)}&actionType=${encodeURIComponent(action)}&search=${encodeURIComponent(search)}${effectiveKey ? `&key=${encodeURIComponent(effectiveKey)}` : ''}`;
      });
    }
  }

  async function loadAuditLogs() {
    if (!auditTableBody) return;

    auditTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
          Loading audit trails...
        </td>
      </tr>
    `;

    try {
      const search = (auditSearchInput?.value || '').trim();
      const role = auditRoleFilter?.value || 'all';
      const action = auditActionFilter?.value || 'all';

      const url = `/api/admin/audit-logs?role=${encodeURIComponent(role)}&actionType=${encodeURIComponent(action)}&search=${encodeURIComponent(search)}&page=${auditPage}&limit=20`;
      const res = await adminFetch(url);
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      const { logs, total, page, totalPages, limit } = json.data;
      auditTotalPages = totalPages || 1;

      if (auditPaginationInfo) {
        const start = total === 0 ? 0 : (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        auditPaginationInfo.textContent = `Showing ${start}-${end} of ${total} events`;
      }

      if (btnPrevAuditPage) btnPrevAuditPage.disabled = page <= 1;
      if (btnNextAuditPage) btnNextAuditPage.disabled = page >= totalPages;

      if (!logs || logs.length === 0) {
        auditTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
              No audit logs recorded for this criteria.
            </td>
          </tr>
        `;
        return;
      }

      auditTableBody.innerHTML = logs.map(l => {
        const dateObj = new Date(l.created_at);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return `
          <tr>
            <td>
              <div style="font-weight: 600; color: var(--admin-text-main); font-size: 0.8125rem;">${dateStr}</div>
              <div style="font-size: 0.72rem; color: var(--admin-text-muted); font-family: monospace;">${timeStr}</div>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--admin-text-main); font-size: 0.875rem;">${escapeHtml(l.actor_name)}</div>
              <span class="badge-role ${l.actor_role}">${escapeHtml(l.actor_role)}</span>
            </td>
            <td>
              <span style="font-size: 0.75rem; font-family: monospace; font-weight: 700; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; color: var(--admin-primary);">
                ${escapeHtml(l.action_type)}
              </span>
            </td>
            <td>
              <div style="font-weight: 600; font-size: 0.84rem; color: var(--admin-text-main);">${escapeHtml(l.target_name)}</div>
              ${l.target_id && l.target_id !== 'N/A' ? `<div style="font-size: 0.72rem; color: var(--admin-text-muted); font-family: monospace;">ID: ${escapeHtml(l.target_id.slice(0, 18))}...</div>` : ''}
            </td>
            <td>
              <div style="font-size: 0.8125rem; color: var(--admin-text-main); line-height: 1.4;">${escapeHtml(l.description)}</div>
            </td>
            <td>
              <span style="font-family: monospace; font-size: 0.75rem; color: var(--admin-text-muted);">${escapeHtml(l.ip_address)}</span>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--admin-danger);">
            Error loading audit logs: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  async function loadAuditSummary() {
    try {
      const res = await adminFetch('/api/admin/audit-summary');
      const json = await res.json();
      if (!json.success) return;

      const { totalLogs, logsToday, coordinatorsActive } = json.data;
      if (auditTotalLogsMetric) auditTotalLogsMetric.textContent = totalLogs || 0;
      if (auditTodayLogsMetric) auditTodayLogsMetric.textContent = logsToday || 0;
      if (auditCoordinatorsActiveMetric) auditCoordinatorsActiveMetric.textContent = coordinatorsActive || 0;
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // MODULE 3: SYSTEM HEALTH & TECHNICAL STATUS
  // --------------------------------------------------------------------------
  function setupHealthModule() {
    if (btnPingServicesNow) {
      btnPingServicesNow.addEventListener('click', async () => {
        btnPingServicesNow.disabled = true;
        btnPingServicesNow.innerHTML = `
          <svg class="pulse-dot" style="display:inline-block; margin-right:4px;"></svg>
          <span>Pinging Services...</span>
        `;
        await loadHealthDiagnostics();
        btnPingServicesNow.disabled = false;
        btnPingServicesNow.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Ping All Services Now</span>
        `;
        showToast('All service pings completed.', 'info');
      });
    }
  }

  async function loadHealthDiagnostics() {
    try {
      const [healthRes, errorRes] = await Promise.all([
        adminFetch('/api/admin/health'),
        adminFetch('/api/admin/errors')
      ]);

      const healthJson = await healthRes.json();
      const errorJson = await errorRes.json();

      if (healthJson.success) {
        renderHealthMetrics(healthJson.data);
      }

      if (errorJson.success) {
        renderErrorLogs(errorJson.data);
      }
    } catch (err) {
      showToast('Diagnostics fetch error: ' + err.message, 'error');
    }
  }

  function renderHealthMetrics(h) {
    // Database
    if (dbStatusPill && dbLatencyMetric && dbMessageSubtext) {
      dbStatusPill.className = `health-status-pill ${h.database.status}`;
      dbStatusPill.textContent = capitalize(h.database.status);
      cardHealthDb.className = `health-stat-card ${h.database.status}`;
      dbLatencyMetric.textContent = h.database.latencyMs >= 0 ? `${h.database.latencyMs} ms` : 'Offline';
      dbMessageSubtext.textContent = h.database.message || 'PostgreSQL Connection';
    }

    // Cloudinary Storage
    if (storageStatusPill && storageNameMetric && storageSubtext) {
      storageStatusPill.className = `health-status-pill ${h.storage.status}`;
      storageStatusPill.textContent = capitalize(h.storage.status);
      cardHealthStorage.className = `health-stat-card ${h.storage.status}`;
      storageNameMetric.textContent = h.storage.cloudName !== 'Not configured' ? h.storage.cloudName : 'Offline';
      storageSubtext.textContent = 'Cloudinary CDN Asset Storage';
    }

    // Express Server
    if (serverUptimeMetric && serverMemorySubtext) {
      serverUptimeMetric.textContent = h.server.uptimeFormatted;
      serverMemorySubtext.textContent = `Heap Used: ${h.server.memory.heapUsedMb} MB / RSS: ${h.server.memory.rssMb} MB`;
    }

    // Record Counts
    if (systemTotalUsersMetric && systemUsersBreakdownSubtext) {
      const m = h.systemMetrics;
      systemTotalUsersMetric.textContent = m.users.total;
      systemUsersBreakdownSubtext.textContent = `${m.users.students} Students • ${m.users.coordinators} Coordinators • ${m.users.partners} Partners`;
    }
  }

  function renderErrorLogs(errData) {
    if (!errorLogsTableBody) return;
    const errors = errData.errors || [];

    if (errors.length === 0) {
      errorLogsTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--admin-text-muted);">
            No technical errors detected. System is running cleanly.
          </td>
        </tr>
      `;
      return;
    }

    errorLogsTableBody.innerHTML = errors.map(e => `
      <tr>
        <td style="font-size: 0.78rem; font-family: monospace; color: var(--admin-text-muted);">${new Date(e.timestamp).toLocaleTimeString()}</td>
        <td><span style="font-size: 0.75rem; font-weight: 700; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px;">${escapeHtml(e.context)}</span></td>
        <td style="font-size: 0.8125rem; font-family: monospace; color: var(--admin-danger);">${escapeHtml(e.message)}</td>
        <td><span class="badge-status suspended">Logged</span></td>
      </tr>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // MODAL & TOAST UTILITIES
  // --------------------------------------------------------------------------
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  function showToast(message, type = 'info') {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

})();
