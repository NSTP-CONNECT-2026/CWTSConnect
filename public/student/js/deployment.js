/**
 * deployment.js — Student Deployment & Monitoring Controller
 * Handles:
 *  - 3-Tab switcher: Overview (Deployment Info), Attendance, Service Hours
 *  - Real-time Check-In / Check-Out operations and Live Clock
 *  - Attendance Records and Metrics summary
 *  - Rendered Hours Tracker (target 90.0 hrs) & Breakdown
 *  - Slide-out Notifications Center (Requirements, Deployment, Attendance, Hours, Evaluation)
 */

document.addEventListener('DOMContentLoaded', () => {
  initDeploymentController();
});

let currentStudentUser = null;
let currentDeploymentData = null;
let currentDeploymentId = null;
let activeAttendanceRecord = null;
let liveClockInterval = null;

function initDeploymentController() {
  setupTabSwitcher();
  setupNotificationsDrawer();
  setupLiveClock();
  setupLogout();

  // Load core student data
  loadStudentData();
}

/**
 * TAB SWITCHER
 */
function setupTabSwitcher() {
  const tabs = document.querySelectorAll('.deployment-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const targetTab = this.getAttribute('data-tab');
      window.switchDeploymentTab(targetTab);
    });
  });

  // Check URL parameter for initial tab e.g. ?tab=attendance
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab');
  if (initialTab && ['overview', 'attendance', 'hours'].includes(initialTab)) {
    window.switchDeploymentTab(initialTab);
  }
}

