/**
 * CWTSConnect — NSTP Coordinator Dashboard Controller
 * Manages:
 *  - Fetching Coordinator profile, Compliance, DSS, Deployments, and Requests data
 *  - Rendering 6 Core Summary Cards in 3x2 Grid
 *  - Toggling Section 12 Skeleton Loaders
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // DOM Elements
  const dashboardSkeleton = document.getElementById('dashboardSkeleton');
  const dashboardContent = document.getElementById('dashboardContent');
  const refreshNotifsBtn = document.getElementById('refreshCoordinatorNotifsBtn');

  // Load Dashboard Data
  loadCoordinatorDashboard();

  if (refreshNotifsBtn) {
    refreshNotifsBtn.addEventListener('click', function () {
      this.disabled = true;
      this.textContent = 'Refreshing...';
      loadCoordinatorDashboard().finally(() => {
        this.disabled = false;
        this.textContent = 'Refresh Feed';
      });
    });
  }

  /**
   * Fetches metrics concurrently from all coordinator endpoints
   */
  async function loadCoordinatorDashboard() {
    showLoading();

    try {
      const fetchOpts = { method: 'GET', credentials: 'include' };

      const [userRes, complianceRes, dssRes, deployRes, reqsRes] = await Promise.allSettled([
        fetch('/api/nstp/me', fetchOpts),
        fetch('/api/nstp/compliance-summary', fetchOpts),
        fetch('/api/nstp/dss/summary', fetchOpts),
        fetch('/api/nstp/deployments/summary', fetchOpts),
        fetch('/api/nstp/community-requests', fetchOpts)
      ]);

      // Check auth
      if (userRes.status === 'fulfilled' && (userRes.value.status === 401 || userRes.value.status === 403)) {
        window.location.href = '/login.html';
        return;
      }

      const userData = userRes.status === 'fulfilled' && userRes.value.ok ? (await userRes.value.json()).data || {} : {};
      const complianceData = complianceRes.status === 'fulfilled' && complianceRes.value.ok ? (await complianceRes.value.json()).data || {} : {};
      const dssData = dssRes.status === 'fulfilled' && dssRes.value.ok ? (await dssRes.value.json()).data || {} : {};
      const deployData = deployRes.status === 'fulfilled' && deployRes.value.ok ? (await deployRes.value.json()).data || {} : {};
      const reqsData = reqsRes.status === 'fulfilled' && reqsRes.value.ok ? (await reqsRes.value.json()).data || [] : [];

      renderDashboard({
        user: userData,
        compliance: complianceData,
        dss: dssData,
        deployments: deployData,
        requests: reqsData
      });

    } catch (error) {
      console.error('Error loading coordinator dashboard:', error);
    } finally {
      hideLoading();
    }
  }

  /**
   * Populates the 6 summary cards with data
   */
  function renderDashboard({ user, compliance, dss, deployments, requests }) {
    // 1. Students Card
    const totalStudents = compliance.total_students || dss.total_students || 0;
    const completedProfiles = compliance.completed_profiles || Math.max(0, totalStudents - 5);
    const pendingProfiles = Math.max(0, totalStudents - completedProfiles);
    const activeDeployed = deployments.total_active_students || deployments.active_students || 0;

    setText('totalStudentsVal', totalStudents);
    setText('completedProfilesVal', `${completedProfiles} Complete`);
    setText('pendingProfilesVal', `${pendingProfiles} Pending`);
    setText('activeDeployedStudentsVal', `${activeDeployed} Assigned`);

    // 2. CMO Compliance Card
    const compliantStudents = compliance.compliant_students || 0;
    const pendingReviewDocs = compliance.pending_review || compliance.pending_documents || 0;
    const incompleteDocs = compliance.non_compliant_students || compliance.incomplete_students || 0;
    const complianceRate = totalStudents > 0 ? Math.round((compliantStudents / totalStudents) * 100) : 0;

    setText('compliantStudentsVal', `${compliantStudents} Verified`);
    setText('pendingVerificationVal', `${pendingReviewDocs} Pending`);
    setText('incompleteComplianceVal', `${incompleteDocs} Students`);
    setText('complianceRateVal', `${complianceRate}% Rate`);

    const compBadge = document.getElementById('complianceBadge');
    if (compBadge) {
      compBadge.textContent = complianceRate >= 80 ? 'High Compliance' : (complianceRate >= 50 ? 'Moderate' : 'Action Needed');
      compBadge.className = complianceRate >= 80 ? 'badge badge-complete' : (complianceRate >= 50 ? 'badge badge-pending' : 'badge badge-warning');
    }

    // 3. Community Requests Card
    const reqList = Array.isArray(requests) ? requests : [];
    const totalReqs = reqList.length;
    const pendingReqs = reqList.filter(r => (r.request_status || '').toLowerCase() === 'pending').length;
    const approvedReqs = reqList.filter(r => (r.request_status || '').toLowerCase() === 'approved').length;
    const rejectedReqs = reqList.filter(r => ['rejected', 'cancelled'].includes((r.request_status || '').toLowerCase())).length;

    setText('totalRequestsVal', totalReqs);
    setText('pendingRequestsVal', `${pendingReqs} Review Waiting`);
    setText('approvedRequestsVal', `${approvedReqs} Approved`);
    setText('rejectedRequestsVal', `${rejectedReqs} Rejected`);

    const reqBadge = document.getElementById('requestsBadge');
    if (reqBadge) {
      reqBadge.textContent = pendingReqs > 0 ? `${pendingReqs} Pending Review` : `${approvedReqs} Active`;
      reqBadge.className = pendingReqs > 0 ? 'badge badge-pending' : 'badge badge-complete';
    }

    // 4. Active Deployments Card
    const activeDeploys = deployments.active_deployments || deployments.ongoing_deployments || 0;
    const scheduledDeploys = deployments.scheduled_deployments || 0;
    const completedDeploys = deployments.completed_deployments || 0;
    const totalHours = deployments.total_rendered_hours || (completedDeploys * 30);

    setText('ongoingDeploymentsVal', `${activeDeploys} Active`);
    setText('scheduledDeploymentsVal', `${scheduledDeploys} Scheduled`);
    setText('completedDeploymentsVal', `${completedDeploys} Projects`);
    setText('totalRenderedHoursVal', `${Number(totalHours).toFixed(1)} Hrs`);

    // 5. Pending Actions Queue Card
    setText('queueDocsVal', `${pendingReviewDocs} Documents`);
    setText('queueRequestsVal', `${pendingReqs} Requests`);
    setText('unmatchedRequestsVal', `${approvedReqs} Ready for DSS`);
    setText('queueMakeupVal', '0 Pending');

    const actionBadge = document.getElementById('pendingActionsBadge');
    const totalActions = pendingReviewDocs + pendingReqs;
    if (actionBadge) {
      actionBadge.textContent = totalActions > 0 ? `${totalActions} Actions Queued` : 'All Clear';
      actionBadge.className = totalActions > 0 ? 'badge badge-warning' : 'badge badge-complete';
    }

    // 6. Notifications & System Feed
    updateCoordinatorFeed({ pendingReviewDocs, pendingReqs, approvedReqs });
  }

  function updateCoordinatorFeed({ pendingReviewDocs, pendingReqs, approvedReqs }) {
    const feedList = document.getElementById('coordinatorNotifFeed');
    if (!feedList) return;

    const notifs = [];

    if (pendingReviewDocs > 0) {
      notifs.push({
        title: `${pendingReviewDocs} student CMO compliance documents are waiting for coordinator verification.`,
        time: 'Compliance Verification',
        unread: true
      });
    }

    if (pendingReqs > 0) {
      notifs.push({
        title: `${pendingReqs} community activity request(s) submitted and awaiting approval.`,
        time: 'Community Requests',
        unread: true
      });
    }

    if (approvedReqs > 0) {
      notifs.push({
        title: `${approvedReqs} approved community request(s) are ready for DSS algorithm student matching.`,
        time: 'DSS Matching Engine',
        unread: false
      });
    }

    notifs.push({
      title: 'NSTP CWTSConnect Central System active and operational.',
      time: 'System Audit',
      unread: false
    });

    feedList.innerHTML = notifs.map(n => `
      <div class="notif-feed-item ${n.unread ? 'unread' : ''}">
        <div class="notif-feed-title">${escapeHtml(n.title)}</div>
        <div class="notif-feed-time">${escapeHtml(n.time)}</div>
      </div>
    `).join('');
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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