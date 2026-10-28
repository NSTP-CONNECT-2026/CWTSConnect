/**
 * CWTSConnect — Community Official Deployment Information & Monitoring Controller
 * Strictly monitors active/ongoing deployments with live per-student rendered hours
 */

(function () {
  'use strict';

  let currentDeployment = null;
  let currentStudents = [];
  let liveTimerInterval = null;
  let activeDeployments = [];

  document.addEventListener('DOMContentLoaded', function () {
    loadActiveDeployment();

    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudents(this.value.trim().toLowerCase());
      });
    }

    const refreshBtn = document.getElementById('refreshMonitoringBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        loadActiveDeployment();
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
        // STRICT REQUIREMENT: Only active or ongoing deployments are shown on this page!
        activeDeployments = result.data.filter(d => {
          const status = (d.deployment_status || '').toLowerCase();
          return status === 'active' || status === 'ongoing';
        });

        if (activeDeployments.length > 0) {
          renderActiveDeploymentSelector(activeDeployments);
          await loadDeploymentDetails(activeDeployments[0].deployment_id);
        } else {
          // No active deployment!
          renderEmptyDeployments();
          hideLoading();
        }
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

  function renderActiveDeploymentSelector(deps) {
    const group = document.getElementById('deploymentSelectorGroup');
    if (!group) return;

    if (deps.length <= 1) {
      group.style.display = 'none';
      group.innerHTML = '';
      return;
    }

    group.style.display = 'flex';
    group.innerHTML = `
      <label for="activeDepSelect" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-right: 6px;">Active Deployment:</label>
      <select id="activeDepSelect" class="control-input" style="min-width: 240px; font-weight: 600; color: var(--cwts-primary-dark, #0B3D2E);">
        ${deps.map(d => `<option value="${d.deployment_id}">${escapeHtml(d.deployment_batch_name || d.activity_title)} [ACTIVE]</option>`).join('')}
      </select>
    `;

    const selectEl = document.getElementById('activeDepSelect');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        loadDeploymentDetails(this.value);
      });
    }
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr || dateStr === '---' || String(dateStr).toUpperCase() === 'N/A') return '---';
    try {
      const trimmed = String(dateStr).split('T')[0];
      const parts = trimmed.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
      return trimmed;
    } catch (e) {
      return String(dateStr).split('T')[0];
    }
  }

  function formatYearLevel(yearStr) {
    if (!yearStr || yearStr === '---' || yearStr === 'N/A') return '';
    const str = String(yearStr).trim();
    if (str.toLowerCase().includes('year')) return str;
    const num = parseInt(str, 10);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${str} Year`;
  }

  async function loadDeploymentDetails(deploymentId) {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading students roster...</td></tr>';
    }

    try {
      const res = await fetch(`/api/community/deployments/${deploymentId}`);
      const result = await res.json();

      if (result.success && result.data) {
        const { deployment, community_request, students } = result.data;

        // Double check status: MUST be active or ongoing!
        const status = (deployment.deployment_status || '').toLowerCase();
        if (status !== 'active' && status !== 'ongoing') {
          renderEmptyDeployments();
          return;
        }

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

    const scheduleDate = formatDateDisplay(dep.deployment_start_date || req.preferred_start_date || dep.deployment_date) || 'N/A';
    
    let locationText = '';
    const barangay = dep.barangay || req.barangay;
    const municipality = dep.municipality || req.municipality;
    const province = dep.province || req.province;

    if (barangay) {
      locationText = barangay.toLowerCase().startsWith('brgy') ? barangay : `Brgy. ${barangay}`;
    } else if (req.community_name) {
      locationText = req.community_name;
    } else {
      locationText = 'Barangay Community';
    }
    if (municipality) {
      locationText += `, ${municipality}`;
    }
    if (province) {
      locationText += `, ${province}`;
    }

    let activityType = req.activity_type || dep.activity_type || 'CWTS Community Service';
    const customMatch = (dep.notes || req.special_instructions || '').match(/\[CUSTOM_REQUEST_TYPE:([^\]]+)\]/);
    if (customMatch && customMatch[1]) {
      activityType = customMatch[1].trim();
    }

    let cleanNotes = (dep.notes || req.special_instructions || '')
      .replace(/\[CUSTOM_REQUEST_TYPE:[^\]]+\]/g, '')
      .replace(/Special Instructions:\s*/i, '')
      .trim();

    container.innerHTML = `
      <div class="deployment-hero-card">
        <div class="deployment-hero-header">
          <div>
            <div class="deployment-hero-title">${escapeHtml(req.activity_title || dep.activity_title || dep.deployment_batch_name || 'Community Service Activity')}</div>
            <div class="deployment-hero-subtitle">${escapeHtml(locationText)} • Batch: ${escapeHtml(dep.deployment_batch_name)}</div>
          </div>
          <div>
            <span class="badge badge-verified" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 0.8125rem; font-weight: 700; border-radius: 9999px;">
              <span class="live-dot" style="width: 8px; height: 8px;"></span>
              ACTIVE
            </span>
          </div>
        </div>

        <div class="deployment-details-grid">
          <div class="detail-item-box">
            <span class="detail-item-label">Activity Type</span>
            <span class="detail-item-value">${escapeHtml(activityType)}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Deployment Schedule</span>
            <span class="detail-item-value">${escapeHtml(scheduleDate)}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Total Assigned Volunteers</span>
            <span class="detail-item-value highlight">${studentCount} Student(s)</span>
          </div>
        </div>

        ${cleanNotes ? `
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(226, 232, 240, 0.8); font-size: 0.875rem; color: var(--text-main);">
            <strong style="color: var(--cwts-primary-dark);">Community Notes:</strong> ${escapeHtml(cleanNotes)}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    const badge = document.getElementById('studentsTotalBadge');
    if (badge) badge.textContent = `${students.length} Student${students.length === 1 ? '' : 's'}`;

    if (!tbody) return;

    if (!students || students.length === 0) {
      renderNoStudents();
      return;
    }

    tbody.innerHTML = students.map(s => {
      const todayAtt = s.today_attendance;
      const checkInTime = todayAtt ? todayAtt.check_in_time : null;
      const checkOutTime = todayAtt ? todayAtt.check_out_time : null;
      const attDate = todayAtt ? todayAtt.attendance_date : null;
      const createdAt = todayAtt ? (todayAtt.created_at || todayAtt.updated_at) : null;
      const isLive = isSessionLive(checkInTime, checkOutTime);
      const baseHours = Number(s.hours_rendered || 0);

      const isCredited = Boolean(
        !isLive &&
        (
          s.is_credited === true ||
          s.credit_status === 'credited' ||
          (todayAtt && (todayAtt.verified_at || todayAtt.verified_by || (todayAtt.student_remarks && /\[CREDITED:[0-9.]+\]/.test(todayAtt.student_remarks)))) ||
          (Number(s.total_hours_verified || 0) > 0 && Number(s.total_hours_verified || 0) >= baseHours)
        )
      );

      const fullName = s.full_name || s.name || s.student_name || 'Student Volunteer';
      const studentNumber = s.student_number || '---';
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'SV';

      const yearFormatted = formatYearLevel(s.year_level);

      return `
        <tr data-student-id="${s.student_user_id || s.id}">
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(11, 61, 46, 0.08); color: var(--cwts-primary-dark, #0B3D2E); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8125rem; flex-shrink: 0; border: 1px solid rgba(11, 61, 46, 0.15);">
                ${escapeHtml(initials)}
              </div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(fullName)}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-weight: 500;">
                  ${studentNumber && studentNumber !== 'N/A' && studentNumber !== '---' ? `ID: ${escapeHtml(studentNumber)}` : 'Volunteer'}
                </div>
              </div>
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div>
              <div style="font-weight: 700; color: #1E293B; font-size: 0.875rem;">${escapeHtml(s.course || 'BSIT')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-weight: 500;">
                ${escapeHtml(s.section ? (String(s.section).toLowerCase().startsWith('section') ? s.section : `Section ${String(s.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A')}${yearFormatted ? ` • ${escapeHtml(yearFormatted)}` : ''}
              </div>
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 600; color: #334155; font-family: monospace, sans-serif; white-space: nowrap;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color: #64748B;">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>${escapeHtml(s.contact_number || s.phone_number || '---')}</span>
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle;">
            <div class="rendered-hours-cell" 
                 data-student-id="${s.student_user_id || s.id}"
                 data-base-hours="${baseHours}"
                 data-is-active="${isLive ? 'true' : 'false'}"
                 data-check-in="${checkInTime || ''}"
                 data-check-out="${checkOutTime || ''}"
                 data-att-date="${attDate || ''}"
                 data-created-at="${createdAt || ''}">
              ${renderHoursDisplay(baseHours, isLive, checkInTime, checkOutTime, attDate)}
            </div>
          </td>
          <td style="padding: 14px 18px; vertical-align: middle; text-align: center;">
            ${isCredited ? `
              <span class="badge badge-verified" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.02em;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                Credited
              </span>
            ` : `
              <span class="badge badge-pending" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.02em;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                Pending
              </span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    updateLiveCounters();
    startLiveHourTicker();
  }

  function isSessionLive(checkInTime, checkOutTime) {
    if (!checkInTime || checkInTime === '---' || String(checkInTime).toUpperCase() === 'N/A' || String(checkInTime).toUpperCase() === 'N\\A') {
      return false;
    }
    // If Time Out is N/A or empty, duty is actively ongoing -> LIVE!
    if (!checkOutTime || checkOutTime === '---' || String(checkOutTime).toUpperCase() === 'N/A' || String(checkOutTime).toUpperCase() === 'N\\A') {
      return true;
    }
    // If a specific Time Out has already been recorded, duty is completed (not live).
    return false;
  }

  function renderHoursDisplay(baseHours, isLive, checkInTime, checkOutTime, attDate) {
    if (isLive && checkInTime) {
      const elapsed = calculateElapsedHours(checkInTime, attDate);
      const sessionDecimal = elapsed.hoursDecimal;
      const totalLiveHours = baseHours + sessionDecimal;

      const timeColor = elapsed.isNegative ? '#D97706' : '#065F46';
      const dotColor = elapsed.isNegative ? '#F59E0B' : '#10B981';
      const badgeBg = elapsed.isNegative ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      const badgeColor = elapsed.isNegative ? '#B45309' : '#065F46';
      const badgeBorder = elapsed.isNegative ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';

      return `
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="live-counter-time" style="font-weight: 800; color: ${timeColor}; font-size: 1.1rem; letter-spacing: -0.01em;">
              ${elapsed.formatted}
            </span>
            <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 0.6875rem; font-weight: 700; padding: 1px 7px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 4px;">
              <span class="live-dot" style="background: ${dotColor};"></span>
              LIVE
            </span>
          </div>
          <div style="font-size: 0.8125rem; color: #0B3D2E; font-weight: 800;">
            <span>${totalLiveHours.toFixed(2)} hrs</span>
            <span style="font-size: 0.71875rem; color: ${elapsed.isNegative ? '#B45309' : '#059669'}; font-weight: 600; margin-left: 2px;">(${elapsed.formatted})</span>
          </div>
          <div style="font-size: 0.71875rem; color: var(--text-muted); font-weight: 500;">
            Time In: ${formatTime12Hour(checkInTime)} • Time Out: <span style="color: #B45309; font-weight: 700;">N/A (Ongoing)</span>
          </div>
        </div>
      `;
    } else if (checkInTime && checkOutTime && checkOutTime !== '---' && String(checkOutTime).toUpperCase() !== 'N/A' && String(checkOutTime).toUpperCase() !== 'N\\A') {
      return `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.95rem;">${baseHours.toFixed(1)} hrs</span>
          <span style="font-size: 0.71875rem; color: var(--text-muted); font-weight: 500;">
            ${formatTime12Hour(checkInTime)} - ${formatTime12Hour(checkOutTime)}
          </span>
        </div>
      `;
    } else {
      return `
        <span style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.95rem;">
          ${baseHours.toFixed(1)} hrs
        </span>
      `;
    }
  }

  function parseTimeComponents(timeStr) {
    if (!timeStr) return null;
    const trimmed = String(timeStr).trim();
    if (trimmed === '---' || trimmed.toUpperCase() === 'N/A' || trimmed.toUpperCase() === 'N\\A') return null;

    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return { hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() };
      }
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const modifier = match[4] ? match[4].toUpperCase() : null;

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return { hours, minutes, seconds };
  }

  function formatTime12Hour(timeStr) {
    if (!timeStr || timeStr === '---' || String(timeStr).toUpperCase() === 'N/A' || String(timeStr).toUpperCase() === 'N\\A') {
      return '---';
    }
    const parsed = parseTimeComponents(timeStr);
    if (!parsed) return String(timeStr).trim();
    let { hours, minutes } = parsed;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  function calculateElapsedHours(checkInTimeStr, attendanceDateStr) {
    if (!checkInTimeStr || checkInTimeStr === '---' || String(checkInTimeStr).toUpperCase() === 'N/A' || String(checkInTimeStr).toUpperCase() === 'N\\A') {
      return { totalSeconds: 0, hoursDecimal: 0, formatted: '00:00:00', isNegative: false };
    }

    const parsedTime = parseTimeComponents(checkInTimeStr);
    if (!parsedTime) {
      return { totalSeconds: 0, hoursDecimal: 0, formatted: '00:00:00', isNegative: false };
    }

    const now = new Date();
    let checkInDate = null;

    if (attendanceDateStr) {
      const dParts = String(attendanceDateStr).split('-').map(Number);
      if (dParts.length === 3) {
        checkInDate = new Date(dParts[0], dParts[1] - 1, dParts[2], parsedTime.hours, parsedTime.minutes, parsedTime.seconds, 0);
      }
    }

    if (!checkInDate || isNaN(checkInDate.getTime())) {
      checkInDate = new Date();
      checkInDate.setHours(parsedTime.hours, parsedTime.minutes, parsedTime.seconds, 0);
    }

    // Exact signed difference from Time In to Current Time
    const diffMs = now.getTime() - checkInDate.getTime();
    const isNegative = diffMs < 0;
    const absDiffSeconds = Math.floor(Math.abs(diffMs) / 1000);

    const hours = Math.floor(absDiffSeconds / 3600);
    const minutes = Math.floor((absDiffSeconds % 3600) / 60);
    const seconds = absDiffSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const timeClock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const formatted = isNegative ? `-${timeClock}` : timeClock;
    const hoursDecimal = diffMs / 3600000;

    return {
      totalSeconds: Math.floor(diffMs / 1000),
      hoursDecimal,
      formatted,
      isNegative
    };
  }

  function updateLiveCounters() {
    const activeCells = document.querySelectorAll('.rendered-hours-cell[data-is-active="true"]');
    activeCells.forEach(cell => {
      const baseHours = Number(cell.getAttribute('data-base-hours') || 0);
      const checkInTime = cell.getAttribute('data-check-in');
      const checkOutTime = cell.getAttribute('data-check-out');
      const attDate = cell.getAttribute('data-att-date');
      if (checkInTime) {
        if (isSessionLive(checkInTime, checkOutTime)) {
          cell.innerHTML = renderHoursDisplay(baseHours, true, checkInTime, checkOutTime, attDate);
        } else {
          cell.setAttribute('data-is-active', 'false');
          cell.innerHTML = renderHoursDisplay(baseHours, false, checkInTime, checkOutTime, attDate);
        }
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
      const name = (s.full_name || s.name || s.student_name || '').toLowerCase();
      const course = (s.course || '').toLowerCase();
      const num = (s.student_number || '').toLowerCase();
      const sec = (s.section || '').toLowerCase();
      return name.includes(term) || course.includes(term) || num.includes(term) || sec.includes(term);
    });

    renderStudentsTable(filtered);
  }

  function renderNoStudents() {
    const tbody = document.getElementById('studentsTableBody');
    const badge = document.getElementById('studentsTotalBadge');
    if (badge) badge.textContent = '0 Students';

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; font-size: 1rem; color: var(--cwts-primary-dark); margin-bottom: 4px;">No Assigned Volunteers Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Once NSTP coordinators assign students to this active deployment, they will appear here automatically.</p>
          </td>
        </tr>
      `;
    }
  }

  function renderEmptyDeployments() {
    const container = document.getElementById('deploymentMetaContainer');
    const tbody = document.getElementById('studentsTableBody');
    const selectorGroup = document.getElementById('deploymentSelectorGroup');
    const badge = document.getElementById('studentsTotalBadge');
    if (badge) badge.textContent = '0 Students';

    if (selectorGroup) {
      selectorGroup.style.display = 'none';
      selectorGroup.innerHTML = '';
    }

    if (container) {
      container.innerHTML = `
        <div class="deployment-hero-card" style="text-align: center; padding: 48px 24px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16, 185, 129, 0.12); color: #0B3D2E; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h3 style="color: var(--cwts-primary-dark, #0B3D2E); margin-bottom: 8px; font-weight: 700; font-size: 1.25rem;">No Active Deployment</h3>
          <p style="color: var(--text-muted); font-size: 0.9375rem; margin: 0 auto; max-width: 480px; line-height: 1.5;">There are no active deployments currently ongoing. Only active deployments and their live attendance hours are monitored on this page.</p>
        </div>
      `;
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No active deployment students to monitor at this time.
          </td>
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
