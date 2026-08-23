/**
 * CWTSConnect — Community Requests List Controller
 * Manages:
 *  - Fetching request records & summary stats
 *  - Filtering by search text, activity type, and status
 *  - Rendering Neumorphic Table with Section 12 Table Skeletons
 *  - Canceling pending requests
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // State
  let allRequests = [];

  // DOM Elements
  const requestsSkeleton = document.getElementById('requestsSkeleton');
  const requestsContent = document.getElementById('requestsContent');
  const requestsTableCard = document.getElementById('requestsTableCard');
  const requestsTableBody = document.getElementById('requestsTableBody');
  const emptyState = document.getElementById('emptyState');
  const requestsTable = document.getElementById('requestsTable');

  // Summary Elements
  const totalRequestsEl = document.getElementById('totalRequests');
  const pendingRequestsEl = document.getElementById('pendingRequests');
  const approvedRequestsEl = document.getElementById('approvedRequests');
  const rejectedRequestsEl = document.getElementById('rejectedRequests');

  // Filter Elements
  const searchInput = document.getElementById('searchInput');
  const activityTypeFilter = document.getElementById('activityTypeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const clearFilterBtn = document.getElementById('clearFilterBtn');

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
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (activityTypeFilter) activityTypeFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (activityTypeFilter) activityTypeFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      applyFilters();
    });
  }

  // Initial Load
  init();

  async function init() {
    showLoading();
    await Promise.all([loadSummaryStats(), loadRequests()]);
    hideLoading();
  }

  /**
   * Loads summary tiles statistics
   */
  async function loadSummaryStats() {
    try {
      const res = await fetch('/api/community/request-summary', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        const stats = data.data || {};
        if (totalRequestsEl) totalRequestsEl.textContent = stats.total_requests || 0;
        if (pendingRequestsEl) pendingRequestsEl.textContent = stats.pending_requests || 0;
        if (approvedRequestsEl) approvedRequestsEl.textContent = stats.approved_requests || 0;
        if (rejectedRequestsEl) rejectedRequestsEl.textContent = stats.rejected_requests || 0;
      }
    } catch (err) {
      console.warn('Failed to load request summary stats:', err);
    }
  }

  /**
   * Fetches community requests
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

      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        allRequests = data.data;
        renderTable(allRequests);
      } else {
        renderTable([]);
      }
    } catch (err) {
      console.error('Failed to load community requests:', err);
      showMessage('Unable to load requests. Please check your connection.', 'error');
      renderTable([]);
    }
  }

  /**
   * Applies search & dropdown filters
   */
  function applyFilters() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const actFilter = activityTypeFilter ? activityTypeFilter.value : 'all';
    const statFilter = statusFilter ? statusFilter.value : 'all';

    const filtered = allRequests.filter(req => {
      // 1. Search Query
      const titleMatch = (req.activity_title || '').toLowerCase().includes(query);
      const commMatch = (req.community_name || '').toLowerCase().includes(query);
      const munMatch = (req.municipality || '').toLowerCase().includes(query);
      const descMatch = (req.description || '').toLowerCase().includes(query);
      const searchMatch = !query || titleMatch || commMatch || munMatch || descMatch;

      // 2. Activity Type Filter
      const typeMatch = actFilter === 'all' || (req.activity_type || '').toLowerCase() === actFilter.toLowerCase();

      // 3. Status Filter
      const statusMatch = statFilter === 'all' || (req.request_status || '').toLowerCase() === statFilter.toLowerCase();

      return searchMatch && typeMatch && statusMatch;
    });

    renderTable(filtered);
  }

  /**
   * Renders rows into the table
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
      const community = escapeHtml(req.community_name || 'Community Area');
      const location = `${escapeHtml(req.barangay || '')}, ${escapeHtml(req.municipality || '')}`.replace(/^,\s*/, '');
      const activityType = escapeHtml(req.activity_type || 'CWTS Project');
      const studentsNeeded = req.students_needed || req.required_students || 0;
      const status = req.request_status || 'pending';
      const isPending = status === 'pending';
      const createdDate = formatDate(req.created_at);

      return `
        <tr>
          <td>
            <div class="request-cell-title">${title}</div>
            <div class="request-cell-meta">
              <span class="request-code-badge">ID: ${escapeHtml(String(reqId).substring(0, 8))}</span> • ${community} • <small>${createdDate}</small>
            </div>
          </td>
          <td>
            <span class="badge badge-complete">${activityType}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${location || 'Not Specified'}</div>
            <div class="request-cell-meta">${escapeHtml(req.province || 'Philippines')}</div>
          </td>
          <td>
            ${getStatusBadge(status)}
          </td>
          <td>
            <div class="table-actions">
              <a href="view-request.html?id=${encodeURIComponent(reqId)}" class="action-btn-sm action-btn-view" title="View Request Details">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span>View</span>
              </a>

              ${isPending ? `
                <a href="create-request.html?id=${encodeURIComponent(reqId)}" class="action-btn-sm action-btn-edit" title="Edit Pending Request">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span>Edit</span>
                </a>
                <button type="button" class="action-btn-sm action-btn-cancel" onclick="window.cancelCommunityRequest('${escapeHtml(String(reqId))}')" title="Cancel Request">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <span>Cancel</span>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Cancel Request function exposed globally
   */
  window.cancelCommunityRequest = async function (requestId) {
    if (!confirm('Are you sure you want to cancel this community request? This action cannot be undone.')) {
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
        await loadSummaryStats();
        await loadRequests();
      } else {
        showMessage(data.message || 'Failed to cancel request.', 'error');
      }
    } catch (err) {
      console.error('Cancel request error:', err);
      showMessage('Unable to connect to server. Please try again.', 'error');
    }
  };

  function getStatusBadge(status) {
    switch (status) {
      case 'approved':
        return '<span class="badge badge-approved">Approved & Queued</span>';
      case 'rejected':
        return '<span class="badge badge-rejected">Rejected / Needs Revision</span>';
      case 'cancelled':
        return '<span class="badge badge-incomplete">Cancelled</span>';
      case 'completed':
        return '<span class="badge badge-approved">Completed</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending Review</span>';
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