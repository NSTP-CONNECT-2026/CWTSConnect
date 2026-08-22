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

  // DOM Elements
  const requestsSkeleton = document.getElementById('requestsSkeleton');
  const requestsContent = document.getElementById('requestsContent');
  const requestsTableCard = document.getElementById('requestsTableCard');
  const requestsTable = document.getElementById('requestsTable');
  const requestsTableBody = document.getElementById('requestsTableBody');
  const requestsEmptyState = document.getElementById('requestsEmptyState');

  // Filter Elements
  const searchInput = document.getElementById('requestsSearchInput');
  const statusFilter = document.getElementById('requestsStatusFilter');
  const typeFilter = document.getElementById('requestsTypeFilter');
  const clearFiltersBtn = document.getElementById('clearRequestsFiltersBtn');

  // Summary Elements
  const statTotalRequests = document.getElementById('statTotalRequests');
  const statPendingRequests = document.getElementById('statPendingRequests');
  const statApprovedRequests = document.getElementById('statApprovedRequests');
  const statRejectedRequests = document.getElementById('statRejectedRequests');

  // Modal Elements
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
    showLoading();
    await loadCommunityRequests();
    hideLoading();
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
      renderTable(allRequests);
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

    if (statTotalRequests) statTotalRequests.textContent = total;
    if (statPendingRequests) statPendingRequests.textContent = pending;
    if (statApprovedRequests) statApprovedRequests.textContent = approved;
    if (statRejectedRequests) statRejectedRequests.textContent = rejected;
  }

  function setupFilters() {
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        if (typeFilter) typeFilter.value = 'all';
        applyFilters();
      });
    }
  }

  function applyFilters() {
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const status = statusFilter ? statusFilter.value : 'all';
    const type = typeFilter ? typeFilter.value : 'all';

    const filtered = allRequests.filter(r => {
      const title = (r.activity_title || '').toLowerCase();
      const community = (r.community_name || '').toLowerCase();
      const brgy = (r.barangay || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();

      const searchMatch = !q || title.includes(q) || community.includes(q) || brgy.includes(q) || desc.includes(q);
      const statusMatch = status === 'all' || (r.request_status || '').toLowerCase() === status.toLowerCase();
      const typeMatch = type === 'all' || (r.activity_type || '').toLowerCase().includes(type.toLowerCase());

      return searchMatch && statusMatch && typeMatch;
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
        badgeHtml = '<span class="badge badge-approved">Approved (DSS Ready)</span>';
      } else if (status === 'pending') {
        badgeHtml = '<span class="badge badge-pending">Pending Approval</span>';
      } else if (status === 'rejected') {
        badgeHtml = '<span class="badge badge-rejected">Rejected</span>';
      } else {
        badgeHtml = `<span class="badge badge-cancelled">${escapeHtml(status)}</span>`;
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
            <div style="font-size: 1.125rem; font-weight: 800; color: var(--cwts-primary-dark);">${studentsNeeded}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Students</div>
          </td>
          <td>
            ${badgeHtml}
          </td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.inspectRequest('${escapeHtml(String(requestId))}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <span>Inspect & Review</span>
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
        if (Array.isArray(r.skills_required)) skills = r.skills_required;
        else if (typeof r.skills_required === 'string' && r.skills_required) skills = r.skills_required.split(',').map(x => x.trim()).filter(Boolean);

        const startDate = r.target_start_date ? new Date(r.target_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible';
        const endDate = r.target_end_date ? new Date(r.target_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open-ended';

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
                ${status === 'approved' ? '<span class="badge badge-approved">Approved (DSS Ready)</span>' : (status === 'pending' ? '<span class="badge badge-pending">Pending Approval</span>' : '<span class="badge badge-rejected">Rejected</span>')}
              </div>
            </div>

            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Location Address</span><span class="meta-value">${escapeHtml(r.complete_address || '')}, ${escapeHtml(r.barangay || '')}, ${escapeHtml(r.municipality || '')}, ${escapeHtml(r.province || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Target Schedule</span><span class="meta-value">${startDate} &mdash; ${endDate}</span></div>
              <div class="meta-item"><span class="meta-label">Volunteer Quota</span><span class="meta-value highlight">${r.students_needed || r.required_students || 15} Students (${r.estimated_hours || 30} Hours)</span></div>
              <div class="meta-item"><span class="meta-label">Beneficiaries</span><span class="meta-value">${escapeHtml(r.beneficiaries_description || 'General Community Members')}</span></div>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Activity Scope & Description:</span>
              <p style="font-size: 0.875rem; color: var(--text-main); margin-top: 6px; line-height: 1.5; background: rgba(248, 250, 252, 0.85); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(226, 232, 240, 0.9);">
                ${escapeHtml(r.description || 'No detailed scope provided.')}
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

  window.closeInspectModal = function () {
    if (inspectModal) inspectModal.classList.remove('active');
  };

  /**
   * Submit Decision (Approve / Reject)
   */
  window.submitRequestDecision = async function (requestId, action) {
    if (!requestId) return;

    const feedbackInput = document.getElementById(`requestFeedback_${requestId}`);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';

    const actionText = action === 'approve' ? 'approve this community request for DSS matching' : 'reject this community request';
    if (!confirm(`Are you sure you want to ${actionText}?`)) return;

    try {
      const endpoint = action === 'approve' 
        ? `/api/nstp/community-requests/${encodeURIComponent(requestId)}/approve`
        : `/api/nstp/community-requests/${encodeURIComponent(requestId)}/reject`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remarks: feedback, feedback: feedback })
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
      showMessage('Network error while processing request decision.', 'error');
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
