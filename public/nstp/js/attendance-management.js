/**
 * CWTSConnect — NSTP Coordinator Attendance Monitoring Controller
 */

(function () {
  'use strict';

  let deployments = [];
  let currentDeploymentId = 'all';
  let currentMode = 'all_students'; // 'all_students' or 'batch_details'
  let attendanceRecords = [];

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupEventListeners();
    showLoading();
    try {
      await loadDeployments();
    } catch (err) {
      console.error('Error initializing attendance monitoring:', err);
      showToast('Failed to load deployments for attendance monitoring.', 'error');
    } finally {
      hideLoading();
    }
  }

  function setupEventListeners() {
    const deploymentSelect = document.getElementById('deploymentSelect');
    if (deploymentSelect) {
      deploymentSelect.addEventListener('change', function () {
        currentDeploymentId = this.value || 'all';
        loadAttendanceRecords(currentDeploymentId);
      });
    }

    const refreshBtn = document.getElementById('refreshAttendanceBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        loadAttendanceRecords(currentDeploymentId);
      });
    }

    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterRecords(this.value.trim().toLowerCase());
      });
    }
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
    try {
      const res = await fetch('/api/nstp/deployments');
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        deployments = result.data;
        populateDeploymentSelect(deployments);

        currentDeploymentId = 'all';
        const select = document.getElementById('deploymentSelect');
        if (select) select.value = 'all';

        await loadAttendanceRecords(currentDeploymentId);
      } else {
        renderNoDeployments();
      }
    } catch (err) {
      console.error('Error loading deployments:', err);
      renderNoDeployments();
    }
  }

  function populateDeploymentSelect(deps) {
    const select = document.getElementById('deploymentSelect');
    if (!select) return;

    const allOption = '<option value="all">All Deployment Batches (All Students)</option>';
    const options = deps.map(d => {
      const label = `${d.deployment_batch_name} - ${d.activity_title || d.community_name || 'Project'}`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    select.innerHTML = allOption + options;
  }

  async function loadAttendanceRecords(deploymentId) {
    const tbody = document.getElementById('attendanceTableBody');
    const thead = document.getElementById('attendanceTableHead');
    const titleEl = document.getElementById('attendanceTableTitle');

    currentMode = (!deploymentId || deploymentId === 'all') ? 'all_students' : 'batch_details';

    // Update Table Title and Headers
    if (currentMode === 'all_students') {
      if (titleEl) titleEl.textContent = 'All Students Attendance Overview';
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Student Name</th>
            <th style="width: 220px;">Student Course</th>
            <th style="width: 170px; text-align: center;">Total Deployment</th>
            <th style="width: 170px; text-align: center;">Total Attendance</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading students overview...</td></tr>';
      }
    } else {
      const selectedDep = deployments.find(d => d.deployment_id === deploymentId);
      const batchName = selectedDep ? selectedDep.deployment_batch_name : 'Deployment Batch';
      if (titleEl) titleEl.textContent = `${batchName} — Assigned Students Attendance`;
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Name</th>
            <th style="width: 220px;">Course</th>
            <th style="width: 150px;">Date</th>
            <th style="width: 130px;">Time In</th>
            <th style="width: 130px;">Time Out</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading batch attendance details...</td></tr>';
      }
    }

    try {
      const url = currentMode === 'batch_details' 
        ? `/api/attendance/deployment/${encodeURIComponent(deploymentId)}` 
        : '/api/attendance/deployment/all';
      const res = await fetch(url);
      const result = await res.json();

      if (result.success && Array.isArray(result.attendance)) {
        attendanceRecords = result.attendance;
        renderAttendanceTable(attendanceRecords);
        updateMetrics(attendanceRecords);
      } else {
        renderEmptyRecords();
      }
    } catch (err) {
      console.error('Error loading attendance logs:', err);
      renderEmptyRecords();
    }
  }

  function renderAttendanceTable(records) {
    const tbody = document.getElementById('attendanceTableBody');
    const badge = document.getElementById('recordsCountBadge');
    if (badge) badge.textContent = `${records.length} Student${records.length === 1 ? '' : 's'}`;

    if (!tbody) return;

    if (!records || records.length === 0) {
      renderEmptyRecords();
      return;
    }

    if (currentMode === 'all_students') {
      // Render Mode A: Student Name, Student Course, Total Deployment, Total Attendance
      tbody.innerHTML = records.map(r => {
        const studentName = r.student_name || 'Student Volunteer';
        const studentNumber = r.student_number || '---';
        const course = r.course || 'BSIT';
        const sec = r.section ? `Sec ${r.section}` : '';
        const yr = r.year_level ? `(Yr ${r.year_level})` : '';
        const courseStr = `${course} ${sec} ${yr}`.trim();
        const totalDeps = r.total_deployments || 0;
        const totalAtt = r.total_attendance || 0;

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(studentName)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(studentNumber)}</div>
            </td>
            <td>
              <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(courseStr)}</div>
            </td>
            <td style="text-align: center;">
              <span class="badge ${totalDeps > 0 ? 'badge-verified' : 'badge-pending'}" style="font-weight: 700; font-size: 0.875rem; padding: 6px 12px;">
                ${totalDeps} Deployment${totalDeps === 1 ? '' : 's'}
              </span>
            </td>
            <td style="text-align: center;">
              <span class="badge ${totalAtt > 0 ? 'badge-verified' : 'badge-pending'}" style="font-weight: 700; font-size: 0.875rem; padding: 6px 12px;">
                ${totalAtt} Session${totalAtt === 1 ? '' : 's'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

    } else {
      // Render Mode B: Name, Course, Date, Time In, Time Out
      tbody.innerHTML = records.map(r => {
        const studentName = r.student_name || 'Student Volunteer';
        const studentNumber = r.student_number || '---';
        const course = r.course || 'BSIT';
        const sec = r.section ? `Sec ${r.section}` : '';
        const yr = r.year_level ? `(Yr ${r.year_level})` : '';
        const courseStr = `${course} ${sec} ${yr}`.trim();

        const dateStr = r.attendance_date || '---';
        const timeIn = r.check_in_time ? r.check_in_time.substring(0, 5) : '---';
        const timeOut = r.check_out_time ? r.check_out_time.substring(0, 5) : '---';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(studentName)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(studentNumber)}</div>
            </td>
            <td>
              <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(courseStr)}</div>
            </td>
            <td style="font-size: 0.875rem; font-weight: 500;">${escapeHtml(dateStr)}</td>
            <td>
              <span style="font-weight: 700; font-size: 0.875rem; color: ${timeIn !== '---' ? 'var(--cwts-primary-dark, #0B3D2E)' : 'var(--text-muted)'};">
                ${escapeHtml(timeIn)}
              </span>
            </td>
            <td>
              <span style="font-weight: 700; font-size: 0.875rem; color: ${timeOut !== '---' ? 'var(--cwts-primary-dark, #0B3D2E)' : 'var(--text-muted)'};">
                ${escapeHtml(timeOut)}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  function updateMetrics(records) {
    if (currentMode === 'all_students') {
      const studentsWithDeployments = records.filter(r => (r.total_deployments || 0) > 0);
      const studentsWithAttendance = records.filter(r => (r.total_attendance || 0) > 0);

      setElText('statPresentToday', studentsWithAttendance.length);
      setElText('statActiveOnDuty', studentsWithDeployments.length);
      setElText('statTotalLogs', records.length);
    } else {
      const timedIn = records.filter(r => r.check_in_time);
      const activeDuty = records.filter(r => r.check_in_time && !r.check_out_time);

      setElText('statPresentToday', timedIn.length);
      setElText('statActiveOnDuty', activeDuty.length);
      setElText('statTotalLogs', records.length);
    }
  }

  function filterRecords(term) {
    if (!term) {
      renderAttendanceTable(attendanceRecords);
      return;
    }

    const filtered = attendanceRecords.filter(r => {
      const name = (r.student_name || '').toLowerCase();
      const num = (r.student_number || '').toLowerCase();
      const course = (r.course || '').toLowerCase();
      return name.includes(term) || num.includes(term) || course.includes(term);
    });

    renderAttendanceTable(filtered);
  }

  function renderEmptyRecords() {
    const tbody = document.getElementById('attendanceTableBody');
    const cols = currentMode === 'all_students' ? 4 : 5;
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${cols}" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No records found for this selection.
          </td>
        </tr>
      `;
    }
  }

  function renderNoDeployments() {
    const tbody = document.getElementById('attendanceTableBody');
    const cols = currentMode === 'all_students' ? 4 : 5;
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${cols}" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No active deployments available.
          </td>
        </tr>
      `;
    }
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = msg;
    if (type === 'success') {
      toast.style.background = 'rgba(16, 185, 129, 0.15)';
      toast.style.color = '#0B3D2E';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (type === 'error') {
      toast.style.background = 'rgba(220, 38, 38, 0.15)';
      toast.style.color = '#7F1D1D';
      toast.style.border = '1px solid rgba(220, 38, 38, 0.3)';
    } else {
      toast.style.background = 'rgba(59, 130, 246, 0.15)';
      toast.style.color = '#1E3A8A';
      toast.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    }

    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }

  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
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
