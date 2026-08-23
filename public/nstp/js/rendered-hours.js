/**
 * CWTSConnect — NSTP Coordinator Rendered Service Hours Monitoring Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Dual-Mode Viewing:
 *  - All Batches: Student Name, Student Course, Total Deployment, Total Attendance, Total Rendered Hours
 *  - Specific Batch: Student Name, Student Course, Date, Time In, Time Out, Credited Rendered Hours
 */

(function () {
  'use strict';

  let deployments = [];
  let currentDeploymentId = 'all';
  let currentMode = 'all_students'; // 'all_students' or 'batch_details'
  let studentRecords = [];

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupEventListeners();
    showLoading();
    try {
      await loadDeployments();
    } catch (err) {
      console.error('Error initializing rendered hours:', err);
      showToast('Failed to initialize rendered hours data.', 'error');
    } finally {
      hideLoading();
    }
  }

  function setupEventListeners() {
    const depSelect = document.getElementById('deploymentSelect');
    if (depSelect) {
      depSelect.addEventListener('change', function () {
        currentDeploymentId = this.value || 'all';
        loadHoursForDeployment(currentDeploymentId);
      });
    }

    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }

    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudents(this.value.trim().toLowerCase());
      });
    }
  }

  function showLoading() {
    const skeleton = document.getElementById('hoursSkeleton');
    const content = document.getElementById('hoursContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('hoursSkeleton');
    const content = document.getElementById('hoursContent');
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

        await loadHoursForDeployment(currentDeploymentId);
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

  async function loadHoursForDeployment(deploymentId) {
    const tbody = document.getElementById('hoursTableBody');
    const thead = document.getElementById('hoursTableHead');
    const titleEl = document.getElementById('hoursTableTitle');

    currentMode = (!deploymentId || deploymentId === 'all') ? 'all_students' : 'batch_details';

    // Update Table Title and Headers
    if (currentMode === 'all_students') {
      if (titleEl) titleEl.textContent = 'All Students Rendered Hours Summary';
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Student Name</th>
            <th style="width: 200px;">Student Course</th>
            <th style="width: 160px; text-align: center;">Total Deployment</th>
            <th style="width: 160px; text-align: center;">Total Attendance</th>
            <th style="width: 180px; text-align: center;">Total Rendered Hours</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading students overview...</td></tr>';
      }
    } else {
      const selectedDep = deployments.find(d => d.deployment_id === deploymentId);
      const batchName = selectedDep ? selectedDep.deployment_batch_name : 'Deployment Batch';
      if (titleEl) titleEl.textContent = `${batchName} - Deployed Students Rendered Hours`;
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Student Name</th>
            <th style="width: 180px;">Student Course</th>
            <th style="width: 130px;">Date</th>
            <th style="width: 110px;">Time In</th>
            <th style="width: 110px;">Time Out</th>
            <th style="width: 170px; text-align: center;">Credited Rendered Hours</th>
          </tr>
        `;
      }
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading batch hours details...</td></tr>';
      }
    }

    try {
      const url = currentMode === 'batch_details' 
        ? `/api/attendance/deployment/${encodeURIComponent(deploymentId)}` 
        : '/api/attendance/deployment/all';
      const res = await fetch(url);
      const result = await res.json();

      if (result.success && Array.isArray(result.attendance)) {
        studentRecords = result.attendance;
        renderHoursTable(studentRecords);
        updateStatistics(studentRecords);
      } else {
        renderEmptyHours();
      }
    } catch (err) {
      console.error('Error loading deployment hours:', err);
      renderEmptyHours();
    }
  }

  function renderHoursTable(records) {
    const tbody = document.getElementById('hoursTableBody');
    const badge = document.getElementById('studentsCountBadge');
    if (badge) badge.textContent = `${records.length} Student${records.length === 1 ? '' : 's'}`;

    if (!tbody) return;

    if (!records || records.length === 0) {
      renderEmptyHours();
      return;
    }

    if (currentMode === 'all_students') {
      // Render Mode A: Student Name, Student Course, Total Deployment, Total Attendance, Total Rendered Hours
      tbody.innerHTML = records.map(r => {
        const studentName = r.student_name || 'Student Volunteer';
        const studentNumber = r.student_number || '---';
        const course = r.course || 'BSIT';
        const sec = r.section ? `Sec ${r.section}` : '';
        const yr = r.year_level ? `(Yr ${r.year_level})` : '';
        const courseStr = `${course} ${sec} ${yr}`.trim();
        const totalDeps = r.total_deployments || 0;
        const totalAtt = r.total_attendance || 0;
        const totalHrs = Number(r.total_hours_rendered || 0).toFixed(1);

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
            <td style="text-align: center;">
              <span style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E); font-size: 1rem;">
                ${totalHrs} hrs
              </span>
            </td>
          </tr>
        `;
      }).join('');

    } else {
      // Render Mode B: Student Name, Student Course, Date, Time In, Time Out, Credited Rendered Hours
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
        const creditedHrs = Number(r.hours_rendered || 0).toFixed(1);

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
            <td style="text-align: center;">
              <span class="badge badge-verified" style="font-weight: 800; font-size: 0.9375rem; padding: 6px 14px;">
                ${creditedHrs} hrs
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  function updateStatistics(records) {
    let totalHrs = 0;
    let completedCount = 0;
    let inProgressCount = 0;

    records.forEach(r => {
      const hrs = Number(r.total_hours_rendered || r.hours_rendered || 0);
      totalHrs += hrs;
      if (hrs >= 90) {
        completedCount++;
      } else {
        inProgressCount++;
      }
    });

    const avgHrs = records.length > 0 ? (totalHrs / records.length).toFixed(1) : '0.0';

    setElText('statTotalRendered', `${totalHrs.toFixed(1)}h`);
    setElText('statCompletedStudents', completedCount);
    setElText('statInProgressStudents', inProgressCount);
    setElText('statAverageHours', `${avgHrs}h`);
  }

  function filterStudents(term) {
    if (!term) {
      renderHoursTable(studentRecords);
      return;
    }

    const filtered = studentRecords.filter(s => {
      const name = (s.student_name || '').toLowerCase();
      const num = (s.student_number || '').toLowerCase();
      const course = (s.course || '').toLowerCase();
      return name.includes(term) || num.includes(term) || course.includes(term);
    });

    renderHoursTable(filtered);
  }

  function exportCSV() {
    if (studentRecords.length === 0) {
      showToast('No student records to export.', 'error');
      return;
    }

    let csv = '';
    if (currentMode === 'all_students') {
      csv = 'Student Name,Student Number,Course & Section,Total Deployments,Total Attendance,Total Rendered Hours\n';
      studentRecords.forEach(s => {
        const name = `"${s.student_name || ''}"`;
        const num = `"${s.student_number || ''}"`;
        const course = `"${s.course || ''} ${s.section || ''} ${s.year_level || ''}"`;
        const deps = s.total_deployments || 0;
        const att = s.total_attendance || 0;
        const total = Number(s.total_hours_rendered || 0).toFixed(1);
        csv += `${name},${num},${course},${deps},${att},${total}\n`;
      });
    } else {
      csv = 'Student Name,Student Number,Course & Section,Date,Time In,Time Out,Credited Rendered Hours\n';
      studentRecords.forEach(s => {
        const name = `"${s.student_name || ''}"`;
        const num = `"${s.student_number || ''}"`;
        const course = `"${s.course || ''} ${s.section || ''} ${s.year_level || ''}"`;
        const date = `"${s.attendance_date || ''}"`;
        const tIn = `"${s.check_in_time || ''}"`;
        const tOut = `"${s.check_out_time || ''}"`;
        const hrs = Number(s.hours_rendered || 0).toFixed(1);
        csv += `${name},${num},${course},${date},${tIn},${tOut},${hrs}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rendered_Hours_${currentMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function renderEmptyHours() {
    const tbody = document.getElementById('hoursTableBody');
    const cols = currentMode === 'all_students' ? 5 : 6;
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${cols}" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No rendered hours records found for this selection.
          </td>
        </tr>
      `;
    }
  }

  function renderNoDeployments() {
    const tbody = document.getElementById('hoursTableBody');
    const cols = currentMode === 'all_students' ? 5 : 6;
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
