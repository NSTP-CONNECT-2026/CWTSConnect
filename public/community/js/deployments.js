/**
 * CWTSConnect — Community Official Deployment Information & Monitoring Controller
 * Handles active deployment details and real-time per-student rendered hours counting
 */

(function () {
  'use strict';

  let currentDeployment = null;
  let currentStudents = [];
  let liveTimerInterval = null;

  document.addEventListener('DOMContentLoaded', function () {
    loadActiveDeployment();

    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudents(this.value.trim().toLowerCase());
      });
    }

    // Start live timer ticking every second
    startLiveHourTicker();
  });

  function showLoading() {
    const skeleton = document.getElementById('deploymentsSkeleton');
    const content = document.getElementById('deploymentsContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('deploymentsSkeleton');
    const content = document.getElementById('deploymentsContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadActiveDeployment() {
    showLoading();
    try {
      const res = await fetch('/api/community/deployments');
      const result = await res.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        // Find active deployment or pick the first ongoing/active deployment
        const activeDep = result.data.find(d => d.deployment_status === 'active' || d.deployment_status === 'ongoing') || result.data[0];
        await loadDeploymentDetails(activeDep.deployment_id);
      } else {
        renderEmptyDeployments();
        hideLoading();
      }
    } catch (err) {
      console.error('Failed to load active deployment:', err);
      renderEmptyDeployments();
      hideLoading();
    }
  }

  async function loadDeploymentDetails(deploymentId) {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading student roster...</td></tr>';
    }

    try {
      const res = await fetch(`/api/community/deployments/${deploymentId}`);
      const result = await res.json();

      if (result.success && result.data) {
        const { deployment, community_request, students } = result.data;
        currentDeployment = deployment;
        currentStudents = students || [];

        renderDeploymentMeta(deployment, community_request, currentStudents.length);
        renderStudentsTable(currentStudents);
      } else {
        renderNoStudents();
      }
    } catch (err) {
      console.error('Error loading deployment details:', err);
      renderNoStudents();
    } finally {
      hideLoading();
    }
  }

  function renderDeploymentMeta(dep, req, studentCount) {
    const container = document.getElementById('deploymentMetaContainer');
    if (!container) return;

    const startDate = dep.deployment_start_date || req.preferred_start_date || 'N/A';
    const endDate = dep.deployment_end_date || req.preferred_end_date || 'N/A';
    const statusClass = dep.deployment_status === 'active' || dep.deployment_status === 'ongoing' ? 'badge-verified' : 'badge-pending';
    const barangayText = req.barangay ? `Brgy. ${req.barangay}` : 'Community';
    const muniText = req.municipality ? `, ${req.municipality}` : '';

    container.innerHTML = `
      <div class="deployment-hero-card">
        <div class="deployment-hero-header">
          <div>
            <div class="deployment-hero-title">${escapeHtml(req.activity_title || 'Community Service Activity')}</div>
            <div class="deployment-hero-subtitle">${escapeHtml(barangayText)}${escapeHtml(muniText)}</div>
          </div>
          <span class="badge ${statusClass}">${escapeHtml(dep.deployment_status.toUpperCase())}</span>
        </div>

        <div class="deployment-details-grid">
          <div class="detail-item-box">
            <span class="detail-item-label">Activity Type</span>
            <span class="detail-item-value">${escapeHtml(req.activity_type || 'General Community Service')}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Deployment Date</span>
            <span class="detail-item-value">${escapeHtml(startDate)} to ${escapeHtml(endDate)}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Total Assigned Student</span>
            <span class="detail-item-value highlight">${studentCount} Student(s)</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (!students || students.length === 0) {
      renderNoStudents();
      return;
    }

    tbody.innerHTML = students.map(s => {
      const todayAtt = s.today_attendance;
      const isLiveActive = todayAtt && todayAtt.check_in_time && !todayAtt.check_out_time;
      const baseHours = Number(s.hours_rendered || 0);

      return `
        <tr data-student-id="${s.student_user_id}">
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(s.full_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(s.student_number)}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(s.course)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Sec ${escapeHtml(s.section)} (Yr ${escapeHtml(s.year_level)})</div>
          </td>
          <td style="font-weight: 500; font-size: 0.875rem;">
            ${escapeHtml(s.contact_number || '---')}
          </td>
          <td>
            <div class="rendered-hours-cell" 
                 data-student-id="${s.student_user_id}"
                 data-base-hours="${baseHours}"
                 data-is-active="${isLiveActive ? 'true' : 'false'}"
                 data-check-in="${isLiveActive ? todayAtt.check_in_time : ''}"
                 data-check-out="${todayAtt ? (todayAtt.check_out_time || '') : ''}">
              ${renderHoursDisplay(baseHours, isLiveActive, todayAtt ? todayAtt.check_in_time : null)}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateLiveCounters();
  }

  function renderHoursDisplay(baseHours, isLiveActive, checkInTime) {
    if (isLiveActive && checkInTime) {
      const elapsed = calculateElapsedHours(checkInTime);
      const totalLive = (baseHours + elapsed.hoursDecimal).toFixed(2);

      return `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 800; color: #0B3D2E; font-size: 1.05rem;">${totalLive} hrs</span>
            <span class="badge badge-verified" style="font-size: 0.6875rem; padding: 2px 6px; display: inline-flex; align-items: center; gap: 4px;">
              <span class="live-dot" style="width: 6px; height: 6px; background: #10B981; border-radius: 50%; display: inline-block;"></span>
              LIVE
            </span>
          </div>
          <div style="font-size: 0.75rem; color: #2F7D5B; font-weight: 600;">
            Active Session: ${elapsed.formatted} (In: ${checkInTime.substring(0, 5)})
          </div>
        </div>
      `;
    } else {
      return `
        <div style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E); font-size: 1rem;">
          ${Number(baseHours).toFixed(1)} hrs
        </div>
      `;
    }
  }

  function calculateElapsedHours(checkInTimeStr) {
    const now = new Date();
    const [h, m, s] = checkInTimeStr.split(':').map(Number);
    
    const checkInDate = new Date();
    checkInDate.setHours(h, m || 0, s || 0, 0);

    let diffMs = now.getTime() - checkInDate.getTime();
    if (diffMs < 0) diffMs = 0;

    const totalSeconds = Math.floor(diffMs / 1000);
    const hoursDecimal = totalSeconds / 3600;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      totalSeconds,
      hoursDecimal,
      formatted
    };
  }

  function updateLiveCounters() {
    const activeCells = document.querySelectorAll('.rendered-hours-cell[data-is-active="true"]');
    activeCells.forEach(cell => {
      const baseHours = Number(cell.getAttribute('data-base-hours') || 0);
      const checkInTime = cell.getAttribute('data-check-in');
      if (checkInTime) {
        cell.innerHTML = renderHoursDisplay(baseHours, true, checkInTime);
      }
    });
  }

  function startLiveHourTicker() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    liveTimerInterval = setInterval(() => {
      updateLiveCounters();
    }, 1000);
  }

  function filterStudents(term) {
    if (!term) {
      renderStudentsTable(currentStudents);
      return;
    }

    const filtered = currentStudents.filter(s => {
      const name = (s.full_name || '').toLowerCase();
      const course = (s.course || '').toLowerCase();
      const num = (s.student_number || '').toLowerCase();
      return name.includes(term) || course.includes(term) || num.includes(term);
    });

    renderStudentsTable(filtered);
  }

  function renderNoStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; font-size: 1rem; color: var(--cwts-primary-dark); margin-bottom: 4px;">No Assigned Students Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Once NSTP coordinators match students to this deployment, they will appear here automatically.</p>
          </td>
        </tr>
      `;
    }
  }

  function renderEmptyDeployments() {
    const container = document.getElementById('deploymentMetaContainer');
    const tbody = document.getElementById('studentsTableBody');

    if (container) {
      container.innerHTML = `
        <div class="deployment-hero-card" style="text-align: center; padding: 40px 20px;">
          <h3 style="color: var(--cwts-primary-dark); margin-bottom: 6px; font-weight: 700;">No Active Deployment</h3>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">You do not have an active deployment yet. Submit a community request to get started.</p>
        </div>
      `;
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No active deployment records found.</td>
        </tr>
      `;
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
