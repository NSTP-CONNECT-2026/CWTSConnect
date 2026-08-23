/**
 * CWTSConnect — NSTP Coordinator Deployment Management Controller
 * Handles:
 *  - Approved Community Requests Review
 *  - DSS Recommended Student Selection & Ranking
 *  - Final Deployment Assignment Creation
 *  - Real-time Deployment Status Tracking & Management
 */

(function () {
  'use strict';

  let currentRequestId = null;
  let currentRequest = null;
  let deployableRequests = [];
  let dssRecommendations = [];
  let selectedStudents = [];
  let existingDeployments = [];

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupEventListeners();
    showLoading();
    try {
      await Promise.all([
        loadDashboardSummary(),
        loadDeployableRequests(),
        loadExistingDeployments()
      ]);

      // Handle hand-off from DSS Matching Engine
      const urlParams = new URLSearchParams(window.location.search);
      const reqId = urlParams.get('requestId');
      const studentIdsParam = urlParams.get('students');
      if (reqId) {
        await openAssignmentForRequest(reqId);
        if (studentIdsParam) {
          const preSelected = studentIdsParam.split(',').map(s => s.trim()).filter(Boolean);
          selectedStudents = preSelected;
          document.querySelectorAll('.student-select-cb').forEach(cb => {
            cb.checked = selectedStudents.includes(cb.value);
          });
          updateSelectionCounter();
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
      showToast('Failed to initialize deployments data.', 'error');
    } finally {
      hideLoading();
    }
  }

  function setupEventListeners() {
    // Tab Switcher Handling
    const tabBtns = document.querySelectorAll('.deployment-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetTab = this.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.deployment-tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');
      });
    });

    const refreshRequestsBtn = document.getElementById('refreshRequestsBtn');
    if (refreshRequestsBtn) {
      refreshRequestsBtn.addEventListener('click', loadDeployableRequests);
    }

    const refreshDeploymentsBtn = document.getElementById('refreshDeploymentsBtn');
    if (refreshDeploymentsBtn) {
      refreshDeploymentsBtn.addEventListener('click', loadExistingDeployments);
    }

    const statusFilter = document.getElementById('deploymentStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', loadExistingDeployments);
    }

    const cancelAssignmentBtn = document.getElementById('cancelAssignmentBtn');
    if (cancelAssignmentBtn) {
      cancelAssignmentBtn.addEventListener('click', closeAssignmentPanel);
    }

    const createDeploymentBtn = document.getElementById('createDeploymentBtn');
    if (createDeploymentBtn) {
      createDeploymentBtn.addEventListener('click', createDeployment);
    }

    const selectTopBtn = document.getElementById('selectAllRecommendedBtn');
    if (selectTopBtn) {
      selectTopBtn.addEventListener('click', selectTopRecommended);
    }

    const selectAllCb = document.getElementById('selectAllCheckbox');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function () {
        toggleSelectAll(this.checked);
      });
    }
  }

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

  async function loadDashboardSummary() {
    try {
      const res = await fetch('/api/nstp/deployments/summary');
      const result = await res.json();
      if (result.success && result.data) {
        const s = result.data;
        setElText('totalDeployments', s.total_deployments || 0);
        setElText('activeDeployments', (s.active_deployments || 0) + (s.ongoing_deployments || 0));
        setElText('pendingDeployments', s.pending_deployments || 0);
        setElText('assignedStudents', s.assigned_students || 0);
      }
    } catch (err) {
      console.warn('Error loading summary:', err);
    }
  }

  async function loadDeployableRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading approved requests...</td></tr>';
    }

    try {
      const res = await fetch('/api/nstp/deployments/deployable-requests');
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        deployableRequests = result.data;
        setElText('requestsCountBadge', deployableRequests.length);
        renderDeployableRequests(deployableRequests);
      } else {
        setElText('requestsCountBadge', 0);
        renderEmptyRequests();
      }
    } catch (err) {
      console.error('Error loading deployable requests:', err);
      setElText('requestsCountBadge', 0);
      renderEmptyRequests();
    }
  }

  function renderDeployableRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
      renderEmptyRequests();
      return;
    }

    tbody.innerHTML = requests.map(req => {
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E);">${escapeHtml(req.community_name || 'Barangay Community')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Brgy. ${escapeHtml(req.barangay || '')}, ${escapeHtml(req.municipality || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(req.activity_title)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(req.target_start_date ? req.target_start_date.split('T')[0] : 'Scheduled')}</div>
          </td>
          <td>${escapeHtml(req.activity_type || 'CWTS Activity')}</td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-primary btn-sm btn-assign-req" data-request-id="${req.request_id || req.id}">
              <span>Assign Students →</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click events
    tbody.querySelectorAll('.btn-assign-req').forEach(btn => {
      btn.addEventListener('click', function () {
        const reqId = this.getAttribute('data-request-id');
        openAssignmentForRequest(reqId);
      });
    });
  }

  function renderEmptyRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark);">No Approved Requests Awaiting Deployment</div>
            <p style="font-size: 0.8125rem; margin: 0;">Approved community requests ready for student deployment will appear here.</p>
          </td>
        </tr>
      `;
    }
  }

  async function openAssignmentForRequest(requestId) {
    const req = deployableRequests.find(r => (r.request_id || r.id) === requestId);
    if (!req) return;

    currentRequestId = requestId;
    currentRequest = req;
    selectedStudents = [];

    const assignmentSec = document.getElementById('assignmentSection');
    const infoEl = document.getElementById('assignmentInfo');
    const batchInput = document.getElementById('deploymentBatchName');

    if (infoEl) {
      infoEl.textContent = `Target: ${req.community_name || 'Community'} — ${req.activity_title}`;
    }

    if (batchInput) {
      batchInput.value = `CWTS - ${req.community_name || req.barangay || 'Deployment'} (${req.activity_title.substring(0, 24)})`;
    }

    if (assignmentSec) {
      assignmentSec.classList.remove('hidden');
      assignmentSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateSelectionCounter();

    // Load recommendations
    await loadRecommendations(requestId);
  }

  function closeAssignmentPanel() {
    const assignmentSec = document.getElementById('assignmentSection');
    if (assignmentSec) {
      assignmentSec.classList.add('hidden');
    }
    currentRequestId = null;
    currentRequest = null;
    selectedStudents = [];
  }

  async function loadRecommendations(requestId) {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Running DSS matching & ranking students...</td></tr>';
    }

    try {
      const res = await fetch(`/api/nstp/deployments/recommendations/${encodeURIComponent(requestId)}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        dssRecommendations = result.data;
        renderRecommendations(dssRecommendations);
      } else {
        renderNoRecommendations();
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      renderNoRecommendations();
    }
  }

  function renderRecommendations(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (!students || students.length === 0) {
      renderNoRecommendations();
      return;
    }

    tbody.innerHTML = students.map((s, idx) => {
      const rank = idx + 1;
      const score = Math.round((s.total_score || s.final_score || s.match_score || 0) * 100);

      return `
        <tr data-student-id="${s.student_user_id || s.user_id || s.id}">
          <td style="text-align: center;">
            <input type="checkbox" class="student-select-cb" value="${s.student_user_id || s.user_id || s.id}" />
          </td>
          <td style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E);">#${rank}</td>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(s.full_name || s.name || 'Student Volunteer')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.student_number || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(s.course || 'BSIT')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Sec ${escapeHtml(s.section || '1')} (Yr ${escapeHtml(s.year_level || '1')})</div>
          </td>
          <td style="font-weight: 800; font-size: 1rem; color: var(--cwts-primary-dark);">${score}%</td>
        </tr>
      `;
    }).join('');

    // Attach checkbox events
    tbody.querySelectorAll('.student-select-cb').forEach(cb => {
      cb.addEventListener('change', function () {
        const stId = this.value;
        if (this.checked) {
          if (!selectedStudents.includes(stId)) selectedStudents.push(stId);
        } else {
          selectedStudents = selectedStudents.filter(id => id !== stId);
        }
        updateSelectionCounter();
      });
    });
  }

  function renderNoRecommendations() {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark);">No Eligible Students Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Ensure students have completed their profiles and compliance requirements.</p>
          </td>
        </tr>
      `;
    }
  }

  function selectTopRecommended() {
    if (dssRecommendations.length === 0) return;
    const topCount = Math.min(15, dssRecommendations.length);
    const topStudents = dssRecommendations.slice(0, topCount);

    selectedStudents = topStudents.map(s => s.student_user_id || s.user_id || s.id);

    const cbs = document.querySelectorAll('.student-select-cb');
    cbs.forEach(cb => {
      cb.checked = selectedStudents.includes(cb.value);
    });

    updateSelectionCounter();
  }

  function toggleSelectAll(checked) {
    const cbs = document.querySelectorAll('.student-select-cb');
    selectedStudents = [];
    cbs.forEach(cb => {
      cb.checked = checked;
      if (checked) selectedStudents.push(cb.value);
    });
    updateSelectionCounter();
  }

  function updateSelectionCounter() {
    setElText('selectionCount', selectedStudents.length);
    const badge = document.getElementById('selectionCountBadge');
    const createBtn = document.getElementById('createDeploymentBtn');

    if (badge) {
      if (selectedStudents.length > 0) {
        badge.className = 'badge badge-verified';
      } else {
        badge.className = 'badge badge-inactive';
      }
    }

    if (createBtn) {
      createBtn.disabled = selectedStudents.length === 0;
    }
  }

  async function createDeployment() {
    if (!currentRequestId || selectedStudents.length === 0) {
      showToast('Please select at least 1 student volunteer for deployment.', 'error');
      return;
    }

    const batchName = document.getElementById('deploymentBatchName')?.value?.trim();
    const notes = document.getElementById('deploymentNotes')?.value?.trim() || '';

    if (!batchName) {
      showToast('Please provide a deployment batch name.', 'error');
      document.getElementById('deploymentBatchName')?.focus();
      return;
    }

    const deploymentDate = (currentRequest && currentRequest.target_start_date)
      ? currentRequest.target_start_date.split('T')[0]
      : new Date().toISOString().split('T')[0];

    const payload = {
      request_id: currentRequestId,
      deployment_batch_name: batchName,
      deployment_start_date: deploymentDate,
      deployment_end_date: deploymentDate,
      notes: notes,
      selected_students: selectedStudents
    };

    const createBtn = document.getElementById('createDeploymentBtn');
    if (createBtn) createBtn.disabled = true;

    try {
      const res = await fetch('/api/nstp/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Deployment batch created and students assigned successfully!', 'success');
        closeAssignmentPanel();
        await Promise.all([
          loadDashboardSummary(),
          loadDeployableRequests(),
          loadExistingDeployments()
        ]);
      } else {
        throw new Error(data.message || 'Failed to create deployment');
      }
    } catch (err) {
      console.error('Create deployment error:', err);
      showToast(err.message || 'Server error creating deployment.', 'error');
      if (createBtn) createBtn.disabled = false;
    }
  }

  async function loadExistingDeployments() {
    const tbody = document.getElementById('deploymentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading deployments...</td></tr>';
    }

    const filter = document.getElementById('deploymentStatusFilter')?.value || 'all';

    try {
      const url = filter && filter !== 'all' ? `/api/nstp/deployments?status=${encodeURIComponent(filter)}` : '/api/nstp/deployments';
      const res = await fetch(url);
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        existingDeployments = result.data;
        setElText('deploymentsCountBadge', existingDeployments.length);
        renderExistingDeployments(existingDeployments);
      } else {
        setElText('deploymentsCountBadge', 0);
        renderEmptyExistingDeployments();
      }
    } catch (err) {
      console.error('Error loading existing deployments:', err);
      setElText('deploymentsCountBadge', 0);
      renderEmptyExistingDeployments();
    }
  }

  function renderExistingDeployments(deployments) {
    const tbody = document.getElementById('deploymentsTableBody');
    if (!tbody) return;

    if (!deployments || deployments.length === 0) {
      renderEmptyExistingDeployments();
      return;
    }

    tbody.innerHTML = deployments.map(dep => {
      const status = dep.deployment_status || 'pending';
      const statusBadge = getStatusBadge(status);
      const studentCount = dep.assigned_students_count || (Array.isArray(dep.students) ? dep.students.length : 0);
      const depDate = dep.deployment_start_date 
        ? dep.deployment_start_date.split('T')[0] 
        : (dep.target_start_date ? dep.target_start_date.split('T')[0] : 'Scheduled');

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(dep.deployment_batch_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${escapeHtml(dep.deployment_id || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(dep.activity_title || dep.community_name || 'Community Project')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(dep.barangay ? `Brgy. ${dep.barangay}` : '')}</div>
          </td>
          <td style="font-size: 0.8125rem;">${escapeHtml(depDate)}</td>
          <td>
            <span style="font-weight: 800; color: var(--cwts-primary-dark);">${studentCount}</span> Students
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
              <a href="view-deployment.html?id=${dep.deployment_id}" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">
                Details
              </a>
              ${status === 'pending' ? `
                <button type="button" class="btn btn-primary btn-sm btn-activate-dep" data-dep-id="${dep.deployment_id}" style="padding: 4px 8px; font-size: 0.75rem;">
                  Activate
                </button>
              ` : ''}
              ${status === 'active' || status === 'ongoing' ? `
                <button type="button" class="btn btn-secondary btn-sm btn-complete-dep" data-dep-id="${dep.deployment_id}" style="padding: 4px 8px; font-size: 0.75rem; color: #10B981;">
                  Complete
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach status actions
    tbody.querySelectorAll('.btn-activate-dep').forEach(btn => {
      btn.addEventListener('click', function () {
        updateDeploymentStatus(this.getAttribute('data-dep-id'), 'active');
      });
    });

    tbody.querySelectorAll('.btn-complete-dep').forEach(btn => {
      btn.addEventListener('click', function () {
        updateDeploymentStatus(this.getAttribute('data-dep-id'), 'completed');
      });
    });
  }

  function renderEmptyExistingDeployments() {
    const tbody = document.getElementById('deploymentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark);">No Deployments Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Created deployment batches will be tracked and managed here.</p>
          </td>
        </tr>
      `;
    }
  }

  async function updateDeploymentStatus(deploymentId, newStatus) {
    if (!confirm(`Are you sure you want to mark this deployment as ${newStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`/api/nstp/deployments/${encodeURIComponent(deploymentId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Deployment marked as ${newStatus}!`, 'success');
        await Promise.all([
          loadDashboardSummary(),
          loadExistingDeployments()
        ]);
      } else {
        throw new Error(data.message || 'Status update failed');
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.message || 'Error updating status.', 'error');
    }
  }

  function getStatusBadge(status) {
    switch (status.toLowerCase()) {
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
    }, 4500);
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