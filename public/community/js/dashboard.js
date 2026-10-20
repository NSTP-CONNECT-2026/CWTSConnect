/**
 * CWTSConnect — Community Official Dashboard Controller
 * Manages:
 *  - Fetching community official profile & request summary data
 *  - Rendering 2x2 summary cards: Submitted Requests, Deployments, Assigned Students, Notifications
 *  - Toggling Section 12 Skeleton Loaders
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const dashboardSkeleton = document.getElementById('dashboardSkeleton');
  const dashboardContent = document.getElementById('dashboardContent');
  const refreshNotifsBtn = document.getElementById('refreshNotifsBtn');

  // Load Dashboard Data
  loadCommunityDashboard();

  if (refreshNotifsBtn) {
    refreshNotifsBtn.addEventListener('click', function () {
      this.disabled = true;
      this.textContent = 'Refreshing...';
      loadCommunityDashboard().finally(() => {
        this.disabled = false;
        this.textContent = 'Refresh Feed';
      });
    });
  }

  /**
   * Fetches official info and request statistics concurrently
   */
  async function loadCommunityDashboard() {
    showLoading();

    try {
      // 1. Fetch user account data
      const userPromise = fetch('/api/community/me', {
        method: 'GET',
        credentials: 'include'
      });

      // 2. Fetch request summary statistics
      const statsPromise = fetch('/api/community/request-summary', {
        method: 'GET',
        credentials: 'include'
      });

      const [userRes, statsRes] = await Promise.all([userPromise, statsPromise]);

      if (userRes.status === 401 || userRes.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const userData = await userRes.json();
      let statsData = { data: {} };

      if (statsRes.ok) {
        try {
          statsData = await statsRes.json();
        } catch (e) {
          console.warn('Could not parse summary json:', e);
        }
      }

      renderDashboard(userData.data || {}, statsData.data || {});

    } catch (error) {
      console.error('Error loading community dashboard:', error);
    } finally {
      hideLoading();
    }
  }

  /**
   * Populates the 4 summary cards with real data
   */
  function renderDashboard(user, stats) {
    // 1. Submitted Requests Summary
    const totalRequests = Number(stats.total_requests || 0);
    const pendingRequests = Number(stats.pending_requests || 0);
    const approvedRequests = Number(stats.approved_requests || 0);
    const rejectedRequests = Number(stats.rejected_requests || 0);

    const totalEl = document.getElementById('totalRequestsVal');
    const pendingEl = document.getElementById('pendingRequestsVal');
    const approvedEl = document.getElementById('approvedRequestsVal');
    const rejectedEl = document.getElementById('rejectedRequestsVal');
    const requestsBadge = document.getElementById('requestsBadge');

    if (totalEl) totalEl.textContent = totalRequests;
    if (pendingEl) pendingEl.textContent = `${pendingRequests} Pending`;
    if (approvedEl) approvedEl.textContent = `${approvedRequests} Approved`;
    if (rejectedEl) rejectedEl.textContent = `${rejectedRequests} Rejected`;

    if (requestsBadge) {
      if (pendingRequests > 0) {
        requestsBadge.textContent = `${pendingRequests} Under Review`;
        requestsBadge.className = 'badge badge-pending';
      } else if (approvedRequests > 0) {
        requestsBadge.textContent = `${approvedRequests} Active Requests`;
        requestsBadge.className = 'badge badge-complete';
      } else {
        requestsBadge.textContent = 'Ready to Submit';
        requestsBadge.className = 'badge badge-complete';
      }
    }

    // 2. Active Deployments Summary
    const ongoingDeployments = Number(stats.ongoing_deployments || 0);
    const scheduledDeployments = Number(stats.scheduled_deployments || 0);
    const completedProjects = Number(stats.completed_deployments ?? stats.completed_activities ?? 0);

    const ongoingEl = document.getElementById('ongoingDeploymentsVal');
    const scheduledEl = document.getElementById('scheduledActivitiesVal');
    const completedEl = document.getElementById('completedProjectsVal');
    const statusTextEl = document.getElementById('deploymentStatusText');
    const deploymentsBadge = document.getElementById('deploymentsBadge');

    if (ongoingEl) ongoingEl.textContent = `${ongoingDeployments} Active`;
    if (scheduledEl) scheduledEl.textContent = `${scheduledDeployments} Scheduled`;
    if (completedEl) completedEl.textContent = `${completedProjects} Projects`;

    if (statusTextEl) {
      if (ongoingDeployments > 0) {
        statusTextEl.textContent = 'Active Community Deployment';
      } else if (scheduledDeployments > 0) {
        statusTextEl.textContent = 'Upcoming Scheduled Deployment';
      } else if (completedProjects > 0) {
        statusTextEl.textContent = 'Completed Project Activities';
      } else {
        statusTextEl.textContent = 'Ready for Deployment';
      }
    }

    if (deploymentsBadge) {
      if (ongoingDeployments > 0) {
        deploymentsBadge.textContent = 'Active Operations';
        deploymentsBadge.className = 'badge badge-complete';
      } else if (scheduledDeployments > 0) {
        deploymentsBadge.textContent = 'Scheduled';
        deploymentsBadge.className = 'badge badge-pending';
      } else if (completedProjects > 0) {
        deploymentsBadge.textContent = 'Completed';
        deploymentsBadge.className = 'badge badge-complete';
      } else {
        deploymentsBadge.textContent = 'Standing By';
        deploymentsBadge.className = 'badge badge-pending';
      }
    }

    // 3. Assigned Students Summary (Accurate Real Database Metrics)
    const assignedStudents = Number(stats.assigned_students || 0);
    const hoursRendered = Number(stats.total_hours_rendered || 0);
    const verifiedAttCount = Number(stats.verified_attendance_count || 0);
    const totalAttCount = Number(stats.attendance_records_count || 0);
    const attRate = Number(stats.attendance_rate != null ? stats.attendance_rate : 100);

    const assignedStudentsEl = document.getElementById('assignedStudentsVal');
    const hoursEl = document.getElementById('renderedHoursVal');
    const attendanceEl = document.getElementById('attendanceRateVal');

    if (assignedStudentsEl) {
      assignedStudentsEl.textContent = `${assignedStudents} ${assignedStudents === 1 ? 'Volunteer' : 'Volunteers'}`;
    }
    if (hoursEl) {
      hoursEl.textContent = `${hoursRendered.toFixed(1)} Hrs`;
    }
    if (attendanceEl) {
      attendanceEl.textContent = totalAttCount > 0 
        ? `${attRate}% Rate (${verifiedAttCount}/${totalAttCount} Verified)` 
        : '100% Rate';
    }

    // 4. Update Notifications Feed
    updateNotificationFeed(user, stats);
  }

  /**
   * Generates dynamic notification feed items
   */
  function updateNotificationFeed(user, stats) {
    const feedList = document.getElementById('notifFeedList');
    if (!feedList) return;

    const notifs = [];

    if (stats.pending_requests > 0) {
      notifs.push({
        title: `You have ${stats.pending_requests} pending activity request(s) awaiting NSTP Coordinator review.`,
        time: 'Pending Action',
        unread: true
      });
    }

    if (stats.approved_requests > 0) {
      notifs.push({
        title: `${stats.approved_requests} request(s) approved and matched for CWTS student deployment.`,
        time: 'Deployment Update',
        unread: false
      });
    }

    notifs.push({
      title: 'Welcome to CWTSConnect Community Official Portal.',
      time: 'System Notice',
      unread: false
    });

    feedList.innerHTML = notifs.map(n => `
      <div class="notif-feed-item ${n.unread ? 'unread' : ''}">
        <div class="notif-feed-title">${escapeHtml(n.title)}</div>
        <div class="notif-feed-time">${escapeHtml(n.time)}</div>
      </div>
    `).join('');
  }

  function showLoading() {
    if (dashboardSkeleton) dashboardSkeleton.style.display = 'block';
    if (dashboardContent) dashboardContent.classList.add('hidden');
  }

  function hideLoading() {
    if (dashboardSkeleton) dashboardSkeleton.style.display = 'none';
    if (dashboardContent) dashboardContent.classList.remove('hidden');
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

});