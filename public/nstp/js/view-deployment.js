/**
 * CWTSConnect — NSTP Coordinator Deployment Details Controller
 */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const deploymentId = urlParams.get('id');

  let deploymentData = null;
  let liveTimerInterval = null;

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    if (!deploymentId) {
      showToast('No deployment ID specified.', 'error');
      setTimeout(() => {
        window.location.href = 'deployment-management.html';
      }, 1500);
      return;
    }

    const refreshBtn = document.getElementById('refreshDeploymentBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('i');
        if (icon) icon.classList.add('fa-spin');
        try {
          await loadDeploymentDetails(deploymentId);
          showToast('Deployment details refreshed', 'info');
        } catch (e) {
          console.error(e);
        } finally {
          if (icon) icon.classList.remove('fa-spin');
        }
      });
    }

    showLoading();
    try {
      await loadDeploymentDetails(deploymentId);
    } catch (err) {
      console.error('Error loading deployment details:', err);
      showToast('Failed to load deployment details.', 'error');
    } finally {
      hideLoading();
    }
  }

  function showLoading() {
    const skeleton = document.getElementById('deploymentDetailsSkeleton');
    const content = document.getElementById('deploymentDetailsContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('deploymentDetailsSkeleton');
    const content = document.getElementById('deploymentDetailsContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadDeploymentDetails(id) {
    try {
      const res = await fetch(`/api/nstp/deployments/${encodeURIComponent(id)}`);
      const result = await res.json();

      if (result.success && result.data) {
        deploymentData = result.data;
        renderHeroCard(deploymentData);
        renderStudentsTable(deploymentData.students || deploymentData.assigned_students || []);
        renderStatusControls(deploymentData.deployment_status);
      } else {
        throw new Error(result.message || 'Deployment not found');
      }
    } catch (err) {
      console.error('Fetch deployment error:', err);
      showToast(err.message || 'Error loading deployment.', 'error');
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

  function renderHeroCard(dep) {
    const container = document.getElementById('deploymentHeroContainer');
    if (!container) return;

    const scheduleDate = formatDateDisplay(dep.deployment_start_date || dep.deployment_date) || 'N/A';
    const status = dep.deployment_status || 'pending';
    const statusBadge = getStatusBadge(status);
    const studentCount = (dep.students || dep.assigned_students || []).length;

    let locationText = '';
    if (dep.barangay) {
      locationText = dep.barangay.toLowerCase().startsWith('brgy') ? dep.barangay : `Brgy. ${dep.barangay}`;
    } else if (dep.community_name) {
      locationText = dep.community_name;
    } else {
      locationText = 'Barangay Community';
    }
    if (dep.municipality) {
      locationText += `, ${dep.municipality}`;
    }
    if (dep.province) {
      locationText += `, ${dep.province}`;
    }

    let activityType = dep.activity_type || 'CWTS Community Service';
    const customMatch = (dep.notes || '').match(/\[CUSTOM_REQUEST_TYPE:([^\]]+)\]/);
    if (customMatch && customMatch[1]) {
      activityType = customMatch[1].trim();
    }

    let cleanNotes = (dep.notes || '')
      .replace(/\[CUSTOM_REQUEST_TYPE:[^\]]+\]/g, '')
      .replace(/Special Instructions:\s*/i, '')
      .trim();

    container.innerHTML = `
      <div class="deployment-hero-card">
        <div class="deployment-hero-header">
          <div>
            <div class="deployment-hero-title">${escapeHtml(dep.activity_title || dep.deployment_batch_name)}</div>
            <div class="deployment-hero-subtitle">${escapeHtml(locationText)} • Batch: ${escapeHtml(dep.deployment_batch_name)}</div>
          </div>
          <div>${statusBadge}</div>
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
            <strong style="color: var(--cwts-primary-dark);">Coordinator Notes:</strong> ${escapeHtml(cleanNotes)}
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
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No student volunteers assigned to this deployment batch yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const todayAtt = s.today_attendance;
      const checkInTime = todayAtt ? todayAtt.check_in_time : null;
      const checkOutTime = todayAtt ? todayAtt.check_out_time : null;
      const attDate = todayAtt ? todayAtt.attendance_date : null;
      const createdAt = todayAtt ? (todayAtt.created_at || todayAtt.updated_at) : null;
      const isLive = isSessionLive(checkInTime, checkOutTime);
      const baseHours = Number(s.hours_rendered || s.total_hours_rendered || 0);

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
                Sec ${escapeHtml(s.section || '1')}${yearFormatted ? ` • ${escapeHtml(yearFormatted)}` : ''}
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

  function renderStatusControls(status) {
    const group = document.getElementById('statusControlGroup');
    if (!group) return;

    if (status === 'pending') {
      group.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btnCancel" style="color: #DC2626; border-color: rgba(220, 38, 38, 0.35);">
          Cancel Deployment
        </button>
      `;
    } else {
      group.innerHTML = '';
    }

    const btnCanc = document.getElementById('btnCancel');
    if (btnCanc) {
      btnCanc.addEventListener('click', () => cancelDeployment());
    }
  }

  async function cancelDeployment() {
    if (!confirm('Are you sure you want to cancel this pending deployment? Assigned students will be released.')) return;

    try {
      const res = await fetch(`/api/nstp/deployments/${encodeURIComponent(deploymentId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Pending deployment cancelled successfully.', 'info');
        await loadDeploymentDetails(deploymentId);
      } else {
        throw new Error(data.message || 'Failed to cancel deployment');
      }
    } catch (err) {
      console.error('Cancel deployment error:', err);
      showToast(err.message || 'Error cancelling deployment.', 'error');
    }
  }

  function getStatusBadge(status) {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'ongoing':
        return '<span class="badge badge-verified">Active</span>';
      case 'completed':
        return '<span class="badge badge-verified" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; border-color: rgba(59, 130, 246, 0.2);">Completed</span>';
      case 'cancelled':
        return '<span class="badge badge-inactive">Cancelled</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending</span>';
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