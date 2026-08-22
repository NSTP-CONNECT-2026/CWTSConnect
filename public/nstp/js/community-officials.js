/**
 * Community Official Account Management - NSTP Official
 */

let allOfficials = [];
let filteredOfficials = [];
let messageTimeout = null;

// DOM Elements
const officialsTableBody = document.getElementById('officialsTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statInactive = document.getElementById('statInactive');

// Add Modal Elements
const addOfficialModal = document.getElementById('addOfficialModal');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModal = document.getElementById('closeAddModal');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addOfficialForm = document.getElementById('addOfficialForm');
const addEmail = document.getElementById('addEmail');
const addPassword = document.getElementById('addPassword');

// Edit Modal Elements
const editOfficialModal = document.getElementById('editOfficialModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editOfficialForm = document.getElementById('editOfficialForm');
const editUserId = document.getElementById('editUserId');
const editEmail = document.getElementById('editEmail');
const editPassword = document.getElementById('editPassword');

// Message elements
const messageContainer = document.getElementById('messageContainer');
const messageContent = document.getElementById('messageContent');
const messageText = document.getElementById('messageText');
const messageClose = document.getElementById('messageClose');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadOfficials();
  setupEventListeners();
});

/**
 * Load all community officials
 */
async function loadOfficials() {
  try {
    showLoading();
    const response = await fetch('/api/nstp/community-officials');
    if (!response.ok) {
      throw new Error('Failed to load community officials');
    }
    const data = await response.json();
    allOfficials = data.officials || [];
    filteredOfficials = [...allOfficials];
    
    updateStatistics();
    applyFilters();
  } catch (error) {
    console.error('Error loading community officials:', error);
    showError('Failed to load community officials. Please try again.');
  }
}

/**
 * Update Statistics
 */
function updateStatistics() {
  const total = allOfficials.length;
  const active = allOfficials.filter(o => o.account_status === 'active').length;
  const inactive = allOfficials.filter(o => o.account_status === 'inactive').length;

  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = active;
  if (statInactive) statInactive.textContent = inactive;
}

/**
 * Render table rows
 */
function renderOfficialsTable() {
  if (filteredOfficials.length === 0) {
    officialsTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="nstp-table-empty" style="text-align: center; padding: 2rem; color: var(--nstp-neutral-medium);">
          No community officials found matching the filters.
        </td>
      </tr>
    `;
    return;
  }

  officialsTableBody.innerHTML = filteredOfficials.map(official => {
    const isCurrentlyActive = official.account_status === 'active';
    const statusBadgeClass = isCurrentlyActive ? 'nstp-badge-active' : 'nstp-badge-inactive';
    const statusText = isCurrentlyActive ? 'Active' : 'Inactive';
    
    // Status button action
    const statusActionText = isCurrentlyActive ? 'Deactivate' : 'Activate';
    const statusActionBtnClass = isCurrentlyActive ? 'nstp-btn-danger' : 'nstp-btn-primary';

    return `
      <tr>
        <td>
          <div style="font-weight: var(--nstp-weight-semibold); color: var(--nstp-primary-dark);">${escapeHtml(official.email)}</div>
          <div style="font-size: var(--nstp-font-xs); color: var(--nstp-neutral-medium);">ID: ${official.user_id}</div>
        </td>
        <td>${formatDate(official.created_at)}</td>
        <td>
          <span class="nstp-badge ${statusBadgeClass}">${statusText}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="nstp-btn nstp-btn-sm nstp-btn-outline" onclick="openEditModal('${official.user_id}', '${escapeHtml(official.email)}')">
              Edit
            </button>
            <button class="nstp-btn nstp-btn-sm ${statusActionBtnClass}" onclick="toggleStatus('${official.user_id}', '${official.account_status}')">
              ${statusActionText}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filter data
 */
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const statusVal = statusFilter.value;

  filteredOfficials = allOfficials.filter(official => {
    // Search filter
    if (searchTerm && !official.email.toLowerCase().includes(searchTerm)) {
      return false;
    }
    // Status filter
    if (statusVal !== 'all' && official.account_status !== statusVal) {
      return false;
    }
    return true;
  });

  renderOfficialsTable();
}

/**
 * Toggle Status
 */
async function toggleStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const confirmationMessage = `Are you sure you want to ${newStatus === 'active' ? 'deactivate' : 'activate'} this account?`;
  
  if (!confirm(confirmationMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/nstp/community-officials/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ account_status: newStatus })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      // Update local state
      allOfficials = allOfficials.map(o => {
        if (o.user_id === userId) {
          return { ...o, account_status: newStatus };
        }
        return o;
      });
      applyFilters();
      updateStatistics();
      showMessage(data.message || 'Account status updated successfully.', 'success');
    } else {
      showMessage(data.message || 'Failed to update account status.', 'error');
    }
  } catch (error) {
    console.error('Error toggling status:', error);
    showMessage('An error occurred. Please try again.', 'error');
  }
}

