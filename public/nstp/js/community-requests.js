/**
 * CWTSConnect — NSTP Coordinator Community Request Management Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Manages:
 *  - Fetching community requests & statistics
 *  - Filtering by search text, status, and activity type
 *  - Inspecting community request details in modal
 *  - Coordinator Approve / Reject decision actions
 *  - Section 12 Skeleton loading
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global Data
  let allRequests = [];
  let allRequestTypes = [];
  let allSkills = [];
  let modalSelectedSkills = [];
  let deleteTargetTypeId = null;
  let deleteTargetSkillId = null;

  const AVAILABLE_SKILLS = [
    'Teaching',
    'Computer Literacy',
    'Public Speaking',
    'Leadership',
    'First Aid',
    'Documentation',
    'Event Management',
    'Photography',
    'Video Editing',
    'Social Media Management',
    'Data Entry',
    'Survey Conducting',
    'Community Organizing',
    'Environmental Awareness',
    'Health Education'
  ];

  // DOM Elements - Main Requests View
  const requestsSkeleton = document.getElementById('requestsSkeleton');
  const requestsContent = document.getElementById('requestsContent');
  const requestsMainView = document.getElementById('requestsMainView');
  const requestsTableCard = document.getElementById('requestsTableCard');
  const requestsTable = document.getElementById('requestsTable');
  const requestsTableBody = document.getElementById('requestsTableBody');
  const requestsEmptyState = document.getElementById('requestsEmptyState');

  // Filter & Status Pill Elements
  const searchInput = document.getElementById('requestsSearchInput');
  const countAll = document.getElementById('countAll');
  const countPending = document.getElementById('countPending');
  const countApproved = document.getElementById('countApproved');
  const countRejected = document.getElementById('countRejected');

  // Subpage Elements - Request Types & Skills (School Offered Services)
  const btnRequestType = document.getElementById('btnRequestType');
  const requestTypesSubpageView = document.getElementById('requestTypesSubpageView');
  const btnBackToRequests = document.getElementById('btnBackToRequests');
  const subtabRequestTypes = document.getElementById('subtabRequestTypes');
  const subtabSkills = document.getElementById('subtabSkills');
  const countRequestTypes = document.getElementById('countRequestTypes');
  const countSkillsBadge = document.getElementById('countSkillsBadge');
  const btnOpenAddTypeModal = document.getElementById('btnOpenAddTypeModal');
  const btnOpenAddSkillModal = document.getElementById('btnOpenAddSkillModal');

  // Request Types Section Elements
  const requestTypesSectionView = document.getElementById('requestTypesSectionView');
  const searchRequestTypesInput = document.getElementById('searchRequestTypesInput');
  const requestTypesTable = document.getElementById('requestTypesTable');
  const requestTypesTableBody = document.getElementById('requestTypesTableBody');
  const requestTypesEmptyState = document.getElementById('requestTypesEmptyState');

  // Request Type Modal Elements
  const requestTypeModal = document.getElementById('requestTypeModal');
  const requestTypeModalTitle = document.getElementById('requestTypeModalTitle');
  const requestTypeForm = document.getElementById('requestTypeForm');
  const editingTypeId = document.getElementById('editingTypeId');
  const inputTypeName = document.getElementById('inputTypeName');
  const inputTypeDesc = document.getElementById('inputTypeDesc');
  const selectSkillDropdown = document.getElementById('selectSkillDropdown');
  const selectedSkillsBadgeList = document.getElementById('selectedSkillsBadgeList');
  const btnSaveRequestType = document.getElementById('btnSaveRequestType');
  const btnSaveRequestTypeText = document.getElementById('btnSaveRequestTypeText');

  // Delete Type Modal Elements
  const deleteTypeModal = document.getElementById('deleteTypeModal');
  const deleteTypeNameTarget = document.getElementById('deleteTypeNameTarget');
  const btnConfirmDeleteType = document.getElementById('btnConfirmDeleteType');

  // Skills Masterlist Section Elements
  const skillsSectionView = document.getElementById('skillsSectionView');
  const searchSkillsInput = document.getElementById('searchSkillsInput');
  const skillsTable = document.getElementById('skillsTable');
  const skillsTableBody = document.getElementById('skillsTableBody');
  const skillsEmptyState = document.getElementById('skillsEmptyState');

  // Skill Modal Elements
  const skillModal = document.getElementById('skillModal');
  const skillModalTitle = document.getElementById('skillModalTitle');
  const skillForm = document.getElementById('skillForm');
  const editingSkillId = document.getElementById('editingSkillId');
  const inputSkillName = document.getElementById('inputSkillName');
  const inputSkillDesc = document.getElementById('inputSkillDesc');
  const btnSaveSkill = document.getElementById('btnSaveSkill');
  const btnSaveSkillText = document.getElementById('btnSaveSkillText');

  // Delete Skill Modal Elements
  const deleteSkillModal = document.getElementById('deleteSkillModal');
  const deleteSkillNameTarget = document.getElementById('deleteSkillNameTarget');
  const btnConfirmDeleteSkill = document.getElementById('btnConfirmDeleteSkill');

  let currentStatusFilter = 'all';

  // Modal Elements - Inspect Request
  const inspectModal = document.getElementById('inspectRequestModal');
  const inspectModalBody = document.getElementById('inspectModalBody');
  const inspectModalFooter = document.getElementById('inspectModalFooter');

  // Toast message elements
  const messageContainer = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  const messageContent = document.getElementById('messageContent');
  const messageClose = document.getElementById('messageClose');

  if (messageClose) {
    messageClose.addEventListener('click', () => {
      messageContainer.style.display = 'none';
    });
  }

  // Initialize Page
  init();

  async function init() {
    setupFilters();
    setupSubpageNavigation();
    initSkillDropdown();
    setupRequestTypeEvents();
    setupSkillEvents();

    showLoading();
    await loadCommunityRequests();
    hideLoading();

    // Direct hash access support
    if (window.location.hash === '#request-types') {
      switchToRequestTypesSubpage('types');
    } else if (window.location.hash === '#skills') {
      switchToRequestTypesSubpage('skills');
    }
  }

  async function loadCommunityRequests() {
    try {
      const res = await fetch('/api/nstp/community-requests', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      allRequests = (result.success && Array.isArray(result.data)) ? result.data : [];

      updateStats(allRequests);
      applyFilters();
    } catch (err) {
      console.error('Error loading community requests:', err);
      renderTable([]);
    }
  }

  function updateStats(requests) {
    const total = requests.length;
    const pending = requests.filter(r => (r.request_status || '').toLowerCase() === 'pending').length;
    const approved = requests.filter(r => (r.request_status || '').toLowerCase() === 'approved').length;
    const rejected = requests.filter(r => ['rejected', 'cancelled'].includes((r.request_status || '').toLowerCase())).length;

    if (countAll) countAll.textContent = total;
    if (countPending) countPending.textContent = pending;
    if (countApproved) countApproved.textContent = approved;
    if (countRejected) countRejected.textContent = rejected;
  }

  function setupFilters() {
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    // Status Pill Buttons (Left side)
    const pillButtons = document.querySelectorAll('.status-pill-btn');
    pillButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetStatus = this.getAttribute('data-status') || 'all';
        currentStatusFilter = targetStatus;

        pillButtons.forEach(b => {
          const isSelected = (b === this);
          b.classList.toggle('active', isSelected);
          b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });

        applyFilters();
      });
    });
  }

  function applyFilters() {
    const q = (searchInput && typeof searchInput.value === 'string' ? searchInput.value : '').toLowerCase().trim();
    const status = currentStatusFilter || 'all';

    const filtered = allRequests.filter(r => {
      const title = (r.activity_title || '').toLowerCase();
      const community = (r.community_name || '').toLowerCase();
      const brgy = (r.barangay || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const rStatus = (r.request_status || '').toLowerCase();

      const searchMatch = !q || title.includes(q) || community.includes(q) || brgy.includes(q) || desc.includes(q);
      
      let statusMatch = true;
      if (status === 'all') {
        statusMatch = true;
      } else if (status === 'pending') {
        statusMatch = rStatus === 'pending';
      } else if (status === 'approved') {
        statusMatch = rStatus === 'approved';
      } else if (status === 'rejected') {
        statusMatch = ['rejected', 'cancelled'].includes(rStatus);
      }

      return searchMatch && statusMatch;
    });

    renderTable(filtered);
  }

  function renderTable(requests) {
    if (!requestsTableBody) return;

    if (!requests || requests.length === 0) {
      requestsTableBody.innerHTML = '';
      if (requestsTable) requestsTable.style.display = 'none';
      if (requestsEmptyState) requestsEmptyState.classList.remove('hidden');
      return;
    }

    if (requestsTable) requestsTable.style.display = 'table';
    if (requestsEmptyState) requestsEmptyState.classList.add('hidden');

    requestsTableBody.innerHTML = requests.map(r => {
      const title = escapeHtml(r.activity_title || 'Untitled Community Project');
      const community = escapeHtml(r.community_name || 'Community Partner');
      const type = escapeHtml(r.activity_type || 'General CWTS');
      const location = `${escapeHtml(r.barangay || '---')}, ${escapeHtml(r.municipality || '---')}`;
      const province = escapeHtml(r.province || 'Philippines');
      const studentsNeeded = r.students_needed || r.required_students || 0;
      const status = (r.request_status || 'pending').toLowerCase();
      const requestId = r.request_id || r.id;

      let badgeHtml = '';
      if (status === 'approved') {
        badgeHtml = '<span class="badge badge-approved">Approved</span>';
      } else if (status === 'pending') {
        badgeHtml = '<span class="badge badge-pending">Pending</span>';
      } else if (status === 'rejected') {
        badgeHtml = '<span class="badge badge-rejected">Rejected</span>';
      } else {
        const displayStatus = status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Pending';
        badgeHtml = `<span class="badge badge-cancelled">${escapeHtml(displayStatus)}</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.875rem;">${community}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">CWTS Community Partner</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${title}</div>
            <div style="margin-top: 4px;">
              <span class="user-code-tag">${type}</span>
            </div>
          </td>
          <td>
            <div style="font-weight: 500;">${location}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${province}</div>
          </td>
          <td>
            ${badgeHtml}
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-icon-action action-view" title="Inspect & Review Request" aria-label="Inspect & Review Request" onclick="window.inspectRequest('${escapeHtml(String(requestId))}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Inspect Community Request Details Modal
   */
  window.inspectRequest = async function (requestId) {
    if (!inspectModal || !inspectModalBody) return;

    inspectModalBody.innerHTML = '<div class="skeleton-card" style="padding: 24px; height: 260px;"></div>';
    inspectModal.classList.add('active');

    try {
      const res = await fetch(`/api/nstp/community-requests/${encodeURIComponent(requestId)}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        const r = result.data;
        const status = (r.request_status || 'pending').toLowerCase();
        const isPending = status === 'pending';

        let skills = [];
        const rawSkills = r.needed_skills || r.skills_required;
        if (Array.isArray(rawSkills)) skills = rawSkills;
        else if (typeof rawSkills === 'string' && rawSkills) skills = rawSkills.split(',').map(x => x.trim()).filter(Boolean);

        const dateRaw = r.preferred_start_date || r.target_start_date;
        const startDate = dateRaw ? new Date(dateRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible';
        const endDateRaw = r.preferred_end_date || r.target_end_date;
        const endDate = (endDateRaw && endDateRaw !== dateRaw) ? new Date(endDateRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        inspectModalBody.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(226, 232, 240, 0.8); padding-bottom: 12px;">
              <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--cwts-primary-dark);">${escapeHtml(r.activity_title)}</h3>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px;">
                  <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.community_name)}</span> • <span class="user-code-tag">${escapeHtml(r.activity_type)}</span>
                </div>
              </div>
              <div>
                ${status === 'approved' ? '<span class="badge badge-approved">Approved</span>' : (status === 'pending' ? '<span class="badge badge-pending">Pending</span>' : '<span class="badge badge-rejected">Rejected</span>')}
              </div>
            </div>

            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Location Address</span><span class="meta-value">${escapeHtml(r.community_address || r.complete_address || '')}, ${escapeHtml(r.barangay || '')}, ${escapeHtml(r.municipality || '')}, ${escapeHtml(r.province || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Target Schedule</span><span class="meta-value">${endDate ? `${startDate} &mdash; ${endDate}` : startDate}</span></div>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Activity Scope & Description:</span>
              <p style="font-size: 0.875rem; color: var(--text-main); margin-top: 6px; line-height: 1.5; background: rgba(248, 250, 252, 0.85); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(226, 232, 240, 0.9);">
                ${escapeHtml(r.activity_description || r.description || 'No detailed scope provided.')}
              </p>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Relevant Skills Desired:</span>
              <div class="skills-tags-wrap" style="margin-top: 8px;">
                ${skills.length > 0 ? skills.map(sk => `<span class="skill-tag" style="cursor: default;">${escapeHtml(sk)}</span>`).join('') : '<span class="user-sub-meta">Any willing volunteers</span>'}
              </div>
            </div>

            ${isPending ? `
              <div class="form-group" style="margin-top: 8px;">
                <label class="form-label" style="font-size: 0.75rem;">Coordinator Feedback / Reason (Optional):</label>
                <input type="text" id="requestFeedback_${requestId}" class="form-input" placeholder="e.g. Validated with local barangay, approved for DSS matching." />
              </div>
            ` : ''}
          </div>
        `;

        if (inspectModalFooter) {
          if (isPending) {
            inspectModalFooter.innerHTML = `
              <button type="button" class="btn btn-secondary" onclick="closeInspectModal()">Cancel</button>
              <button type="button" class="btn btn-secondary" style="color: #DC2626; border-color: rgba(239, 68, 68, 0.4);" onclick="window.submitRequestDecision('${requestId}', 'reject')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Reject Request</span>
              </button>
              <button type="button" class="btn btn-primary" onclick="window.submitRequestDecision('${requestId}', 'approve')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Approve for DSS Matching</span>
              </button>
            `;
          } else {
            inspectModalFooter.innerHTML = `
              <button type="button" class="btn btn-secondary" onclick="closeInspectModal()">Close</button>
            `;
          }
        }
      } else {
        inspectModalBody.innerHTML = '<p style="color: #DC2626;">Unable to load request details.</p>';
      }
    } catch (err) {
      console.error('Inspect error:', err);
      inspectModalBody.innerHTML = '<p style="color: #DC2626;">Connection error while retrieving request details.</p>';
    }
  };

  function closeInspectModal() {
    if (inspectModal) inspectModal.classList.remove('active');
  }
  window.closeInspectModal = closeInspectModal;

  // Support both aliases for inspect modal
  window.openInspectModal = window.inspectRequest;

  /**
   * Submit Decision (Approve / Reject)
   */
  window.submitRequestDecision = async function (requestId, action) {
    if (!requestId) return;

    const feedbackInput = document.getElementById(`requestFeedback_${requestId}`);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';

    const actionText = action === 'approve' ? 'approve this community request for DSS matching' : 'reject this community request';
    if (!confirm(`Are you sure you want to ${actionText}?`)) return;

    const actionButtons = inspectModalFooter ? inspectModalFooter.querySelectorAll('button') : [];
    actionButtons.forEach(btn => btn.disabled = true);

    try {
      const endpoint = action === 'approve' 
        ? `/api/nstp/community-requests/${encodeURIComponent(requestId)}/approve`
        : `/api/nstp/community-requests/${encodeURIComponent(requestId)}/reject`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ review_notes: feedback, remarks: feedback, feedback: feedback })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(`Community request has been ${action === 'approve' ? 'approved and made available for matching' : 'rejected'}!`, 'success');
        closeInspectModal();
        await loadCommunityRequests();
      } else {
        showMessage(data.message || 'Unable to update request status.', 'error');
      }
    } catch (err) {
      console.error('Decision error:', err);
      showMessage('Network error while processing request decision: ' + (err.message || 'Please try again.'), 'error');
    } finally {
      actionButtons.forEach(btn => btn.disabled = false);
    }
  };

  function showLoading() {
    if (requestsSkeleton) requestsSkeleton.style.display = 'block';
    if (requestsContent) requestsContent.classList.add('hidden');
  }

  function hideLoading() {
    if (requestsSkeleton) requestsSkeleton.style.display = 'none';
    if (requestsContent) requestsContent.classList.remove('hidden');
  }

  function showMessage(msg, type = 'info') {
    if (!messageContainer || !messageText) return;
    messageText.textContent = msg;
    if (messageContent) messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 4500);
  }

  // ==========================================================================
  // Sub-page Navigation: Switch between Requests Table & Request Types View
  // ==========================================================================
  function setupSubpageNavigation() {
    if (btnRequestType) {
      btnRequestType.addEventListener('click', function () {
        switchToRequestTypesSubpage('types');
      });
    }

    if (btnBackToRequests) {
      btnBackToRequests.addEventListener('click', function () {
        switchToRequestsMainView();
      });
    }

    if (subtabRequestTypes) {
      subtabRequestTypes.addEventListener('click', function () {
        switchSubpageTab('types');
      });
    }

    if (subtabSkills) {
      subtabSkills.addEventListener('click', function () {
        switchSubpageTab('skills');
      });
    }

    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#request-types') {
        switchToRequestTypesSubpage('types');
      } else if (window.location.hash === '#skills') {
        switchToRequestTypesSubpage('skills');
      } else {
        switchToRequestsMainView();
      }
    });
  }

  function switchSubpageTab(tabName) {
    const wrapSearchRequestTypes = document.getElementById('wrapSearchRequestTypes');
    const wrapSearchSkills = document.getElementById('wrapSearchSkills');

    if (tabName === 'skills') {
      if (subtabSkills) {
        subtabSkills.classList.add('active');
        subtabSkills.setAttribute('aria-selected', 'true');
      }
      if (subtabRequestTypes) {
        subtabRequestTypes.classList.remove('active');
        subtabRequestTypes.setAttribute('aria-selected', 'false');
      }
      if (skillsSectionView) skillsSectionView.classList.remove('hidden');
      if (requestTypesSectionView) requestTypesSectionView.classList.add('hidden');
      if (btnOpenAddSkillModal) btnOpenAddSkillModal.classList.remove('hidden');
      if (btnOpenAddTypeModal) btnOpenAddTypeModal.classList.add('hidden');
      if (wrapSearchSkills) wrapSearchSkills.classList.remove('hidden');
      if (wrapSearchRequestTypes) wrapSearchRequestTypes.classList.add('hidden');
      if (window.location.hash !== '#skills') {
        window.location.hash = '#skills';
      }
      filterAndRenderSkills();
    } else {
      if (subtabRequestTypes) {
        subtabRequestTypes.classList.add('active');
        subtabRequestTypes.setAttribute('aria-selected', 'true');
      }
      if (subtabSkills) {
        subtabSkills.classList.remove('active');
        subtabSkills.setAttribute('aria-selected', 'false');
      }
      if (requestTypesSectionView) requestTypesSectionView.classList.remove('hidden');
      if (skillsSectionView) skillsSectionView.classList.add('hidden');
      if (btnOpenAddTypeModal) btnOpenAddTypeModal.classList.remove('hidden');
      if (btnOpenAddSkillModal) btnOpenAddSkillModal.classList.add('hidden');
      if (wrapSearchRequestTypes) wrapSearchRequestTypes.classList.remove('hidden');
      if (wrapSearchSkills) wrapSearchSkills.classList.add('hidden');
      if (window.location.hash !== '#request-types') {
        window.location.hash = '#request-types';
      }
      filterAndRenderRequestTypes();
    }
  }

  function switchToRequestTypesSubpage(defaultTab = 'types') {
    if (requestsMainView) requestsMainView.classList.add('hidden');
    if (requestTypesSubpageView) requestTypesSubpageView.classList.remove('hidden');
    switchSubpageTab(defaultTab);
    loadRequestTypes();
    loadSkills();
  }

  function switchToRequestsMainView() {
    if (requestTypesSubpageView) requestTypesSubpageView.classList.add('hidden');
    if (requestsMainView) requestsMainView.classList.remove('hidden');
    if (window.location.hash === '#request-types' || window.location.hash === '#skills') {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }

  // ==========================================================================
  // Request Types Data Fetching & Table Rendering
  // ==========================================================================
  async function loadRequestTypes() {
    try {
      const res = await fetch('/api/request-types', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await res.json();
      allRequestTypes = (result.success && Array.isArray(result.data)) ? result.data : [];

      if (countRequestTypes) {
        countRequestTypes.textContent = allRequestTypes.length;
      }

      filterAndRenderRequestTypes();
    } catch (err) {
      console.error('Error loading request types:', err);
      renderRequestTypesTable([]);
    }
  }

  function filterAndRenderRequestTypes() {
    const q = (searchRequestTypesInput ? searchRequestTypesInput.value : '').toLowerCase().trim();
    if (!q) {
      renderRequestTypesTable(allRequestTypes);
      return;
    }

    const filtered = allRequestTypes.filter(t => {
      const name = (t.name || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const skills = (t.required_skills || []).join(' ').toLowerCase();
      return name.includes(q) || desc.includes(q) || skills.includes(q);
    });

    renderRequestTypesTable(filtered);
  }

  function renderRequestTypesTable(types) {
    if (!requestTypesTableBody) return;

    if (!types || types.length === 0) {
      requestTypesTableBody.innerHTML = '';
      if (requestTypesTable) requestTypesTable.style.display = 'none';
      if (requestTypesEmptyState) requestTypesEmptyState.classList.remove('hidden');
      return;
    }

    if (requestTypesTable) requestTypesTable.style.display = 'table';
    if (requestTypesEmptyState) requestTypesEmptyState.classList.add('hidden');

    requestTypesTableBody.innerHTML = types.map(t => {
      const name = escapeHtml(t.name || 'Unnamed Service');
      const desc = escapeHtml(t.description || 'No description provided.');
      const skills = Array.isArray(t.required_skills) ? t.required_skills : [];
      const typeId = escapeHtml(String(t.type_id || ''));

      const skillsHtml = skills.length > 0
        ? `<div class="skills-tags-wrap">${skills.map(s => `<span class="skill-tag-pill">${escapeHtml(s)}</span>`).join('')}</div>`
        : '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">None specified</span>';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.875rem; display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color: var(--cwts-accent-green); flex-shrink: 0;">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>${name}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8125rem; color: var(--text-main); line-height: 1.45;">${desc}</div>
          </td>
          <td>
            ${skillsHtml}
          </td>
          <td style="text-align: right;">
            <div class="type-actions-wrap">
              <button type="button" class="btn-icon-action" title="Edit Service" onclick="window.openEditTypeModal('${typeId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button type="button" class="btn-icon-action delete" title="Delete Service" onclick="window.openDeleteTypeModal('${typeId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // Multi-Select Skill Picker & Modal Operations
  // ==========================================================================
  function initSkillDropdown() {
    if (!selectSkillDropdown) return;
    populateSkillDropdownOptions(allSkills);

    selectSkillDropdown.addEventListener('change', function () {
      const val = this.value;
      if (!val) return;
      if (!modalSelectedSkills.includes(val)) {
        modalSelectedSkills.push(val);
        renderSelectedSkills();
      }
      this.value = '';
    });
  }

  function populateSkillDropdownOptions(skillsList) {
    if (!selectSkillDropdown) return;
    const currentVal = selectSkillDropdown.value;
    const list = (skillsList && skillsList.length > 0)
      ? skillsList.map(s => s.name).sort((a, b) => a.localeCompare(b))
      : AVAILABLE_SKILLS;

    selectSkillDropdown.innerHTML = `
      <option value="">-- Choose skill to add (one or many) --</option>
      ${list.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
    `;
    if (currentVal) selectSkillDropdown.value = currentVal;
  }

  function renderSelectedSkills() {
    if (!selectedSkillsBadgeList) return;
    selectedSkillsBadgeList.innerHTML = modalSelectedSkills.map(skill => `
      <span class="selected-skill-pill">
        <span>${escapeHtml(skill)}</span>
        <button type="button" class="remove-skill-btn" onclick="window.removeSkillFromPicker('${escapeHtml(skill)}')">×</button>
      </span>
    `).join('');
  }

  window.removeSkillFromPicker = function (skill) {
    modalSelectedSkills = modalSelectedSkills.filter(s => s !== skill);
    renderSelectedSkills();
  };

  function setupRequestTypeEvents() {
    if (searchRequestTypesInput) {
      searchRequestTypesInput.addEventListener('input', filterAndRenderRequestTypes);
    }

    if (btnOpenAddTypeModal) {
      btnOpenAddTypeModal.addEventListener('click', openAddRequestTypeModal);
    }

    if (requestTypeForm) {
      requestTypeForm.addEventListener('submit', handleSaveRequestType);
    }

    if (btnConfirmDeleteType) {
      btnConfirmDeleteType.addEventListener('click', handleConfirmDeleteType);
    }
  }

  function openAddRequestTypeModal() {
    if (requestTypeForm) requestTypeForm.reset();
    if (editingTypeId) editingTypeId.value = '';
    modalSelectedSkills = [];
    renderSelectedSkills();
    if (requestTypeModalTitle) requestTypeModalTitle.textContent = 'Add New Request Type';
    if (btnSaveRequestTypeText) btnSaveRequestTypeText.textContent = 'Save Request Type';
    if (requestTypeModal) requestTypeModal.classList.add('active');
  }

  window.openEditTypeModal = function (typeId) {
    const item = allRequestTypes.find(t => String(t.type_id) === String(typeId));
    if (!item) {
      showMessage('Request type not found.', 'error');
      return;
    }

    if (editingTypeId) editingTypeId.value = item.type_id;
    if (inputTypeName) inputTypeName.value = item.name || '';
    if (inputTypeDesc) inputTypeDesc.value = item.description || '';

    modalSelectedSkills = Array.isArray(item.required_skills) ? [...item.required_skills] : [];
    renderSelectedSkills();

    if (requestTypeModalTitle) requestTypeModalTitle.textContent = 'Edit Request Type';
    if (btnSaveRequestTypeText) btnSaveRequestTypeText.textContent = 'Update Request Type';
    if (requestTypeModal) requestTypeModal.classList.add('active');
  };

  function closeRequestTypeModal() {
    if (requestTypeModal) requestTypeModal.classList.remove('active');
    if (requestTypeForm) requestTypeForm.reset();
    if (editingTypeId) editingTypeId.value = '';
    modalSelectedSkills = [];
    renderSelectedSkills();
  }
  window.closeRequestTypeModal = closeRequestTypeModal;

  async function handleSaveRequestType(e) {
    e.preventDefault();

    const name = inputTypeName ? inputTypeName.value.trim() : '';
    const description = inputTypeDesc ? inputTypeDesc.value.trim() : '';
    const id = editingTypeId ? editingTypeId.value.trim() : '';

    if (!name) {
      showMessage('Please enter the service name.', 'error');
      if (inputTypeName) inputTypeName.focus();
      return;
    }

    if (!description) {
      showMessage('Please provide a description for the service.', 'error');
      if (inputTypeDesc) inputTypeDesc.focus();
      return;
    }

    if (modalSelectedSkills.length === 0) {
      showMessage('Please select at least one required skill from the dropdown.', 'error');
      if (selectSkillDropdown) selectSkillDropdown.focus();
      return;
    }

    const payload = {
      name,
      description,
      required_skills: modalSelectedSkills
    };

    if (btnSaveRequestType) btnSaveRequestType.disabled = true;
    if (btnSaveRequestTypeText) btnSaveRequestTypeText.textContent = 'Saving...';

    try {
      const endpoint = id ? `/api/nstp/request-types/${encodeURIComponent(id)}` : '/api/nstp/request-types';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage(`Request type "${name}" saved successfully!`, 'success');
        closeRequestTypeModal();
        await loadRequestTypes();
      } else {
        showMessage(result.message || 'Failed to save request type.', 'error');
      }
    } catch (err) {
      console.error('Error saving request type:', err);
      showMessage('Network error while saving request type.', 'error');
    } finally {
      if (btnSaveRequestType) btnSaveRequestType.disabled = false;
      if (btnSaveRequestTypeText) {
        btnSaveRequestTypeText.textContent = id ? 'Update Request Type' : 'Save Request Type';
      }
    }
  }

  window.openDeleteTypeModal = function (typeId) {
    const item = allRequestTypes.find(t => String(t.type_id) === String(typeId));
    if (!item) return;

    deleteTargetTypeId = typeId;
    if (deleteTypeNameTarget) deleteTypeNameTarget.textContent = item.name;
    if (deleteTypeModal) deleteTypeModal.classList.add('active');
  };

  function closeDeleteTypeModal() {
    if (deleteTypeModal) deleteTypeModal.classList.remove('active');
    deleteTargetTypeId = null;
  }
  window.closeDeleteTypeModal = closeDeleteTypeModal;

  // ==========================================================================
  // Skills Masterlist Data Fetching, Filtering & Table Rendering
  // ==========================================================================
  async function loadSkills() {
    try {
      const res = await fetch('/api/skills', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await res.json();
      allSkills = (result.success && Array.isArray(result.data)) ? result.data : [];

      if (countSkillsBadge) {
        countSkillsBadge.textContent = allSkills.length;
      }

      populateSkillDropdownOptions(allSkills);
      filterAndRenderSkills();
    } catch (err) {
      console.error('Error loading skills:', err);
      renderSkillsTable([]);
    }
  }

  function filterAndRenderSkills() {
    const q = (searchSkillsInput ? searchSkillsInput.value : '').toLowerCase().trim();
    if (!q) {
      renderSkillsTable(allSkills);
      return;
    }

    const filtered = allSkills.filter(s => {
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    renderSkillsTable(filtered);
  }

  function renderSkillsTable(skills) {
    if (!skillsTableBody) return;

    if (!skills || skills.length === 0) {
      skillsTableBody.innerHTML = '';
      if (skillsTable) skillsTable.style.display = 'none';
      if (skillsEmptyState) skillsEmptyState.classList.remove('hidden');
      return;
    }

    if (skillsTable) skillsTable.style.display = 'table';
    if (skillsEmptyState) skillsEmptyState.classList.add('hidden');

    skillsTableBody.innerHTML = skills.map(s => {
      const name = escapeHtml(s.name || 'Unnamed Skill');
      const desc = escapeHtml(s.description || 'No description provided.');
      const skillId = escapeHtml(String(s.skill_id || ''));

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.875rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--cwts-accent-green); flex-shrink: 0;"></span>
              <span>${name}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8125rem; color: var(--text-main); line-height: 1.45;">${desc}</div>
          </td>
          <td style="text-align: right;">
            <div class="type-actions-wrap">
              <button type="button" class="btn-icon-action" title="Edit Skill" onclick="window.openEditSkillModal('${skillId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button type="button" class="btn-icon-action delete" title="Delete Skill" onclick="window.openDeleteSkillModal('${skillId}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupSkillEvents() {
    if (searchSkillsInput) {
      searchSkillsInput.addEventListener('input', filterAndRenderSkills);
    }

    if (btnOpenAddSkillModal) {
      btnOpenAddSkillModal.addEventListener('click', openAddSkillModal);
    }

    if (skillForm) {
      skillForm.addEventListener('submit', handleSaveSkill);
    }

    if (btnConfirmDeleteSkill) {
      btnConfirmDeleteSkill.addEventListener('click', handleConfirmDeleteSkill);
    }
  }

  function openAddSkillModal() {
    if (skillForm) skillForm.reset();
    if (editingSkillId) editingSkillId.value = '';
    if (skillModalTitle) skillModalTitle.textContent = 'Add New Skill';
    if (btnSaveSkillText) btnSaveSkillText.textContent = 'Save Skill';
    if (skillModal) skillModal.classList.add('active');
  }

  window.openEditSkillModal = function (skillId) {
    const item = allSkills.find(s => String(s.skill_id) === String(skillId));
    if (!item) {
      showMessage('Skill not found.', 'error');
      return;
    }

    if (editingSkillId) editingSkillId.value = item.skill_id;
    if (inputSkillName) inputSkillName.value = item.name || '';
    if (inputSkillDesc) inputSkillDesc.value = item.description || '';

    if (skillModalTitle) skillModalTitle.textContent = 'Edit Skill';
    if (btnSaveSkillText) btnSaveSkillText.textContent = 'Update Skill';
    if (skillModal) skillModal.classList.add('active');
  };

  function closeSkillModal() {
    if (skillModal) skillModal.classList.remove('active');
    if (skillForm) skillForm.reset();
    if (editingSkillId) editingSkillId.value = '';
  }
  window.closeSkillModal = closeSkillModal;

  async function handleSaveSkill(e) {
    e.preventDefault();

    const name = inputSkillName ? inputSkillName.value.trim() : '';
    const description = inputSkillDesc ? inputSkillDesc.value.trim() : '';
    const id = editingSkillId ? editingSkillId.value.trim() : '';

    if (!name) {
      showMessage('Please enter the skill name.', 'error');
      if (inputSkillName) inputSkillName.focus();
      return;
    }

    const payload = {
      name,
      description
    };

    if (btnSaveSkill) btnSaveSkill.disabled = true;
    if (btnSaveSkillText) btnSaveSkillText.textContent = 'Saving...';

    try {
      const endpoint = id ? `/api/nstp/skills/${encodeURIComponent(id)}` : '/api/nstp/skills';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage(`Skill "${name}" saved successfully!`, 'success');
        closeSkillModal();
        await loadSkills();
        await loadRequestTypes();
      } else {
        showMessage(result.message || 'Failed to save skill.', 'error');
      }
    } catch (err) {
      console.error('Error saving skill:', err);
      showMessage('Network error while saving skill.', 'error');
    } finally {
      if (btnSaveSkill) btnSaveSkill.disabled = false;
      if (btnSaveSkillText) {
        btnSaveSkillText.textContent = id ? 'Update Skill' : 'Save Skill';
      }
    }
  }

  window.openDeleteSkillModal = function (skillId) {
    const item = allSkills.find(s => String(s.skill_id) === String(skillId));
    if (!item) return;

    deleteTargetSkillId = skillId;
    if (deleteSkillNameTarget) deleteSkillNameTarget.textContent = item.name;
    if (deleteSkillModal) deleteSkillModal.classList.add('active');
  };

  function closeDeleteSkillModal() {
    if (deleteSkillModal) deleteSkillModal.classList.remove('active');
    deleteTargetSkillId = null;
  }
  window.closeDeleteSkillModal = closeDeleteSkillModal;

  async function handleConfirmDeleteSkill() {
    if (!deleteTargetSkillId) return;

    if (btnConfirmDeleteSkill) btnConfirmDeleteSkill.disabled = true;

    try {
      const res = await fetch(`/api/nstp/skills/${encodeURIComponent(deleteTargetSkillId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage('Skill deleted successfully.', 'success');
        closeDeleteSkillModal();
        await loadSkills();
        await loadRequestTypes();
      } else {
        showMessage(result.message || 'Failed to delete skill.', 'error');
      }
    } catch (err) {
      console.error('Error deleting skill:', err);
      showMessage('Network error while deleting skill.', 'error');
    } finally {
      if (btnConfirmDeleteSkill) btnConfirmDeleteSkill.disabled = false;
    }
  }

  // Universal close listener for any modal close button (both header × and footer Cancel/Close)
  document.addEventListener('click', function (e) {
    const dismissBtn = e.target.closest('.modal-close-btn, [data-modal-dismiss]');
    if (!dismissBtn) return;

    e.preventDefault();
    const parentModal = dismissBtn.closest('.modal-backdrop');
    if (parentModal) {
      if (parentModal === requestTypeModal) closeRequestTypeModal();
      else if (parentModal === deleteTypeModal) closeDeleteTypeModal();
      else if (parentModal === skillModal) closeSkillModal();
      else if (parentModal === deleteSkillModal) closeDeleteSkillModal();
      else if (parentModal === inspectModal) closeInspectModal();
      else parentModal.classList.remove('active');
    }
  });

  // Close modals when clicking outside the modal-card (on backdrop)
  [requestTypeModal, deleteTypeModal, skillModal, deleteSkillModal, inspectModal].forEach(modalEl => {
    if (modalEl) {
      modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) {
          if (modalEl === requestTypeModal) closeRequestTypeModal();
          else if (modalEl === deleteTypeModal) closeDeleteTypeModal();
          else if (modalEl === skillModal) closeSkillModal();
          else if (modalEl === deleteSkillModal) closeDeleteSkillModal();
          else if (modalEl === inspectModal) closeInspectModal();
        }
      });
    }
  });

  // Close modals on Escape key
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (requestTypeModal && requestTypeModal.classList.contains('active')) {
        closeRequestTypeModal();
      }
      if (deleteTypeModal && deleteTypeModal.classList.contains('active')) {
        closeDeleteTypeModal();
      }
      if (skillModal && skillModal.classList.contains('active')) {
        closeSkillModal();
      }
      if (deleteSkillModal && deleteSkillModal.classList.contains('active')) {
        closeDeleteSkillModal();
      }
      if (inspectModal && inspectModal.classList.contains('active')) {
        closeInspectModal();
      }
    }
  });

  async function handleConfirmDeleteType() {
    if (!deleteTargetTypeId) return;

    if (btnConfirmDeleteType) btnConfirmDeleteType.disabled = true;

    try {
      const res = await fetch(`/api/nstp/request-types/${encodeURIComponent(deleteTargetTypeId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage('Request type deleted successfully.', 'success');
        closeDeleteTypeModal();
        await loadRequestTypes();
      } else {
        showMessage(result.message || 'Failed to delete request type.', 'error');
      }
    } catch (err) {
      console.error('Error deleting request type:', err);
      showMessage('Network error while deleting request type.', 'error');
    } finally {
      if (btnConfirmDeleteType) btnConfirmDeleteType.disabled = false;
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

});
