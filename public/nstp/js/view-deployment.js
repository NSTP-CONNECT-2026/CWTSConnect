/**
 * NSTPConnect - View Deployment JavaScript
 * Handles deployment details view functionality
 */

// Global variables
let currentDeployment = null;
let deploymentId = null;

// DOM elements
const deploymentDetailsCard = document.getElementById('deploymentDetailsCard');
const actionButtons = document.getElementById('actionButtons');
const statusActions = document.getElementById('statusActions');
const studentsSection = document.getElementById('studentsSection');
const studentsTableBody = document.getElementById('studentsTableBody');
const studentsCount = document.getElementById('studentsCount');
const statusUpdateModal = document.getElementById('statusUpdateModal');
const statusUpdateForm = document.getElementById('statusUpdateForm');
const newStatusSelect = document.getElementById('newStatus');
const loadingOverlay = document.getElementById('loadingOverlay');

// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('closeStatusModal').addEventListener('click', closeStatusUpdateModal);
document.getElementById('cancelStatusUpdate').addEventListener('click', closeStatusUpdateModal);
statusUpdateForm.addEventListener('submit', updateDeploymentStatus);

// Initialize page
async function initializePage() {
  try {
    await loadUserInfo();
    await loadDeploymentDetails();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize page: ' + error.message);
  }
}

// Load user information
async function loadUserInfo() {
  try {
    const response = await fetch('/api/nstp/profile');
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Failed to load user info');
    }
    
    const data = await response.json();
    if (data.success) {
      document.getElementById('userEmail').textContent = data.data.email;
    }
  } catch (error) {
    console.error('Load user info error:', error);
  }
}