window.switchDeploymentTab = function (tabName) {
  const tabs = document.querySelectorAll('.deployment-tab-btn');
  const panes = document.querySelectorAll('.deployment-tab-pane');

  tabs.forEach(t => {
    const isTarget = t.getAttribute('data-tab') === tabName;
    t.classList.toggle('active', isTarget);
    t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  panes.forEach(p => {
    const paneTab = p.id.replace('pane', '').toLowerCase();
    p.classList.toggle('active', paneTab === tabName.toLowerCase());
  });

  // Update URL without full refresh
  const url = new URL(window.location);
  url.searchParams.set('tab', tabName);
  window.history.replaceState({}, '', url);
};

/**
 * AUTHENTICATION & DATA FETCHING
 */
async function loadStudentData() {
  const skeleton = document.getElementById('deploymentSkeleton');
  const content = document.getElementById('deploymentContent');

  if (skeleton) skeleton.style.display = 'block';
  if (content) content.classList.add('hidden');

  try {
    const res = await fetch('/api/student/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();
    if (!data.success || !data.user) {
      window.location.href = '/login.html';
      return;
    }

    currentStudentUser = data.user;
    updateUserHeader(currentStudentUser);

    // 1. Fetch deployment details first to set currentDeploymentId
    await loadCurrentDeployment(currentStudentUser.user_id);

    // 2. Fetch attendance, hours, and notifications with deployment context
    await Promise.allSettled([
      loadAttendanceData(currentStudentUser.user_id),
      loadServiceHoursData(currentStudentUser.user_id),
      loadNotifications()
    ]);

  } catch (err) {
    console.error('Failed to load student monitoring data:', err);
  } finally {
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }
}

function updateUserHeader(user) {
  const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';
  const topbarEmail = document.getElementById('topbarEmail');
  const headerAvatar = document.getElementById('headerUserAvatar');

  if (topbarEmail) topbarEmail.textContent = user.email || 'student@domain.com';
  if (headerAvatar) headerAvatar.textContent = emailPrefix.substring(0, 2).toUpperCase();

  // Profile link state
  const profileNavLink = document.getElementById('profileNavLink');
  const profileNavLabel = document.getElementById('profileNavLabel');
  if (user.profile_status === 'complete') {
    if (profileNavLink) profileNavLink.href = 'profile.html';
    if (profileNavLabel) profileNavLabel.textContent = 'My Profile';
  } else {
    if (profileNavLink) profileNavLink.href = 'complete-profile.html';
    if (profileNavLabel) profileNavLabel.textContent = 'Complete Profile';
  }
}

/**
 * 1. DEPLOYMENT OVERVIEW LOADER
 */
async function loadCurrentDeployment(userId) {
  const noDeploymentState = document.getElementById('noDeploymentState');
  const activeDeploymentCard = document.getElementById('activeDeploymentCard');

  try {
    const res = await fetch(`/api/nstp/deployments/student/${userId}/current`, {
      method: 'GET',
      credentials: 'include'
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        currentDeploymentData = json.data;
        const dep = json.data.deployment || {};
        const req = dep.community_request || {};
        currentDeploymentId = dep.deployment_id;

        if (noDeploymentState) noDeploymentState.classList.add('hidden');
        if (activeDeploymentCard) activeDeploymentCard.classList.remove('hidden');

        // Populate fields
        setText('deployActivityTitle', req.activity_title || dep.deployment_batch_name || 'Community CWTS Activity');
        setText('deployBatchName', dep.deployment_batch_name || 'Batch Deployment');
        setText('deployCommunityName', req.community_name || 'Partner Community');

        // Parse custom activity type if present in special_instructions / notes
        let activityType = req.activity_type || 'CWTS Community Service';
        const notes = req.special_instructions || req.notes || '';
        const customMatch = notes.match(/\[CUSTOM_REQUEST_TYPE:\s*([^\]]+)\]/i);
        if (customMatch && customMatch[1]) {
          activityType = customMatch[1].trim();
        }
        setText('deployActivityType', activityType);

        const locationStr = [req.barangay, req.municipality, req.province].filter(Boolean).join(', ') || 'Assigned Location';
        setText('deployLocation', locationStr);

        const startStr = dep.deployment_start_date ? formatDate(dep.deployment_start_date) : '';
        const endStr = dep.deployment_end_date ? formatDate(dep.deployment_end_date) : '';
        let schedStr = 'Scheduled';
        if (startStr && endStr && startStr !== endStr) {
          schedStr = `${startStr} – ${endStr}`;
        } else if (startStr) {
          schedStr = startStr;
        }
        setText('deployDateRange', schedStr);

        // Schedule / Time
        const schedVal = req.preferred_schedule || 'Flexible / As Scheduled';
        setText('deploySchedule', schedVal);

        const statusBadge = document.getElementById('deployStatusBadge');
        if (statusBadge) {
          const st = json.data.deployment_student_status || dep.deployment_status || 'active';
          statusBadge.textContent = capitalize(st);
          statusBadge.className = `badge badge-${st === 'active' ? 'active' : st === 'completed' ? 'complete' : 'pending'}`;
        }

        const studentStatusEl = document.getElementById('deployStudentStatus');
        if (studentStatusEl) {
          const studentSt = json.data.deployment_student_status || dep.deployment_status || 'active';
          studentStatusEl.textContent = capitalize(studentSt) + ' Volunteer';
        }

        return;
      }
    }

    // If no active deployment
    if (noDeploymentState) noDeploymentState.classList.remove('hidden');
    if (activeDeploymentCard) activeDeploymentCard.classList.add('hidden');

  } catch (err) {
    console.warn('Deployment status error:', err);
    if (noDeploymentState) noDeploymentState.classList.remove('hidden');
    if (activeDeploymentCard) activeDeploymentCard.classList.add('hidden');
  }
}

/**
 * 2. ATTENDANCE ACTIONS & HISTORY
 */
async function loadAttendanceData(userId) {
  const tableBody = document.getElementById('attendanceHistoryBody');
  const totalDaysBadge = document.getElementById('attendanceCountBadge');
  const statTotalDays = document.getElementById('statTotalDays');
  const statVerifiedDays = document.getElementById('statVerifiedDays');
  const statPendingDays = document.getElementById('statPendingDays');
  const statActiveStatus = document.getElementById('statActiveStatus');

  try {
    const res = await fetch('/api/attendance/my-attendance', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.ok) {
      const json = await res.json();
      const records = json.data || json.attendance || [];

      // Update badge
      if (totalDaysBadge) totalDaysBadge.textContent = `${records.length} Days`;
      if (statTotalDays) statTotalDays.textContent = records.length;

      let verifiedCount = 0;
      let pendingCount = 0;
      let hasActiveCheckIn = false;

      const todayStr = new Date().toISOString().split('T')[0];

      records.forEach(r => {
        const isVerified = Boolean(
          r.verification_status === 'verified' ||
          r.verified_at ||
          r.verified_by ||
          (r.student_remarks && /\[CREDITED:[0-9.]+\]/i.test(r.student_remarks))
        );

        if (isVerified) verifiedCount++;
        else pendingCount++;

        // Check if currently checked in today without checkout
        if (r.attendance_date === todayStr && r.check_in_time && !r.check_out_time) {
          hasActiveCheckIn = true;
          activeAttendanceRecord = r;
        }
      });

      if (statVerifiedDays) statVerifiedDays.textContent = verifiedCount;
      if (statPendingDays) statPendingDays.textContent = pendingCount;
      if (statActiveStatus) statActiveStatus.textContent = hasActiveCheckIn ? 'Active' : 'None';

      updateCheckInHeroState(hasActiveCheckIn, activeAttendanceRecord);

      // Render table
      if (tableBody) {
        if (records.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 28px 16px;">
                <div class="table-empty-title">No Attendance Records Yet</div>
                <div class="table-empty-desc">Attendance logged by the Community Official will appear here.</div>
              </td>
            </tr>
          `;
        } else {
          tableBody.innerHTML = records.map(r => {
            const dateStr = formatDate(r.attendance_date);
            const inTime = formatTime(r.check_in_time);
            const outTime = formatTime(r.check_out_time);

            // Parse [CREDITED:X.X] in remarks / student_remarks
            const combinedRemarks = `${r.remarks || ''} ${r.student_remarks || ''}`;
            const credMatch = combinedRemarks.match(/\[CREDITED:([0-9.]+)\]/i);
            let durationHours = null;
            if (credMatch && credMatch[1]) {
              durationHours = parseFloat(credMatch[1]);
            } else if (r.hours_rendered != null && !isNaN(parseFloat(r.hours_rendered))) {
              durationHours = parseFloat(r.hours_rendered);
            }

            const durationStr = durationHours != null ? `${durationHours.toFixed(1)} hrs` : (r.check_out_time ? 'Completed' : 'Ongoing');

            const isVerified = Boolean(
              r.verification_status === 'verified' ||
              r.verified_at ||
              r.verified_by ||
              credMatch
            );
            const badgeClass = isVerified ? 'badge-complete' : 'badge-pending';
            const badgeLabel = isVerified ? 'Verified' : 'Pending';

            let cleanRemarks = (r.remarks || r.student_remarks || 'Standard Session')
              .replace(/\[CREDITED:[0-9.]+\]/gi, '')
              .trim();
            if (!cleanRemarks) cleanRemarks = isVerified ? 'Verified by Community Official' : 'Standard Session';

            return `
              <tr>
                <td data-label="Activity Date"><strong>${dateStr}</strong></td>
                <td data-label="Time In">${inTime}</td>
                <td data-label="Time Out">${outTime}</td>
                <td data-label="Duration"><strong>${durationStr}</strong></td>
                <td data-label="Remarks" class="td-remarks">
                  <div class="table-remarks-content">
                    <span class="remarks-text">${escapeHtml(cleanRemarks)}</span>
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.warn('Attendance load error:', err);
  }
}

function updateCheckInHeroState() {
  const title = document.getElementById('checkInStatusTitle');
  const desc = document.getElementById('checkInStatusDesc');
  const badgeNoDep = document.getElementById('badgeNoDeployment');
  const badgeActiveDep = document.getElementById('badgeActiveDeployment');
  const iconBadge = document.getElementById('checkInIconBadge');

  if (!currentDeploymentId) {
    if (title) title.textContent = 'Attendance Monitoring Inactive';
    if (desc) desc.textContent = 'You do not have an active deployment assignment yet. Attendance monitoring will begin once assigned to a community project.';
    if (badgeNoDep) badgeNoDep.classList.remove('hidden');
    if (badgeActiveDep) badgeActiveDep.classList.add('hidden');
    if (iconBadge) {
      iconBadge.style.color = '#94A3B8';
      iconBadge.style.background = 'rgba(0, 0, 0, 0.05)';
      iconBadge.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    }
    return;
  }

  // Active deployment exists - Community Official records attendance on-site
  if (badgeNoDep) badgeNoDep.classList.add('hidden');
  if (badgeActiveDep) badgeActiveDep.classList.remove('hidden');

  if (title) title.textContent = 'Official Attendance Recording';
  if (desc) desc.textContent = 'Daily attendance and credited service hours are recorded and verified directly on-site by your assigned Barangay / Community Official.';
  if (iconBadge) {
    iconBadge.style.color = '#10B981';
    iconBadge.style.background = 'rgba(16, 185, 129, 0.12)';
    iconBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
  }
}

/**
 * 3. SERVICE HOURS LOADER
 */
async function loadServiceHoursData(userId) {
  const hoursBadge = document.getElementById('hoursCountBadge');
  const hoursBigNumber = document.getElementById('hoursCompletedNumber');
  const totalSessionsVal = document.getElementById('hoursTotalSessions');
  const tableBody = document.getElementById('serviceSessionsBody');

  try {
    const res = await fetch('/api/rendered-hours/my-hours', {
      method: 'GET',
      credentials: 'include'
    });

    let completedHours = 0;
    let totalSessions = 0;
    let sessions = [];

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        completedHours = Number(
          json.data.total_hours_rendered ??
          json.data.total_hours_verified ??
          json.data.total_completed_hours ??
          json.data.total_hours ??
          0
        );
        sessions = json.data.sessions || [];
        totalSessions = Number(json.data.total_sessions || sessions.length);
      }
    }

    if (hoursBadge) hoursBadge.textContent = `${completedHours.toFixed(1)}h`;
    if (hoursBigNumber) hoursBigNumber.textContent = completedHours.toFixed(1);
    if (totalSessionsVal) totalSessionsVal.textContent = `${totalSessions} ${totalSessions === 1 ? 'Session' : 'Sessions'}`;

    if (tableBody) {
      if (sessions.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 28px 16px;">
              <div class="table-empty-title">No Logged Service Sessions</div>
              <div class="table-empty-desc">Hours rendered during community deployment activities will appear here.</div>
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = sessions.map(s => {
          const isVerified = s.is_verified !== false;
          const badgeClass = isVerified ? 'badge-complete' : 'badge-pending';
          const badgeLabel = isVerified ? 'Verified' : 'Pending';

          return `
            <tr>
              <td data-label="Service Date"><strong>${formatDate(s.date || s.created_at)}</strong></td>
              <td data-label="Activity Type" class="td-activity">
                <div class="table-activity-content">
                  <div class="activity-title">${escapeHtml(s.activity_name || 'Community Service Session')}</div>
                  ${s.remarks ? `<div class="activity-subtitle">${escapeHtml(s.remarks)}</div>` : ''}
                </div>
              </td>
              <td data-label="Hours Rendered"><strong>${Number(s.hours || 0).toFixed(1)} hrs</strong></td>
              <td data-label="Status"><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.warn('Service hours load error:', err);
  }
}

/**
 * 4. NOTIFICATIONS DRAWER
 */
function setupNotificationsDrawer() {
  const notifBtn = document.getElementById('headerNotifBtn');
  const drawer = document.getElementById('notifDrawer');
  const closeBtn = document.getElementById('closeNotifDrawerBtn');
  const overlay = document.getElementById('mobileOverlay');

  if (notifBtn && drawer) {
    notifBtn.addEventListener('click', () => {
      drawer.classList.add('active');
      if (overlay) overlay.classList.add('active');
    });
  }

  if (closeBtn && drawer) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
    });
  }
}

async function loadNotifications() {
  const list = document.getElementById('notifDrawerList');
  const dot = document.getElementById('headerNotifDot');

  try {
    const res = await fetch('/api/notifications/my-notifications', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.ok) {
      const json = await res.json();
      const notifs = json.data || [];

      if (notifs.length > 0) {
        if (dot) dot.style.display = 'block';
        if (list) {
          list.innerHTML = notifs.map(n => {
            const type = (n.notification_type || n.type || 'requirements').toLowerCase();
            let iconClass = 'requirements';
            if (type.includes('deploy')) iconClass = 'deployment';
            else if (type.includes('attend')) iconClass = 'attendance';
            else if (type.includes('hour')) iconClass = 'hours';
            else if (type.includes('eval')) iconClass = 'evaluation';

            return `
              <div class="notif-card-item ${n.is_read ? '' : 'unread'}">
                <div class="notif-type-icon ${iconClass}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${escapeHtml(n.title || 'System Notification')}</div>
                  <div style="font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4;">${escapeHtml(n.message || '')}</div>
                  <div style="font-size: 0.6875rem; color: #94A3B8; margin-top: 6px;">${formatDate(n.created_at || new Date())}</div>
                </div>
              </div>
            `;
          }).join('');
        }
        return;
      }
    }
  } catch (err) {
    console.warn('Notifications load fallback:', err);
  }

  // Default system notice
  if (list) {
    list.innerHTML = `
      <div class="notif-card-item">
        <div class="notif-type-icon deployment">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div>
          <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-main);">Welcome to CWTSConnect</div>
          <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px;">Stay updated on your CMO requirements, deployment assignments, and service hours right here.</div>
          <div style="font-size: 0.6875rem; color: #94A3B8; margin-top: 6px;">Today</div>
        </div>
      </div>
    `;
  }
}

/**
 * LIVE CLOCK TICKER
 */
function setupLiveClock() {
  const ticker = document.getElementById('liveClockTicker');
  if (!ticker) return;

  function update() {
    const now = new Date();
    ticker.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  update();
  if (liveClockInterval) clearInterval(liveClockInterval);
  liveClockInterval = setInterval(update, 1000);
}

/**
 * LOGOUT HANDLER
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } finally {
        window.location.href = '/login.html';
      }
    });
  }
}

/**
 * HELPERS
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(timeString) {
  if (!timeString || timeString === '---' || String(timeString).toUpperCase() === 'N/A' || String(timeString).toUpperCase() === 'N\\A') {
    return '---';
  }
  const trimmed = String(timeString).trim();
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ap}`;
    }
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = String(parseInt(match[2], 10)).padStart(2, '0');
  const modifier = match[4] ? match[4].toUpperCase() : null;
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
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

function showToast(msg, type = 'info') {
  if (window.showStudentToast) {
    window.showStudentToast(msg, type);
    return;
  }
  const container = document.getElementById('messageContainer');
  const content = document.getElementById('messageContent');
  const text = document.getElementById('messageText');

  if (container && content && text) {
    text.textContent = msg;
    content.className = `message-content ${type}`;
    container.style.display = 'block';

    setTimeout(() => {
      container.style.display = 'none';
    }, 3800);
  }
}
