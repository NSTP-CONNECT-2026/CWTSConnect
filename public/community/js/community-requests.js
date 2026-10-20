/**
 * CWTSConnect — Community Requests List Controller
 * Matches modern NSTP requests list styling with compact status filter pills,
 * standalone search bar, and icon action buttons.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // State
  let allRequests = [];
  let currentStatusFilter = 'all';

  // DOM Elements
  const requestsSkeleton = document.getElementById('requestsSkeleton');
  const requestsContent = document.getElementById('requestsContent');
  const requestsTableCard = document.getElementById('requestsTableCard');
  const requestsTableBody = document.getElementById('requestsTableBody');
  const emptyState = document.getElementById('emptyState');
  const requestsTable = document.getElementById('requestsTable');

  // Pill Count Badges
  const countAll = document.getElementById('countAll');
  const countPending = document.getElementById('countPending');
  const countApproved = document.getElementById('countApproved');
  const countRejected = document.getElementById('countRejected');

  // Search Input
  const searchInput = document.getElementById('searchInput');

  // Message Toast Elements
  const messageContainer = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  const messageContent = document.getElementById('messageContent');
  const messageClose = document.getElementById('messageClose');

  if (messageClose) {
    messageClose.addEventListener('click', () => {
      messageContainer.style.display = 'none';
    });
  }

  // Setup Event Listeners
  setupFilters();

  // Initial Load
  init();

  async function init() {
    showLoading();
    await loadRequests();
    hideLoading();
  }

  /**
   * Setup search input and status pill buttons
   */
  function setupFilters() {
    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

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

  /**
   * Updates count badges inside the status filter buttons
   */
  function updateStats(requests) {
    const total = requests.length;
    const pending = requests.filter(r => (r.request_status || '').toLowerCase() === 'pending').length;
    const approved = requests.filter(r => (r.request_status || '').toLowerCase() === 'approved').length;
    const rejected = requests.filter(r => ['rejected', 'needs_revision', 'needs revision', 'cancelled'].includes((r.request_status || '').toLowerCase())).length;

    if (countAll) countAll.textContent = total;
    if (countPending) countPending.textContent = pending;
    if (countApproved) countApproved.textContent = approved;
    if (countRejected) countRejected.textContent = rejected;
  }

  /**
   * Fetches community requests for logged-in community user
   */
  async function loadRequests() {
    try {
      const res = await fetch('/api/community/requests', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.data)) {
        allRequests = data.data;
        updateStats(allRequests);
        applyFilters();
      } else {
        const errorMsg = data.message || 'Hindi ma-load ang mga requests mula sa server.';
        console.warn('Load requests warning:', errorMsg);
        showMessage(errorMsg, 'error');
        updateStats([]);
        renderTable([]);
      }
    } catch (err) {
      console.error('Failed to load community requests:', err);
      showMessage('Hindi ma-load ang requests. Pakisigurong tumatakbo ang server at i-refresh ang page.', 'error');
      updateStats([]);
      renderTable([]);
    }
  }

  /**
   * Applies search & status pill filters
   */
  function applyFilters() {
    const q = (searchInput && typeof searchInput.value === 'string' ? searchInput.value : '').toLowerCase().trim();
    const status = currentStatusFilter || 'all';

    const filtered = allRequests.filter(req => {
      const title = (req.activity_title || '').toLowerCase();
      const community = (req.community_name || '').toLowerCase();
      const brgy = (req.barangay || '').toLowerCase();
      const mun = (req.municipality || '').toLowerCase();
      const desc = (req.description || '').toLowerCase();
      const actType = (req.activity_type || '').toLowerCase();
      const rStatus = (req.request_status || '').toLowerCase();

      const searchMatch = !q || title.includes(q) || community.includes(q) || brgy.includes(q) || mun.includes(q) || desc.includes(q) || actType.includes(q);

      let statusMatch = true;
      if (status === 'all') {
        statusMatch = true;
      } else if (status === 'pending') {
        statusMatch = rStatus === 'pending';
      } else if (status === 'approved') {
        statusMatch = rStatus === 'approved';
      } else if (status === 'rejected') {
        statusMatch = ['rejected', 'needs_revision', 'needs revision', 'cancelled'].includes(rStatus);
      }

      return searchMatch && statusMatch;
    });

    renderTable(filtered);
  }

  /**
   * Renders rows into the table matching nstp/community-requests.html style
   */
  function renderTable(requests) {
    if (!requestsTableBody) return;

    if (!requests || requests.length === 0) {
      requestsTableBody.innerHTML = '';
      if (requestsTable) requestsTable.style.display = 'none';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (requestsTable) requestsTable.style.display = 'table';
    if (emptyState) emptyState.classList.add('hidden');

    requestsTableBody.innerHTML = requests.map(req => {
      const reqId = req.request_id || req.id;
      const title = escapeHtml(req.activity_title || 'Untitled Activity');
      const activityType = escapeHtml(req.activity_type || 'CWTS Project');
      const status = (req.request_status || 'pending').toLowerCase();
      const createdDate = formatDate(req.created_at);

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: #475569; font-size: 0.8125rem; white-space: nowrap;">${createdDate}</div>
          </td>
          <td>
            <div class="request-table-title" title="${title}">${title}</div>
          </td>
          <td>
            <span class="request-type-badge" title="${activityType}">${activityType}</span>
          </td>
          <td>
            ${getStatusBadge(status)}
          </td>
          <td style="text-align: center;">
            <a href="view-request.html?id=${encodeURIComponent(reqId)}" class="btn-icon-action action-view" title="View Request Details" aria-label="View Request Details">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Simple Neumorphic Confirmation Modal
   * Clean neutral edges, soft neumorphic elevation, simple wordings.
   */
  function showConfirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  } = {}) {
    return new Promise((resolve) => {
      let modal = document.getElementById('confirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'neu-modal-backdrop';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
          <div class="neu-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
            <div class="neu-modal-icon-wrap warning" id="confirmModalIcon"></div>
            <div class="neu-modal-content">
              <h3 class="neu-modal-title" id="confirmModalTitle"></h3>
              <p class="neu-modal-desc" id="confirmModalDesc"></p>
            </div>
            <div class="neu-modal-actions">
              <button type="button" class="btn-neu-modal btn-neu-cancel" id="btnConfirmCancel"></button>
              <button type="button" class="btn-neu-modal btn-neu-confirm" id="btnConfirmProceed"></button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const titleEl = modal.querySelector('#confirmModalTitle');
      const descEl = modal.querySelector('#confirmModalDesc');
      const cancelBtn = modal.querySelector('#btnConfirmCancel');
      const proceedBtn = modal.querySelector('#btnConfirmProceed');
      const iconWrap = modal.querySelector('#confirmModalIcon');

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = message;
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (proceedBtn) {
        proceedBtn.textContent = confirmText;
        proceedBtn.className = `btn-neu-modal btn-neu-confirm ${type}`;
      }

      if (iconWrap) {
        iconWrap.className = `neu-modal-icon-wrap ${type}`;
        if (type === 'danger') {
          iconWrap.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          `;
        } else {
          iconWrap.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          `;
        }
      }

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');

      function cleanup(result) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        cancelBtn.removeEventListener('click', onCancel);
        proceedBtn.removeEventListener('click', onProceed);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onCancel() { cleanup(false); }
      function onProceed() { cleanup(true); }
      function onBackdrop(e) { if (e.target === modal) cleanup(false); }
      function onKey(e) { if (e.key === 'Escape') cleanup(false); }

      cancelBtn.addEventListener('click', onCancel);
      proceedBtn.addEventListener('click', onProceed);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);

      if (cancelBtn) cancelBtn.focus();
    });
  }

  /**
   * Cancel Request function exposed globally
   */
  window.cancelCommunityRequest = async function (requestId) {
    const confirmed = await showConfirmModal({
      title: 'Cancel Request',
      message: 'Cancel this community request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request',
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/community/requests/${encodeURIComponent(requestId)}/cancel`, {
        method: 'PUT',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('Request cancelled successfully.', 'success');
        await loadRequests();
      } else {
        showMessage(data.message || 'Failed to cancel request.', 'error');
      }
    } catch (err) {
      console.error('Cancel request error:', err);
      showMessage('Unable to connect to server. Please try again.', 'error');
    }
  };

  /**
   * Simplified status badges matching modern design system
   */
  function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'approved':
        return '<span class="badge badge-approved">Approved</span>';
      case 'rejected':
      case 'needs_revision':
        return '<span class="badge badge-rejected">Rejected</span>';
      case 'cancelled':
        return '<span class="badge badge-cancelled">Cancelled</span>';
      case 'completed':
        return '<span class="badge badge-approved">Completed</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending</span>';
    }
  }

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

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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