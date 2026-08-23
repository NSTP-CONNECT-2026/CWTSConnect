/**
 * CWTSConnect — Community Official Attendance & Service Hours Logging Controller
 */

(function () {
  'use strict';

  let deployments = [];
  let currentStudents = [];
  let currentSessions = [];
  let currentDeploymentId = null;

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initDatePickers();
    loadDeployments();

    // Event listeners
    const attDepSelect = document.getElementById('attDeploymentSelect');
    if (attDepSelect) {
      attDepSelect.addEventListener('change', function () {
        currentDeploymentId = this.value;
        if (currentDeploymentId) {
          loadStudentsForDeployment(currentDeploymentId);
          loadAttendanceHistory(currentDeploymentId);
          loadSessionsForVerification(currentDeploymentId);
        }
      });
    }

    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    if (markAllPresentBtn) {
      markAllPresentBtn.addEventListener('click', markAllPresent);
    }

    const saveBatchBtn = document.getElementById('saveAttendanceBatchBtn');
    if (saveBatchBtn) {
      saveBatchBtn.addEventListener('click', saveAttendanceBatch);
    }

    const refreshHistoryBtn = document.getElementById('refreshAttHistoryBtn');
    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', function () {
        loadAttendanceHistory(currentDeploymentId);
      });
    }

    const verifyAllHoursBtn = document.getElementById('verifyAllHoursBtn');
    if (verifyAllHoursBtn) {
      verifyAllHoursBtn.addEventListener('click', creditAllHours);
    }
  });

  // Tab switcher
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetTabId = this.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        this.classList.add('active');
        const panel = document.getElementById(targetTabId);
        if (panel) panel.classList.add('active');

        if (targetTabId === 'tabHours' && currentDeploymentId) {
          loadSessionsForVerification(currentDeploymentId);
        }
      });
    });
  }

  function initDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const attDate = document.getElementById('attDatePicker');
    if (attDate) attDate.value = today;
  }

  function showLoading() {
    const skeleton = document.getElementById('attendanceSkeleton');
    const content = document.getElementById('attendanceContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('attendanceSkeleton');
    const content = document.getElementById('attendanceContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadDeployments() {
    showLoading();
    try {
      const res = await fetch('/api/community/deployments');
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        deployments = result.data;
        populateDeploymentDropdown(deployments);

        if (deployments.length > 0) {
          currentDeploymentId = deployments[0].deployment_id;
          const attDepSelect = document.getElementById('attDeploymentSelect');
          if (attDepSelect) attDepSelect.value = currentDeploymentId;

          await Promise.all([
            loadStudentsForDeployment(currentDeploymentId),
            loadAttendanceHistory(currentDeploymentId),
            loadSessionsForVerification(currentDeploymentId)
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      hideLoading();
    }
  }

  function populateDeploymentDropdown(deps) {
    const attSelect = document.getElementById('attDeploymentSelect');
    if (!attSelect) return;

    if (deps.length === 0) {
      attSelect.innerHTML = '<option value="">No deployments available</option>';
      return;
    }

    attSelect.innerHTML = deps.map(d => {
      const label = `${d.deployment_batch_name} — ${d.activity_title || 'Project'}`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');
  }

  async function loadStudentsForDeployment(deploymentId) {
    const rosterTbody = document.getElementById('attRosterTableBody');

    if (rosterTbody) {
      rosterTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading students...</td></tr>';
    }

    try {
      const res = await fetch(`/api/community/deployments/${deploymentId}`);
      const result = await res.json();

      if (result.success && result.data) {
        currentStudents = result.data.students || [];
        renderAttendanceRoster(currentStudents);
      } else {
        renderEmptyRoster();
      }
    } catch (err) {
      console.error('Error loading students:', err);
      renderEmptyRoster();
    }
  }

  function renderAttendanceRoster(students) {
    const tbody = document.getElementById('attRosterTableBody');
    if (!tbody) return;

    if (!students || students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No students assigned to this deployment.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map((s, idx) => {
      return `
        <tr data-student-id="${s.student_user_id}">
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(s.full_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(s.course)} • Sec ${escapeHtml(s.section)}</div>
          </td>
          <td>
            <input type="time" class="time-input-sm att-time-in" value="08:00" />
          </td>
          <td>
            <input type="time" class="time-input-sm att-time-out" value="12:00" />
          </td>
          <td>
            <input type="number" class="hours-input-sm att-hours" step="0.5" min="0" max="12" value="4.0" />
          </td>
          <td>
            <input type="text" class="control-input att-remarks" style="height: 32px; font-size: 0.8125rem; width: 100%;" placeholder="e.g. Participated actively in community task" />
          </td>
        </tr>
      `;
    }).join('');
  }

  function markAllPresent() {
    document.querySelectorAll('#attRosterTableBody tr').forEach(row => {
      const hoursInput = row.querySelector('.att-hours');
      const inInput = row.querySelector('.att-time-in');
      const outInput = row.querySelector('.att-time-out');

      if (hoursInput) hoursInput.value = '4.0';
      if (inInput) inInput.value = '08:00';
      if (outInput) outInput.value = '12:00';
    });
    showToast('Reset all time entries to 08:00–12:00 (4.0 hrs). Click "Save Attendance Logs" to commit.', 'info');
  }

  async function saveAttendanceBatch() {
    const saveBtn = document.getElementById('saveAttendanceBatchBtn');
    const dateInput = document.getElementById('attDatePicker');
    const attendanceDate = dateInput ? dateInput.value : '';

    if (!currentDeploymentId || !attendanceDate) {
      showToast('Please select a deployment and valid activity date.', 'error');
      return;
    }

    const rows = document.querySelectorAll('#attRosterTableBody tr');
    if (rows.length === 0) {
      showToast('No student records to save.', 'error');
      return;
    }

    const records = [];
    rows.forEach(row => {
      const studentId = row.getAttribute('data-student-id');
      if (!studentId) return;

      const timeIn = row.querySelector('.att-time-in')?.value ? `${row.querySelector('.att-time-in').value}:00` : null;
      const timeOut = row.querySelector('.att-time-out')?.value ? `${row.querySelector('.att-time-out').value}:00` : null;
      const hours = Number(row.querySelector('.att-hours')?.value || 0);
      const remarks = row.querySelector('.att-remarks')?.value || '';

      records.push({
        student_user_id: studentId,
        status: hours > 0 ? 'present' : 'absent',
        check_in_time: timeIn,
        check_out_time: timeOut,
        hours_rendered: hours,
        remarks
      });
    });

    try {
      if (saveBtn) saveBtn.disabled = true;
      showToast('Saving attendance records...', 'info');

      const res = await fetch('/api/community/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_id: currentDeploymentId,
          attendance_date: attendanceDate,
          records
        })
      });

      const result = await res.json();

      if (result.success) {
        showToast(`Attendance saved successfully for ${result.savedCount} student(s)!`, 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadAttendanceHistory(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to save attendance records.', 'error');
      }
    } catch (err) {
      console.error('Save attendance error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function loadAttendanceHistory(deploymentId) {
    const tbody = document.getElementById('attHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading logs...</td></tr>';

    try {
      let url = '/api/community/attendance/history';
      if (deploymentId) url += `?deployment_id=${deploymentId}`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        renderAttendanceHistory(result.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No attendance records logged yet.</td></tr>';
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Failed to load history.</td></tr>';
    }
  }

  function renderAttendanceHistory(records) {
    const tbody = document.getElementById('attHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = records.map(r => {
      return `
        <tr>
          <td style="font-weight: 700; color: var(--cwts-primary-dark);">${escapeHtml(r.attendance_date)}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${escapeHtml(r.student_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(r.course)} • Sec ${escapeHtml(r.section)}</div>
          </td>
          <td style="font-size: 0.8125rem;">${escapeHtml(r.check_in_time || '---')}</td>
          <td style="font-size: 0.8125rem;">${escapeHtml(r.check_out_time || '---')}</td>
          <td style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem;">${Number(r.hours_rendered || 0).toFixed(1)} hrs</td>
          <td style="color: var(--text-muted); font-size: 0.8125rem;">${escapeHtml(r.student_remarks || r.nstp_remarks || '---')}</td>
        </tr>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // TAB 2: SERVICE HOURS CREDITING FUNCTIONS
  // --------------------------------------------------------------------------

  async function loadSessionsForVerification(deploymentId) {
    const tbody = document.getElementById('verifySessionsTableBody');
    if (!tbody) return;

    if (!deploymentId) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Please select a deployment in Tab 1 to view sessions.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading duty sessions for service hours crediting...</td></tr>';

    try {
      const res = await fetch(`/api/community/hours/sessions?deployment_id=${deploymentId}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        currentSessions = result.data;
        renderVerifySessionsTable(currentSessions);
      } else {
        currentSessions = [];
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No attendance sessions recorded yet for this deployment. Log attendance in Tab 1 first.</td></tr>';
      }
    } catch (err) {
      console.error('Failed to load verification sessions:', err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Failed to load sessions.</td></tr>';
    }
  }

  function renderVerifySessionsTable(sessions) {
    const tbody = document.getElementById('verifySessionsTableBody');
    if (!tbody) return;

    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No duty sessions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map(s => {
      const isVerified = s.is_verified;

      return `
        <tr data-attendance-id="${s.attendance_id}">
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${escapeHtml(s.student_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(s.student_number)} • ${escapeHtml(s.course)} (Sec ${escapeHtml(s.section)})</div>
          </td>
          <td>
            <span class="badge" style="background:#F1F5F9; color:#334155; font-family: monospace; font-size: 0.8125rem;">${escapeHtml(s.check_in_time || '---')}</span>
          </td>
          <td>
            <span class="badge" style="background:#F1F5F9; color:#334155; font-family: monospace; font-size: 0.8125rem;">${escapeHtml(s.check_out_time || '---')}</span>
          </td>
          <td>
            <input type="number" step="0.5" min="0" max="12" class="hours-input-sm verify-hours-input" value="${Number(s.hours_rendered || 4.0).toFixed(1)}" style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem;" />
          </td>
          <td>
            <button type="button" class="btn btn-primary btn-sm credit-single-row-btn" data-attendance-id="${s.attendance_id}" style="padding: 6px 12px; font-size: 0.75rem;">
              <span>${isVerified ? 'Update Credit' : 'Credit Hours'}</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button listeners
    document.querySelectorAll('.credit-single-row-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const attId = this.getAttribute('data-attendance-id');
        const row = this.closest('tr');
        const hoursInput = row.querySelector('.verify-hours-input');
        const hours = Number(hoursInput?.value || 0);

        await creditSingleSession(attId, hours, this);
      });
    });
  }

  async function creditSingleSession(attendanceId, hours, btnEl) {
    if (!attendanceId) return;

    try {
      if (btnEl) btnEl.disabled = true;
      showToast('Crediting hours to student...', 'info');

      const res = await fetch('/api/community/hours/verify-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{
            attendance_id: attendanceId,
            hours_rendered: hours,
            remarks: 'Verified & credited by Community Official'
          }]
        })
      });

      const result = await res.json();

      if (result.success) {
        showToast('Successfully credited service hours!', 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to credit service hours.', 'error');
      }
    } catch (err) {
      console.error('Credit error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (btnEl) btnEl.disabled = false;
    }
  }

  async function creditAllHours() {
    const verifyAllBtn = document.getElementById('verifyAllHoursBtn');
    const rows = document.querySelectorAll('#verifySessionsTableBody tr');

    if (rows.length === 0) {
      showToast('No sessions available to credit.', 'error');
      return;
    }

    const records = [];
    rows.forEach(row => {
      const attId = row.getAttribute('data-attendance-id');
      if (!attId) return;

      const hoursInput = row.querySelector('.verify-hours-input');
      const hours = Number(hoursInput?.value || 0);

      records.push({
        attendance_id: attId,
        hours_rendered: hours,
        remarks: 'Batch credited by Community Official'
      });
    });

    try {
      if (verifyAllBtn) verifyAllBtn.disabled = true;
      showToast('Crediting all student hours...', 'info');

      const res = await fetch('/api/community/hours/verify-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });

      const result = await res.json();

      if (result.success) {
        showToast(`Successfully credited ${result.creditedCount} session(s)!`, 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to credit hours.', 'error');
      }
    } catch (err) {
      console.error('Credit all error:', err);
      showToast('Error connecting to server.', 'error');
    } finally {
      if (verifyAllBtn) verifyAllBtn.disabled = false;
    }
  }

  function renderEmptyRoster() {
    const tbody = document.getElementById('attRosterTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No assigned students found for this deployment.</td></tr>';
    }
  }

  function showToast(message, type) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    if (type === 'success') {
      toast.style.background = '#ECFDF5';
      toast.style.color = '#065F46';
      toast.style.border = '1px solid #A7F3D0';
    } else if (type === 'error') {
      toast.style.background = '#FEF2F2';
      toast.style.color = '#991B1B';
      toast.style.border = '1px solid #FECACA';
    } else {
      toast.style.background = '#EFF6FF';
      toast.style.color = '#1E40AF';
      toast.style.border = '1px solid #BFDBFE';
    }

    setTimeout(() => {
      toast.style.display = 'none';
    }, 5000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
