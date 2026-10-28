/**
 * CWTSConnect — NSTP Coordinator Rendered Service Hours Monitoring Controller
 * Strictly adheres to CWTSConnect Design Guide & specifications:
 *  - 5 Standardized Columns: STUDENT NAME, COURSE, YEAR AND SECTION, TOTAL DEPLOYMENT, TOTAL RENDERED HOURS
 *  - Clickable Student Rows to view Full Profile Modal with Rendered Hours Breakdown
 *  - No emojis, no stickers. Clean professional UI.
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
    setupModalEventListeners();
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

    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudents(this.value.trim().toLowerCase());
      });
    }

    const refreshBtn = document.getElementById('refreshHoursBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function () {
        this.disabled = true;
        await loadHoursForDeployment(currentDeploymentId);
        showToast('Rendered service hours updated successfully.', 'success');
        this.disabled = false;
      });
    }
  }

  function setupModalEventListeners() {
    const modal = document.getElementById('studentDetailsModal');
    const closeBtn = document.getElementById('closeStudentModalBtn');
    const footerCloseBtn = document.getElementById('closeStudentModalFooterBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeStudentProfileModal);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeStudentProfileModal);

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          closeStudentProfileModal();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeStudentProfileModal();
      }
    });
  }

  function closeStudentProfileModal() {
    const modal = document.getElementById('studentDetailsModal');
    if (modal) {
      modal.classList.remove('active');
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
      const res = await fetch('/api/nstp/deployments', { credentials: 'include' });
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
      const label = `${d.deployment_batch_name} — ${d.activity_title || d.community_name || 'Service'}`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    select.innerHTML = allOption + options;
  }

  async function loadHoursForDeployment(deploymentId) {
    const tbody = document.getElementById('hoursTableBody');
    const thead = document.getElementById('hoursTableHead');
    const titleEl = document.getElementById('hoursTableTitle');

    currentMode = (!deploymentId || deploymentId === 'all') ? 'all_students' : 'batch_details';

    if (thead) {
      if (currentMode === 'all_students') {
        thead.innerHTML = `
          <tr>
            <th style="min-width: 240px; text-align: left; padding: 14px 18px;">Student Name</th>
            <th style="width: 220px; min-width: 180px; text-align: left; padding: 14px 18px;">Course</th>
            <th style="width: 180px; min-width: 150px; text-align: left; padding: 14px 18px;">Year and Section</th>
            <th style="width: 170px; min-width: 150px; text-align: center; padding: 14px 18px;">Total Deployment</th>
            <th style="width: 180px; min-width: 150px; text-align: center; padding: 14px 18px;">Total Rendered Hours</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th style="min-width: 220px; text-align: left; padding: 14px 18px;">Student Name</th>
            <th style="width: 180px; min-width: 140px; text-align: left; padding: 14px 18px;">Course</th>
            <th style="width: 170px; min-width: 140px; text-align: left; padding: 14px 18px;">Year and Section</th>
            <th style="width: 150px; min-width: 120px; text-align: center; padding: 14px 18px;">Time-In</th>
            <th style="width: 150px; min-width: 120px; text-align: center; padding: 14px 18px;">Time-Out</th>
            <th style="width: 170px; min-width: 140px; text-align: center; padding: 14px 18px;">Rendered Hours</th>
          </tr>
        `;
      }
    }

    if (currentMode === 'all_students') {
      if (titleEl) titleEl.textContent = 'All Students Rendered Hours Summary';
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">Loading students overview...</td></tr>';
      }
    } else {
      const selectedDep = deployments.find(d => d.deployment_id === deploymentId);
      const batchName = selectedDep ? selectedDep.deployment_batch_name : 'Deployment Batch';
      if (titleEl) titleEl.textContent = `${batchName} — Assigned Students Rendered Hours`;
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">Loading batch hours details...</td></tr>';
      }
    }

    try {
      const url = currentMode === 'batch_details' 
        ? `/api/attendance/deployment/${encodeURIComponent(deploymentId)}` 
        : '/api/attendance/deployment/all';
      const res = await fetch(url, { credentials: 'include' });
      const result = await res.json();

      if (result.success && Array.isArray(result.attendance)) {
        studentRecords = result.attendance;
        renderHoursTable(studentRecords);
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
    const badge = document.getElementById('recordsCountBadge');
    if (badge) badge.textContent = `${records.length} Student${records.length === 1 ? '' : 's'}`;

    if (!tbody) return;

    if (!records || records.length === 0) {
      renderEmptyHours();
      return;
    }

    tbody.innerHTML = records.map(r => {
      const studentName = r.student_name || 'Student Volunteer';
      const studentNumber = r.student_number || '---';
      const isPending = !r.section || r.section === '---' || r.year_level === '---' || r.profile_completed === false;
      const course = isPending ? (r.course && r.course !== '---' ? r.course : '---') : (r.course || 'BSIT');
      let yearAndSection = '---';
      if (isPending) {
        yearAndSection = '<span class="badge badge-pending" style="font-size: 0.75rem; padding: 3px 8px;">Pending Profile</span>';
      } else {
        const yearFormatted = formatYearLevel(r.year_level);
        const sec = r.section ? (String(r.section).toLowerCase().startsWith('section') ? r.section : `Section ${String(r.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A';
        yearAndSection = `${yearFormatted}${sec ? ` • ${sec}` : ''}`;
      }

      const totalDeps = Number(r.total_deployments || 0);
      const totalHrs = Number(r.total_hours_rendered || 0);

      const initials = studentName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'SV';

      let dynamicCols = '';

      if (currentMode === 'all_students') {
        dynamicCols = `
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            <span class="badge ${totalDeps > 0 ? 'badge-verified' : 'badge-pending'}" style="font-weight: 700; font-size: 0.8125rem; padding: 6px 14px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>${totalDeps} Deployment${totalDeps === 1 ? '' : 's'}</span>
            </span>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            <span class="badge ${totalHrs > 0 ? 'badge-verified' : 'badge-pending'}" style="font-weight: 800; font-size: 0.8125rem; padding: 6px 14px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${totalHrs.toFixed(1)} hrs</span>
            </span>
          </td>
        `;
      } else {
        const inFormatted = r.check_in_time ? formatTime12h(r.check_in_time) : '---';
        let outFormatted = '---';
        if (r.check_out_time) {
          outFormatted = formatTime12h(r.check_out_time);
        } else if (r.check_in_time) {
          outFormatted = '<span class="badge badge-pending" style="font-size: 0.75rem; padding: 3px 8px; border-radius: 9999px;">Ongoing</span>';
        }

        const isCredited = Boolean(r.is_credited);
        const creditedHours = isCredited ? Number(r.batch_rendered_hours || 0) : 0;

        const renderedHoursBadge = isCredited && creditedHours > 0
          ? `
            <span class="badge badge-verified" style="font-weight: 800; font-size: 0.8125rem; padding: 6px 14px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${creditedHours.toFixed(1)} hrs</span>
            </span>
          `
          : `
            <span class="badge badge-pending" style="font-weight: 700; font-size: 0.8125rem; padding: 6px 14px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>0.0 hrs</span>
            </span>
          `;

        dynamicCols = `
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            <span style="font-weight: 700; color: #1E293B; font-size: 0.875rem;">
              ${escapeHtml(inFormatted)}
            </span>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            ${outFormatted.startsWith('<span') ? outFormatted : `<span style="font-weight: 700; color: #1E293B; font-size: 0.875rem;">${escapeHtml(outFormatted)}</span>`}
          </td>
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            ${renderedHoursBadge}
          </td>
        `;
      }

      return `
        <tr class="student-row-clickable" data-student-id="${escapeHtml(r.student_user_id || '')}" title="Click to view ${escapeHtml(studentName)}'s profile">
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(11, 61, 46, 0.08); color: var(--cwts-primary-dark, #0B3D2E); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8125rem; flex-shrink: 0; border: 1px solid rgba(11, 61, 46, 0.15);">
                ${escapeHtml(initials)}
              </div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(studentName)}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-weight: 500;">
                  ${studentNumber && studentNumber !== 'N/A' && studentNumber !== '---' ? `ID: ${escapeHtml(studentNumber)}` : 'Volunteer'}
                </div>
              </div>
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div style="font-weight: 700; color: #1E293B; font-size: 0.875rem;">
              ${escapeHtml(course)}
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div style="font-weight: 600; color: #334155; font-size: 0.875rem;">
              ${escapeHtml(yearAndSection)}
            </div>
          </td>
          ${dynamicCols}
        </tr>
      `;
    }).join('');

    // Attach click events to rows
    tbody.querySelectorAll('.student-row-clickable').forEach(row => {
      row.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        if (studentId) {
          openStudentProfileModal(studentId);
        }
      });
    });
  }

  async function openStudentProfileModal(studentId) {
    const modal = document.getElementById('studentDetailsModal');
    const modalBody = document.getElementById('studentModalBody');
    if (!modal || !modalBody) return;

    // Show modal immediately with loading state
    modal.classList.add('active');
    modalBody.innerHTML = `
      <div style="padding: 32px 16px; text-align: center;">
        <div class="skeleton" style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px;"></div>
        <div class="skeleton" style="width: 220px; height: 22px; margin: 0 auto 10px;"></div>
        <div class="skeleton" style="width: 160px; height: 16px; margin: 0 auto 24px;"></div>
        <div class="profile-meta-grid">
          <div class="skeleton" style="height: 64px; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 64px; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 64px; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 64px; border-radius: 8px;"></div>
        </div>
      </div>
    `;

    // Local summary fallback
    const localSummary = studentRecords.find(r => r.student_user_id === studentId) || {};

    let studentData = null;
    try {
      const res = await fetch(`/api/nstp/students/${encodeURIComponent(studentId)}`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data.success && data.student) {
        studentData = data.student;
      } else {
        renderModalError(data.message || 'Unable to load student profile details.');
        return;
      }
    } catch (err) {
      console.error('Error fetching student profile:', err);
      renderModalError('Network error while retrieving student profile.');
      return;
    }

    try {
      renderStudentProfileDetails(studentData, localSummary);
    } catch (renderErr) {
      console.error('Error rendering student profile details:', renderErr);
      renderModalError('Error displaying student profile details.');
    }
  }

  function renderStudentProfileDetails(student, summary) {
    const modalBody = document.getElementById('studentModalBody');
    if (!modalBody) return;

    const fullName = student.full_name || 'Student Volunteer';
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SV';

    const studentNumber = student.student_number || '---';
    const email = student.email || '---';
    const isProfilePending = (!student.full_name && !student.student_number) || student.profile_status === 'incomplete';
    const course = isProfilePending ? (student.course && student.course !== '---' ? student.course : '---') : (student.course || 'BSIT');
    let yearAndSec = 'Pending Profile';
    if (!isProfilePending) {
      const yearFormatted = formatYearLevel(student.year_level || '1st Year');
      const sec = student.section ? (String(student.section).toLowerCase().startsWith('section') ? student.section : `Section ${String(student.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A';
      yearAndSec = `${yearFormatted}${sec ? ` • ${sec}` : ''}`;
    }
    const component = student.nstp_component || 'CWTS';
    const contact = student.contact_number || '---';

    let addressParts = [
      student.complete_address || student.address,
      student.barangay ? (student.barangay.toLowerCase().startsWith('brgy') ? student.barangay : `Brgy. ${student.barangay}`) : '',
      student.municipality,
      student.province
    ].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Not provided';

    // Skills parsing
    let skillsList = [];
    if (Array.isArray(student.skills)) {
      skillsList = student.skills;
    } else if (typeof student.skills === 'string' && student.skills.trim()) {
      skillsList = student.skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const breakdown = Array.isArray(student.attendance_breakdown) ? student.attendance_breakdown : [];
    const computedTotalHrs = breakdown.reduce((sum, r) => {
      const isCred = r.is_credited !== undefined ? Boolean(r.is_credited) : (Number(r.credited_hours != null ? r.credited_hours : r.hours_rendered || 0) > 0);
      const val = Number(r.credited_hours != null ? r.credited_hours : (r.hours_rendered || 0));
      return sum + (isCred ? val : 0);
    }, 0);
    const totalHrs = student.total_hours_rendered != null 
      ? Number(student.total_hours_rendered) 
      : (summary.total_hours_rendered != null ? Number(summary.total_hours_rendered) : computedTotalHrs);
    const totalDeps = student.total_deployments_count != null 
      ? student.total_deployments_count 
      : (summary.total_deployments != null ? summary.total_deployments : breakdown.length);

    let breakdownRowsHtml = '';
    if (breakdown.length === 0) {
      breakdownRowsHtml = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 0.8125rem;">
            No assigned deployments or rendered hours recorded for this student.
          </td>
        </tr>
      `;
    } else {
      breakdownRowsHtml = breakdown.map(row => {
        const dateFormatted = formatDisplayDate(row.date);
        const actTitle = row.activity_title || 'NSTP Community Service';
        const batchName = row.batch_name || '';
        const isCredited = row.is_credited !== undefined ? Boolean(row.is_credited) : (Number(row.credited_hours != null ? row.credited_hours : row.hours_rendered || 0) > 0);
        const creditedHours = Number(row.credited_hours != null ? row.credited_hours : (row.hours_rendered || 0));

        let timeMeta = '';
        if (row.check_in_time && row.check_out_time) {
          timeMeta = `${formatTime12h(row.check_in_time)} - ${formatTime12h(row.check_out_time)}`;
        } else if (row.check_in_time) {
          timeMeta = `Checked-in: ${formatTime12h(row.check_in_time)}`;
        }

        const hoursBadge = isCredited && creditedHours > 0
          ? `<span class="badge badge-verified" style="font-weight: 800; font-size: 0.8125rem; padding: 4px 12px; border-radius: 9999px;">
              ${creditedHours.toFixed(1)} hrs
            </span>`
          : `<span class="badge badge-pending" style="font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 9999px; color: #64748B;">
              0.0 hrs
            </span>`;

        return `
          <tr style="border-bottom: 1px solid rgba(226, 232, 240, 0.6); transition: background-color 0.15s ease;">
            <td style="padding: 12px 16px; vertical-align: middle; white-space: nowrap; font-weight: 600; color: #1E293B;">
              ${escapeHtml(dateFormatted)}
            </td>
            <td style="padding: 12px 16px; vertical-align: middle;">
              <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.875rem; line-height: 1.35;">
                ${escapeHtml(actTitle)}
              </div>
              ${batchName && batchName !== actTitle ? `
                <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">
                  ${escapeHtml(batchName)}
                </div>
              ` : ''}
              ${timeMeta ? `
                <div style="font-size: 0.6875rem; color: #0284C7; margin-top: 2px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>${escapeHtml(timeMeta)}</span>
                </div>
              ` : ''}
            </td>
            <td style="padding: 12px 16px; text-align: center; vertical-align: middle;">
              ${hoursBadge}
            </td>
          </tr>
        `;
      }).join('');
    }

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Header Info Card -->
        <div style="display: flex; align-items: center; gap: 16px; background: rgba(11, 61, 46, 0.04); border: 1px solid rgba(11, 61, 46, 0.12); border-radius: 12px; padding: 18px 20px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--cwts-primary-dark, #0B3D2E); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 10px rgba(11, 61, 46, 0.25);">
            ${escapeHtml(initials)}
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h3 style="margin: 0; font-size: 1.1875rem; font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E);">${escapeHtml(fullName)}</h3>
              <span class="badge badge-verified" style="font-size: 0.6875rem; padding: 2px 8px;">${escapeHtml(component)}</span>
            </div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span><strong>ID:</strong> ${escapeHtml(studentNumber)}</span>
              <span>•</span>
              <span><strong>Email:</strong> ${escapeHtml(email)}</span>
            </div>
          </div>
        </div>

        <!-- Monitoring Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div class="profile-meta-box" style="background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.25); text-align: center; padding: 14px;">
            <span class="profile-meta-label" style="color: #065F46;">Total Deployments</span>
            <span style="font-size: 1.375rem; font-weight: 800; color: #065F46;">${totalDeps}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Assigned Batches</div>
          </div>
          <div class="profile-meta-box" style="background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.25); text-align: center; padding: 14px;">
            <span class="profile-meta-label" style="color: #065F46;">Total Rendered Hours</span>
            <span style="font-size: 1.375rem; font-weight: 800; color: #065F46;">${totalHrs.toFixed(1)} hrs</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Accumulated Hours</div>
          </div>
        </div>

        <!-- Rendered Hours Breakdown Card -->
        <div style="background: #FFFFFF; border: 1px solid rgba(226, 232, 240, 0.9); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <!-- Card Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid rgba(226, 232, 240, 0.8);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(11, 61, 46, 0.1); color: var(--cwts-primary-dark, #0B3D2E); display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <span style="font-weight: 700; font-size: 0.9375rem; color: #0F172A;">Rendered Hours Breakdown</span>
            </div>
          </div>

          <!-- Table Container -->
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; text-align: left;">
              <thead>
                <tr style="background: #F1F5F9; color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid rgba(226, 232, 240, 0.8);">
                  <th style="padding: 10px 16px; font-weight: 700; width: 130px;">Date</th>
                  <th style="padding: 10px 16px; font-weight: 700;">Deployment Activity Name</th>
                  <th style="padding: 10px 16px; font-weight: 700; text-align: center; width: 140px;">Rendered Hours</th>
                </tr>
              </thead>
              <tbody>
                ${breakdownRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Academic & Contact Grid -->
        <div class="profile-meta-grid">
          <div class="profile-meta-box">
            <span class="profile-meta-label">Course & Program</span>
            <span class="profile-meta-val">${escapeHtml(course)}</span>
          </div>
          <div class="profile-meta-box">
            <span class="profile-meta-label">Year Level & Section</span>
            <span class="profile-meta-val">${escapeHtml(yearAndSec)}</span>
          </div>
          <div class="profile-meta-box">
            <span class="profile-meta-label">Contact Number</span>
            <span class="profile-meta-val">${escapeHtml(contact)}</span>
          </div>
          <div class="profile-meta-box">
            <span class="profile-meta-label">Profile Status</span>
            <span class="profile-meta-val" style="text-transform: capitalize;">${escapeHtml(student.profile_status || 'Complete')}</span>
          </div>
        </div>

        <!-- Address Card -->
        <div class="profile-meta-box">
          <span class="profile-meta-label">Complete Address</span>
          <span class="profile-meta-val">${escapeHtml(fullAddress)}</span>
        </div>

        <!-- Skills Card -->
        <div class="profile-meta-box">
          <span class="profile-meta-label">Special Skills & Competencies</span>
          <div style="margin-top: 8px;">
            ${skillsList.length > 0 
              ? skillsList.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('') 
              : '<span style="font-size: 0.8125rem; color: var(--text-muted);">No specialized skills listed.</span>'
            }
          </div>
        </div>
      </div>
    `;
  }

  function renderModalError(message) {
    const modalBody = document.getElementById('studentModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="padding: 32px 20px; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(220, 38, 38, 0.1); color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h4 style="margin: 0 0 6px 0; color: #1E293B; font-weight: 700;">Profile Unavailable</h4>
        <p style="margin: 0; font-size: 0.875rem; color: #64748B;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function filterStudents(term) {
    if (!term) {
      renderHoursTable(studentRecords);
      return;
    }

    const filtered = studentRecords.filter(r => {
      const name = (r.student_name || '').toLowerCase();
      const num = (r.student_number || '').toLowerCase();
      const course = (r.course || '').toLowerCase();
      const sec = (r.section || '').toLowerCase();
      const yr = (r.year_level || '').toLowerCase();
      return name.includes(term) || num.includes(term) || course.includes(term) || sec.includes(term) || yr.includes(term);
    });

    renderHoursTable(filtered);
  }

  function renderEmptyHours() {
    const tbody = document.getElementById('hoursTableBody');
    const badge = document.getElementById('recordsCountBadge');
    if (badge) badge.textContent = '0 Students';

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
    const badge = document.getElementById('recordsCountBadge');
    if (badge) badge.textContent = '0 Students';

    const cols = currentMode === 'all_students' ? 5 : 6;
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${cols}" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No deployments available.
          </td>
        </tr>
      `;
    }
  }

  function formatYearLevel(yearStr) {
    if (!yearStr || yearStr === '---' || yearStr === 'N/A') return '---';
    const str = String(yearStr).trim();
    if (str.toLowerCase().includes('year')) return str;
    const num = parseInt(str, 10);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${str} Year`;
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

  function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr === '---' || dateStr === 'N/A') return '---';
    try {
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, monthIndex, day);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
          });
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  function formatTime12h(timeStr) {
    if (!timeStr || timeStr === '---' || timeStr === 'N/A') return '---';
    try {
      if (String(timeStr).includes('T') || String(timeStr).includes('Z')) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
      }
      const parts = String(timeStr).trim().split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        let m = parts[1].slice(0, 2);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${m.padStart(2, '0')} ${ampm}`;
      }
      return timeStr;
    } catch (e) {
      return timeStr;
    }
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
