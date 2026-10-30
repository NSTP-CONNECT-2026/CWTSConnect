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
        loadDeployableRequests(),
        loadExistingDeployments()
      ]);

      // Handle hand-off from DSS Matching Engine via URL params
      const urlParams = new URLSearchParams(window.location.search);
      const reqId = urlParams.get('requestId');
      const studentIdsParam = urlParams.get('students');

      if (reqId) {
        // Activate Deploy tab
        const tabDeploy = document.getElementById('tabBtnDeploy');
        if (tabDeploy) tabDeploy.click();

        const preSelected = studentIdsParam ? studentIdsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
        await openAssignmentForRequest(reqId, preSelected);
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

    const searchInput = document.getElementById('deploymentSearchInput');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadExistingDeployments, 350);
      });
    }

    const cancelAssignmentBtn = document.getElementById('cancelAssignmentBtn');
    if (cancelAssignmentBtn) {
      cancelAssignmentBtn.addEventListener('click', closeAssignmentPanel);
    }

    const createDeploymentBtn = document.getElementById('createDeploymentBtn');
    if (createDeploymentBtn) {
      createDeploymentBtn.addEventListener('click', createDeployment);
    }

    const deploymentForm = document.getElementById('deploymentForm');
    if (deploymentForm) {
      deploymentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        createDeployment();
      });
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
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading approved requests...</td></tr>';
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
      const reqId = req.request_id || req.id;
      const startDate = req.preferred_start_date 
        ? req.preferred_start_date.split('T')[0] 
        : (req.target_start_date ? req.target_start_date.split('T')[0] : 'Flexible Schedule');
      const component = req.preferred_nstp_component || 'CWTS';
      const isAlreadyAssigned = req.deployment_status && req.deployment_status !== 'no_deployment';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(req.community_name || 'Community Partner')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
                <circle cx="12" cy="9" r="2.5"></circle>
              </svg>
              <span>Brgy. ${escapeHtml(req.barangay || 'N/A')}, ${escapeHtml(req.municipality || 'Paete')}</span>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${escapeHtml(req.activity_title)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              Schedule: <span style="font-weight: 600; color: var(--cwts-primary-dark);">${escapeHtml(startDate)}</span>
            </div>
          </td>
          <td>
            <span class="badge" style="background: rgba(47, 125, 91, 0.08); color: var(--cwts-primary-dark); border-color: rgba(47, 125, 91, 0.2); width: fit-content;">
              ${escapeHtml(req.activity_type || 'Community Service')}
            </span>
          </td>
          <td style="text-align: center;">
            ${isAlreadyAssigned ? `
              <span class="badge badge-verified" style="font-size: 0.75rem; padding: 6px 10px;">Already Deployed</span>
            ` : `
              <button type="button" class="btn btn-primary btn-sm btn-assign-req" data-request-id="${reqId}" style="white-space: nowrap;">
                <span>Assign Students →</span>
              </button>
            `}
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
          <td colspan="4" style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 1rem; margin-bottom: 4px;">No Approved Requests Awaiting Deployment</div>
            <p style="font-size: 0.8125rem; margin: 0;">Approved community requests ready for student deployment will appear here.</p>
          </td>
        </tr>
      `;
    }
  }

  async function openAssignmentForRequest(requestId, preSelectedStudents = []) {
    let req = deployableRequests.find(r => (r.request_id || r.id) === requestId);

    if (!req) {
      // Try to fetch request details directly if accessed via deep-link
      try {
        const directRes = await fetch(`/api/nstp/community-requests/${encodeURIComponent(requestId)}`);
        const directJson = await directRes.json();
        if (directJson.success && directJson.data) {
          req = directJson.data;
        }
      } catch (e) {
        console.warn('Could not fetch request directly:', e);
      }
    }

    if (!req) {
      showToast('Selected community request not found.', 'error');
      return;
    }

    currentRequestId = requestId;
    currentRequest = req;
    selectedStudents = Array.isArray(preSelectedStudents) && preSelectedStudents.length > 0 ? [...preSelectedStudents] : [];

    const assignmentSec = document.getElementById('assignmentSection');
    const infoEl = document.getElementById('assignmentInfo');
    const batchInput = document.getElementById('deploymentBatchName');
    const startDateInput = document.getElementById('deploymentStartDate');
    const endDateInput = document.getElementById('deploymentEndDate');
    const notesInput = document.getElementById('deploymentNotes');
    const scheduleTextEl = document.getElementById('autofillScheduleText');

    const defaultDate = (req.preferred_start_date || req.target_start_date || new Date().toISOString()).split('T')[0];
    const defaultEndDate = (req.preferred_end_date || defaultDate).split('T')[0];

    if (scheduleTextEl) {
      if (defaultDate === defaultEndDate) {
        scheduleTextEl.textContent = `${formatDateDisplay(defaultDate)}`;
      } else {
        scheduleTextEl.textContent = `${formatDateDisplay(defaultDate)} to ${formatDateDisplay(defaultEndDate)}`;
      }
    }

    if (infoEl) {
      infoEl.textContent = `${req.community_name || req.barangay || 'Community'} — ${req.activity_title}`;
    }

    if (batchInput) {
      batchInput.value = `CWTS - ${req.community_name || req.barangay || 'Deployment'} (${(req.activity_title || '').substring(0, 24)})`;
    }

    if (startDateInput) {
      startDateInput.value = defaultDate;
    }

    if (endDateInput) {
      endDateInput.value = defaultEndDate;
    }

    if (notesInput) {
      notesInput.value = req.special_instructions ? `Special Instructions: ${req.special_instructions}` : '';
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
    clearAssignmentAlert();
    updateSelectionCounter();
  }

  async function loadRecommendations(requestId) {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 28px; color: var(--text-muted);"><div class="spinner" style="margin: 0 auto 8px;"></div>Loading recommended students...</td></tr>';
    }

    try {
      const res = await fetch(`/api/nstp/deployments/recommendations/${encodeURIComponent(requestId)}`);
      const result = await res.json();

      let recs = [];
      if (result.success) {
        if (Array.isArray(result.data)) {
          recs = result.data;
        } else if (result.data && Array.isArray(result.data.recommendations)) {
          recs = result.data.recommendations;
        } else if (Array.isArray(result.recommendations)) {
          recs = result.recommendations;
        }
      }

      if (recs && recs.length > 0) {
        dssRecommendations = recs;

        // Auto-select recommended students by default if none preselected (up to quota needed)
        if (selectedStudents.length === 0) {
          const quota = Number(currentRequest?.students_needed) || 10;
          const topRecs = dssRecommendations.slice(0, quota);
          selectedStudents = topRecs.map(s => s.student_user_id || s.user_id || s.id);
        }

        renderRecommendations(dssRecommendations);
        updateSelectionCounter();
      } else {
        renderNoRecommendations();
        updateSelectionCounter();
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      renderNoRecommendations();
      updateSelectionCounter();
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
      const stId = s.student_user_id || s.user_id || s.id;
      let rawScore = s.suitability_score ?? s.suitabilityScore ?? s.total_score ?? s.final_score ?? s.match_score ?? s.totalScore ?? 0;
      let scoreNum = 0;
      if (rawScore <= 1 && rawScore > 0) {
        scoreNum = rawScore * 100;
      } else {
        scoreNum = Number(rawScore);
      }
      const formattedScore = scoreNum.toFixed(1);

      const isChecked = selectedStudents.includes(stId) ? 'checked' : '';
      const skillsText = typeof s.skills === 'string' ? s.skills : (Array.isArray(s.skills) ? s.skills.join(', ') : 'N/A');
      const locationText = s.municipality ? `${s.municipality}${s.province ? `, ${s.province}` : ''}` : 'Laguna';

      let scoreBadgeColor = 'var(--cwts-primary-dark)';
      if (scoreNum >= 70) scoreBadgeColor = '#10B981';
      else if (scoreNum >= 40) scoreBadgeColor = '#F59E0B';
      else scoreBadgeColor = '#6B7280';

      return `
        <tr data-student-id="${stId}">
          <td style="text-align: center;">
            <input type="checkbox" class="student-select-cb" value="${stId}" ${isChecked} />
          </td>
          <td style="font-weight: 800; color: var(--cwts-primary-dark, #0B3D2E);">#${rank}</td>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(s.full_name || s.student_name || 'Student Volunteer')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${escapeHtml(s.student_number || 'N/A')}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.8125rem;">${escapeHtml(s.course || 'BSIT')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.section || 'SMP A')} • ${escapeHtml(s.year_level || '1st Year')}</div>
          </td>
          <td>
            <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-main);">${escapeHtml(locationText)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;" title="${escapeHtml(skillsText)}">
              ${escapeHtml(skillsText)}
            </div>
          </td>
          <td style="text-align: center;">
            <div style="font-weight: 800; font-size: 1.0625rem; color: ${scoreBadgeColor}; white-space: nowrap;">${formattedScore}%</div>
            <div style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(s.match_label || 'Suitability')}</div>
          </td>
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

    // Row click toggles selection
    tbody.querySelectorAll('tr[data-student-id]').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function (e) {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.closest('input')) return;
        const cb = this.querySelector('.student-select-cb');
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  function renderNoRecommendations() {
    const tbody = document.getElementById('studentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem; margin-bottom: 4px;">No Available Students Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Ensure students have completed their profiles and CMO mandatory compliance requirements.</p>
          </td>
        </tr>
      `;
    }
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
    const selectAllCb = document.getElementById('selectAllCheckbox');
    const quota = Number(currentRequest?.students_needed) || 0;

    if (badge) {
      if (selectedStudents.length > 0) {
        if (quota > 0 && selectedStudents.length > quota) {
          badge.className = 'badge badge-inactive';
          badge.innerHTML = `<span id="selectionCount">${selectedStudents.length}</span> / ${quota} Quota Exceeded`;
        } else if (quota > 0) {
          badge.className = 'badge badge-verified';
          badge.innerHTML = `<span id="selectionCount">${selectedStudents.length}</span> / ${quota} Selected`;
        } else {
          badge.className = 'badge badge-verified';
          badge.innerHTML = `<span id="selectionCount">${selectedStudents.length}</span> Selected`;
        }
      } else {
        badge.className = 'badge badge-pending';
        badge.innerHTML = `<span id="selectionCount">0</span> Students Selected`;
      }
    }

    if (selectAllCb) {
      const allCbs = document.querySelectorAll('.student-select-cb');
      selectAllCb.checked = allCbs.length > 0 && selectedStudents.length === allCbs.length;
    }

    if (createBtn) {
      createBtn.style.opacity = selectedStudents.length === 0 ? '0.7' : '1';
    }
  }

  async function createDeployment() {
    clearAssignmentAlert();

    if (!currentRequestId) {
      showAssignmentAlert('Please select an approved request first.', 'error');
      showToast('Please select an approved request first.', 'error');
      return;
    }

    // Ensure distinct selected student IDs
    const uniqueStudents = [...new Set(selectedStudents.filter(Boolean))];

    if (uniqueStudents.length === 0) {
      showAssignmentAlert('Please select at least 1 student volunteer from the list.', 'error');
      showToast('Please select at least 1 student volunteer from the list.', 'error');
      return;
    }

    const quota = Number(currentRequest?.students_needed) || 0;
    if (quota > 0 && uniqueStudents.length > quota) {
      const excess = uniqueStudents.length - quota;
      const msg = `You selected ${uniqueStudents.length} students, but this request only needs ${quota}. Please uncheck ${excess} student(s).`;
      showAssignmentAlert(msg, 'error');
      showToast(msg, 'error');
      return;
    }

    const batchName = document.getElementById('deploymentBatchName')?.value?.trim();
    const startDate = (document.getElementById('deploymentStartDate')?.value || currentRequest?.preferred_start_date || currentRequest?.target_start_date || new Date().toISOString()).split('T')[0];
    let endDate = (document.getElementById('deploymentEndDate')?.value || currentRequest?.preferred_end_date || startDate).split('T')[0];
    if (endDate < startDate) {
      endDate = startDate;
    }
    const notes = document.getElementById('deploymentNotes')?.value?.trim() || '';

    if (!batchName) {
      showAssignmentAlert('Please enter a deployment batch name.', 'error');
      showToast('Please enter a deployment batch name.', 'error');
      document.getElementById('deploymentBatchName')?.focus();
      return;
    }

    const payload = {
      request_id: currentRequestId,
      deployment_batch_name: batchName,
      deployment_start_date: startDate,
      deployment_end_date: endDate,
      notes: notes,
      selected_students: uniqueStudents
    };

    const createBtn = document.getElementById('createDeploymentBtn');
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.innerHTML = '<span class="spinner" style="width:14px; height:14px; margin-right:6px;"></span> Creating Deployment...';
    }

    try {
      const res = await fetch('/api/nstp/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showAssignmentAlert('Deployment created successfully!', 'success');
        showToast('Deployment batch created and students assigned successfully!', 'success');

        setTimeout(async () => {
          closeAssignmentPanel();

          // Switch to Existing Deployments tab to see new batch
          const tabExisting = document.getElementById('tabBtnExisting');
          if (tabExisting) tabExisting.click();

          await Promise.all([
            loadDashboardSummary(),
            loadDeployableRequests(),
            loadExistingDeployments()
          ]);
        }, 700);
      } else {
        const errorMsg = data.message || 'Failed to create deployment';
        showAssignmentAlert(errorMsg, 'error');
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Create deployment error:', err);
      const errorMsg = err.message || 'Server error creating deployment.';
      showAssignmentAlert(errorMsg, 'error');
      showToast(errorMsg, 'error');
    } finally {
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Finalize & Create Deployment</span>
        `;
      }
    }
  }

  async function loadExistingDeployments() {
    const tbody = document.getElementById('deploymentsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading deployments...</td></tr>';
    }

    const filter = document.getElementById('deploymentStatusFilter')?.value || 'all';
    const search = document.getElementById('deploymentSearchInput')?.value?.trim() || '';

    try {
      const params = new URLSearchParams();
      if (filter && filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/nstp/deployments${qs}`);
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
      const studentCount = dep.assigned_students_count || dep.assigned_students || (Array.isArray(dep.students) ? dep.students.length : 0);
      const scheduleDisplay = dep.deployment_start_date
        ? new Date(dep.deployment_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(dep.deployment_batch_name)}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${escapeHtml(dep.activity_title || dep.community_name || 'Community Project')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(dep.barangay ? `Brgy. ${dep.barangay}, ${dep.municipality || ''}` : (dep.municipality || 'Paete, Laguna'))}</div>
          </td>
          <td style="font-size: 0.8125rem;">
            <div style="font-weight: 600;">${escapeHtml(scheduleDisplay)}</div>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 800; font-size: 1.0625rem; color: var(--cwts-primary-dark);">${studentCount}</span>
            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Students</div>
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
              <a href="view-deployment.html?id=${dep.deployment_id}" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.75rem;">
                Details
              </a>
              ${status === 'pending' ? `
                <button type="button" class="btn btn-secondary btn-sm btn-cancel-dep" data-dep-id="${dep.deployment_id}" style="padding: 4px 8px; font-size: 0.75rem; color: #DC2626; border-color: rgba(220, 38, 38, 0.25);">
                  Cancel
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach cancel action for pending deployments only
    tbody.querySelectorAll('.btn-cancel-dep').forEach(btn => {
      btn.addEventListener('click', function () {
        cancelPendingDeployment(this.getAttribute('data-dep-id'));
      });
    });
  }

  function renderEmptyExistingDeployments() {
    const tbody = document.getElementById('deploymentsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 1rem; margin-bottom: 4px;">No Deployments Found</div>
            <p style="font-size: 0.8125rem; margin: 0;">Created deployment batches will be tracked and managed here.</p>
          </td>
        </tr>
      `;
    }
  }

  async function cancelPendingDeployment(deploymentId) {
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
        await Promise.all([
          loadDashboardSummary(),
          loadDeployableRequests(),
          loadExistingDeployments()
        ]);
      } else {
        throw new Error(data.message || 'Cancellation failed');
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
        return '<span class="badge badge-verified" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; border-color: rgba(59, 130, 246, 0.25);">Completed</span>';
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
    toast.style.position = 'fixed';
    toast.style.top = '82px';
    toast.style.right = '24px';
    toast.style.zIndex = '99999';

    if (type === 'success') {
      toast.style.background = '#ECFDF5';
      toast.style.color = '#065F46';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    } else if (type === 'error') {
      toast.style.background = '#FEF2F2';
      toast.style.color = '#991B1B';
      toast.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    } else {
      toast.style.background = '#EFF6FF';
      toast.style.color = '#1E40AF';
      toast.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    }

    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4500);
  }

  function showAssignmentAlert(msg, type = 'error') {
    const alertEl = document.getElementById('assignmentAlert');
    if (!alertEl) return;

    alertEl.textContent = msg;
    if (type === 'success') {
      alertEl.style.background = 'rgba(16, 185, 129, 0.12)';
      alertEl.style.color = '#065F46';
      alertEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    } else if (type === 'error') {
      alertEl.style.background = 'rgba(239, 68, 68, 0.12)';
      alertEl.style.color = '#991B1B';
      alertEl.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    } else {
      alertEl.style.background = 'rgba(59, 130, 246, 0.12)';
      alertEl.style.color = '#1E40AF';
      alertEl.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    }
    alertEl.style.display = 'block';
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearAssignmentAlert() {
    const alertEl = document.getElementById('assignmentAlert');
    if (alertEl) {
      alertEl.textContent = '';
      alertEl.style.display = 'none';
    }
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return 'Flexible Date';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
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