/**
 * Edit Modal management
 */
function openEditModal(userId, email) {
  editUserId.value = userId;
  editEmail.value = email;
  editPassword.value = '';
  editOfficialModal.classList.add('active');
}

function closeEditModalFn() {
  editOfficialModal.classList.remove('active');
}

// Bind to window to allow inline onclick handlers to resolve
window.openEditModal = openEditModal;
window.toggleStatus = toggleStatus;

/**
 * Event Listeners setup
 */
function setupEventListeners() {
  // Filters
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // Add modal toggle
  openAddModalBtn.addEventListener('click', () => {
    addEmail.value = '';
    addPassword.value = '';
    addOfficialModal.classList.add('active');
  });
  
  const closeAddModalFn = () => {
    addOfficialModal.classList.remove('active');
  };
  closeAddModal.addEventListener('click', closeAddModalFn);
  cancelAddBtn.addEventListener('click', closeAddModalFn);

  // Edit modal close
  closeEditModal.addEventListener('click', closeEditModalFn);
  cancelEditBtn.addEventListener('click', closeEditModalFn);

  // Forms submit
  addOfficialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = addEmail.value.trim();
    const password = addPassword.value.trim();

    try {
      const response = await fetch('/api/nstp/community-officials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Add to local state
        allOfficials.unshift(data.official);
        applyFilters();
        updateStatistics();
        closeAddModalFn();
        showMessage(data.message || 'Account created successfully.', 'success');
      } else {
        showMessage(data.message || 'Failed to create account.', 'error');
      }
    } catch (error) {
      console.error('Error adding official:', error);
      showMessage('An error occurred. Please try again.', 'error');
    }
  });

  editOfficialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = editUserId.value;
    const email = editEmail.value.trim();
    const password = editPassword.value.trim();

    try {
      const body = { email };
      if (password) {
        body.password = password;
      }

      const response = await fetch(`/api/nstp/community-officials/${userId}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Update local state
        allOfficials = allOfficials.map(o => {
          if (o.user_id === userId) {
            return { ...o, email: data.official.email };
          }
          return o;
        });
        applyFilters();
        closeEditModalFn();
        showMessage(data.message || 'Account details updated successfully.', 'success');
      } else {
        showMessage(data.message || 'Failed to update details.', 'error');
      }
    } catch (error) {
      console.error('Error editing official:', error);
      showMessage('An error occurred. Please try again.', 'error');
    }
  });

  // Message close
  messageClose.addEventListener('click', hideMessage);
}

/**
 * Message banner helpers
 */
function showMessage(message, type = 'success') {
  messageText.textContent = message;
  
  // Clear any existing class prefix
  messageContent.className = 'nstp-alert';
  if (type === 'success') {
    messageContent.classList.add('nstp-alert-success');
  } else if (type === 'error') {
    messageContent.classList.add('nstp-alert-error');
  } else {
    messageContent.classList.add('nstp-alert-info');
  }
  
  messageContainer.style.display = 'block';

  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
  messageTimeout = setTimeout(hideMessage, 5000);
}

function hideMessage() {
  messageContainer.style.display = 'none';
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
}

/**
 * Helpers
 */
function showLoading() {
  officialsTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="nstp-table-empty" style="text-align: center; padding: 2rem;">
        <div class="nstp-loading">Loading community officials...</div>
      </td>
    </tr>
  `;
}

function showError(message) {
  officialsTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="nstp-table-empty" style="text-align: center; padding: 2rem;">
        <div style="color: var(--nstp-primary-dark); font-weight: var(--nstp-weight-semibold);">${escapeHtml(message)}</div>
      </td>
    </tr>
  `;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