// Load deployment details
async function loadDeploymentDetails() {
  try {
    // Get deployment ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    deploymentId = urlParams.get('deploymentId');

    if (!deploymentId) {
      throw new Error('Deployment ID not provided');
    }

    const response = await fetch(`/api/nstp/deployments/${deploymentId}`);
    if (!response.ok) {
      throw new Error('Failed to load deployment details');
    }

    const data = await response.json();
    if (data.success) {
      currentDeployment = data.data;
      renderDeploymentDetails();
      renderAssignedStudents();
      renderStatusActions();
      actionButtons.style.display = 'flex';
      studentsSection.style.display = 'block';
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Load deployment details error:', error);
    deploymentDetailsCard.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Deployment</h3>
        <p>${error.message}</p>
        <button type="button" class="btn btn-secondary" onclick="window.history.back()">
          Go Back
        </button>
      </div>
    `;
  }
}

// Render deployment details
function renderDeploymentDetails() {
  const deployment = currentDeployment;
  
  deploymentDetailsCard.innerHTML = `
    <div class="deployment-header">
      <div class="deployment-status-indicator">
        <span class="deployment-status-badge deployment-${deployment.deployment_status}">
          ${getDeploymentStatusDisplay(deployment.deployment_status)}
        </span>
      </div>
      <div class="deployment-title">
        <h2>${escapeHtml(deployment.deployment_batch_name)}</h2>
        <p class="deployment-subtitle">
          ${escapeHtml(deployment.activity_title)} • ${escapeHtml(deployment.community_name)}
        </p>
      </div>
    </div>

    <div class="deployment-content">
      <div class="deployment-section">
        <h3>Community Information</h3>
        <div class="deployment-grid">
          <div class="deployment-item">
            <label>Community Name</label>
            <span>${escapeHtml(deployment.community_name)}</span>
          </div>
          <div class="deployment-item">
            <label>Activity Title</label>
            <span>${escapeHtml(deployment.activity_title)}</span>
          </div>
          <div class="deployment-item">
            <label>Activity Type</label>
            <span>${escapeHtml(deployment.activity_type)}</span>
          </div>
          <div class="deployment-item">
            <label>Location</label>
            <span>${escapeHtml(deployment.municipality)}, ${escapeHtml(deployment.province)}</span>
          </div>
          <div class="deployment-item">
            <label>Community Address</label>
            <span>${escapeHtml(deployment.community_address || 'Not provided')}</span>
          </div>
          <div class="deployment-item">
            <label>Preferred NSTP Component</label>
            <span class="component-badge component-${deployment.preferred_nstp_component.toLowerCase()}">
              ${escapeHtml(deployment.preferred_nstp_component)}
            </span>
          </div>
        </div>
      </div>

      <div class="deployment-section">
        <h3>Deployment Information</h3>
        <div class="deployment-grid">
          <div class="deployment-item">
            <label>Deployment Batch Name</label>
            <span>${escapeHtml(deployment.deployment_batch_name)}</span>
          </div>
          <div class="deployment-item">
            <label>Deployment Status</label>
            <span class="deployment-status-badge deployment-${deployment.deployment_status}">
              ${getDeploymentStatusDisplay(deployment.deployment_status)}
            </span>
          </div>
          <div class="deployment-item">
            <label>Assigned By</label>
            <span>${escapeHtml(deployment.assigned_by_email)}</span>
          </div>
          <div class="deployment-item">
            <label>Created Date</label>
            <span>${formatDateTime(deployment.created_at)}</span>
          </div>
          <div class="deployment-item">
            <label>Start Date</label>
            <span>${formatDate(deployment.deployment_start_date)}</span>
          </div>
          <div class="deployment-item">
            <label>End Date</label>
            <span>${formatDate(deployment.deployment_end_date)}</span>
          </div>
          ${deployment.notes ? `
            <div class="deployment-item full-width">
              <label>Notes</label>
              <span>${escapeHtml(deployment.notes)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="deployment-section">
        <h3>Deployment Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${deployment.total_assigned_students}</div>
            <div class="summary-label">Total Assigned Students</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${deployment.students_needed}</div>
            <div class="summary-label">Students Needed</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${deployment.active_students}</div>
            <div class="summary-label">Active Students</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${deployment.completed_students}</div>
            <div class="summary-label">Completed Students</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render assigned students
function renderAssignedStudents() {
  const students = currentDeployment.assigned_students || [];
  
  studentsCount.textContent = `${students.length} student${students.length !== 1 ? 's' : ''} assigned`;

  if (students.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No students assigned to this deployment.</td>
      </tr>
    `;
    return;
  }

  studentsTableBody.innerHTML = students.map(student => `
    <tr>
      <td>${escapeHtml(student.student_name)}</td>
      <td>${escapeHtml(student.student_number)}</td>
      <td>${escapeHtml(student.course)}</td>
      <td>${escapeHtml(student.year_level)}</td>
      <td>
        <span class="component-badge component-${student.nstp_component.toLowerCase()}">
          ${escapeHtml(student.nstp_component)}
        </span>
      </td>
      <td>
        <span class="student-status-badge student-${student.deployment_student_status}">
          ${getStudentStatusDisplay(student.deployment_student_status)}
        </span>
      </td>
      <td>${formatDateTime(student.assigned_at)}</td>
      <td>
        <div class="action-buttons">
          <button type="button" class="btn btn-sm btn-secondary" onclick="viewStudentProfile('${student.student_user_id}')">
            View Profile
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render status action buttons
function renderStatusActions() {
  const currentStatus = currentDeployment.deployment_status;
  const allowedTransitions = getAllowedStatusTransitions(currentStatus);
  
  if (allowedTransitions.length === 0) {
    statusActions.innerHTML = `
      <span class="text-muted">No status changes available</span>
    `;
    return;
  }

  statusActions.innerHTML = allowedTransitions.map(status => `
    <button type="button" class="btn btn-primary" onclick="openStatusUpdateModal('${status}')">
      ${getStatusActionLabel(status)}
    </button>
  `).join('');
}

// Get allowed status transitions
function getAllowedStatusTransitions(currentStatus) {
  const transitions = {
    'pending': ['active', 'cancelled'],
    'active': ['ongoing', 'cancelled'],
    'ongoing': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
  };
  
  return transitions[currentStatus] || [];
}

// Get status action label
function getStatusActionLabel(status) {
  const labels = {
    'active': 'Activate Deployment',
    'ongoing': 'Mark as Ongoing',
    'completed': 'Mark as Completed',
    'cancelled': 'Cancel Deployment'
  };
  
  return labels[status] || `Update to ${status}`;
}

// Open status update modal
function openStatusUpdateModal(targetStatus) {
  // Populate status options
  newStatusSelect.innerHTML = `<option value="${targetStatus}">${getDeploymentStatusDisplay(targetStatus)}</option>`;
  
  statusUpdateModal.style.display = 'flex';
}

// Close status update modal
function closeStatusUpdateModal() {
  statusUpdateModal.style.display = 'none';
  statusUpdateForm.reset();
}

// Update deployment status
async function updateDeploymentStatus(event) {
  event.preventDefault();
  
  try {
    showLoadingOverlay(true);
    
    const formData = new FormData(statusUpdateForm);
    const newStatus = formData.get('status');
    const notes = formData.get('notes');

    const response = await fetch(`/api/nstp/deployments/${deploymentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus,
        notes: notes
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update status');
    }

    const data = await response.json();
    if (data.success) {
      showSuccess(`Deployment status updated to ${getDeploymentStatusDisplay(newStatus)}`);
      
      // Reload deployment details
      await loadDeploymentDetails();
      closeStatusUpdateModal();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Update deployment status error:', error);
    showError('Failed to update deployment status: ' + error.message);
  } finally {
    showLoadingOverlay(false);
  }
}

// View student profile
function viewStudentProfile(studentId) {
  window.open(`student-match-profile.html?studentId=${studentId}`, '_blank');
}

// Get deployment status display
function getDeploymentStatusDisplay(status) {
  const displays = {
    'pending': 'Pending Deployment',
    'active': 'Active',
    'ongoing': 'Ongoing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  return displays[status] || status;
}

// Get student status display
function getStudentStatusDisplay(status) {
  const displays = {
    'assigned': 'Assigned',
    'active': 'Active',
    'completed': 'Completed',
    'removed': 'Removed'
  };
  
  return displays[status] || status;
}

// Show/hide loading overlay
function showLoadingOverlay(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function showSuccess(message) {
  alert('Success: ' + message);
}

function showError(message) {
  alert('Error: ' + message);
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        window.location.href = '/login.html';
      })
      .catch(error => {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
      });
  }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target === statusUpdateModal) {
    closeStatusUpdateModal();
  }
});