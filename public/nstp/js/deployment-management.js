/**
 * NSTPConnect - Deployment Management JavaScript
 * Handles deployment management functionality
 */

// Global variables
let currentRequestId = null;
let currentRequest = null;
let deployableRequests = [];
let dssRecommendations = [];
let selectedStudents = [];
let existingDeployments = [];

// DOM elements
const summaryCards = {
  totalDeployments: document.getElementById('totalDeployments'),
  activeDeployments: document.getElementById('activeDeployments'),
  completedDeployments: document.getElementById('completedDeployments'),
  pendingDeployments: document.getElementById('pendingDeployments'),
  assignedStudents: document.getElementById('assignedStudents')
};

const requestsTableBody = document.getElementById('requestsTableBody');
const studentsTableBody = document.getElementById('studentsTableBody');
const deploymentsTableBody = document.getElementById('deploymentsTableBody');
const assignmentSection = document.getElementById('assignmentSection');
const assignmentInfo = document.getElementById('assignmentInfo');
const selectionCount = document.getElementById('selectionCount');
const studentsNeeded = document.getElementById('studentsNeeded');
const createDeploymentBtn = document.getElementById('createDeploymentBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Form elements
const deploymentForm = document.getElementById('deploymentForm');
const deploymentBatchName = document.getElementById('deploymentBatchName');
const deploymentStartDate = document.getElementById('deploymentStartDate');
const deploymentEndDate = document.getElementById('deploymentEndDate');
const deploymentNotes = document.getElementById('deploymentNotes');

// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);
document.getElementById('refreshRequestsBtn').addEventListener('click', loadDeployableRequests);
document.getElementById('refreshDeploymentsBtn').addEventListener('click', loadExistingDeployments);
document.getElementById('deploymentStatusFilter').addEventListener('change', loadExistingDeployments);
document.getElementById('cancelAssignmentBtn').addEventListener('click', cancelAssignment);
document.getElementById('createDeploymentBtn').addEventListener('click', createDeployment);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Initialize page
async function initializePage() {
  try {
    await loadUserInfo();
    await loadDashboardSummary();
    await loadDeployableRequests();
    await loadExistingDeployments();
    setMinimumDates();
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

// Load dashboard summary
async function loadDashboardSummary() {
  try {
    const response = await fetch('/api/nstp/deployments/summary');
    if (!response.ok) {
      throw new Error('Failed to load dashboard summary');
    }
    
    const data = await response.json();
    if (data.success) {
      const summary = data.data;
      summaryCards.totalDeployments.textContent = summary.total_deployments || 0;
      summaryCards.activeDeployments.textContent = summary.active_deployments || 0;
      summaryCards.completedDeployments.textContent = summary.completed_deployments || 0;
      summaryCards.pendingDeployments.textContent = summary.pending_deployments || 0;
      summaryCards.assignedStudents.textContent = summary.assigned_students || 0;
    }
  } catch (error) {
    console.error('Load dashboard summary error:', error);
    showError('Failed to load dashboard summary');
  }
}

// Load deployable requests
async function loadDeployableRequests() {
  try {
    const response = await fetch('/api/nstp/deployments/deployable-requests');
    if (!response.ok) {
      throw new Error('Failed to load deployable requests');
    }
    
    const data = await response.json();
    if (data.success) {
      deployableRequests = data.data;
      renderDeployableRequests();
    }
  } catch (error) {
    console.error('Load deployable requests error:', error);
    showError('Failed to load deployable requests');
  }
}

// Render deployable requests table
function renderDeployableRequests() {
  if (deployableRequests.length === 0) {
    requestsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No approved community requests found.</td>
      </tr>
    `;
    return;
  }

  requestsTableBody.innerHTML = deployableRequests.map(request => {
    const deploymentStatus = getDeploymentStatusDisplay(request.deployment_status, request.assigned_students);
    
    return `
      <tr>
        <td>${escapeHtml(request.community_name)}</td>
        <td>${escapeHtml(request.activity_title)}</td>
        <td>${escapeHtml(request.activity_type)}</td>
        <td>${escapeHtml(request.preferred_nstp_component)}</td>
        <td>${request.students_needed}</td>
        <td>${request.assigned_students || 0}</td>
        <td>
          <span class="deployment-status-badge deployment-${request.deployment_status || 'no_deployment'}">
            ${deploymentStatus}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            ${getRequestActionButtons(request)}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Get deployment status display text
function getDeploymentStatusDisplay(status, assignedCount) {
  switch (status) {
    case 'pending': return 'Pending Deployment';
    case 'active': return 'Active';
    case 'ongoing': return 'Ongoing';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'no_deployment':
    default:
      return assignedCount > 0 ? 'Partially Assigned' : 'No Deployment';
  }
}

// Get action buttons for request
function getRequestActionButtons(request) {
  const buttons = [];
  
  // View Recommendations button (always available)
  buttons.push(`
    <button type="button" class="btn btn-sm btn-secondary" onclick="viewRecommendations('${request.request_id}')">
      View Recommendations
    </button>
  `);
  
  // Assign Students button (only if not fully assigned or completed)
  if (request.deployment_status !== 'completed' && request.assigned_students < request.students_needed) {
    buttons.push(`
      <button type="button" class="btn btn-sm btn-primary" onclick="assignStudents('${request.request_id}')">
        Assign Students
      </button>
    `);
  }
  
  // View Deployment button (if deployment exists)
  if (request.deployment_status && request.deployment_status !== 'no_deployment') {
    buttons.push(`
      <button type="button" class="btn btn-sm btn-secondary" onclick="viewDeployment('${request.request_id}')">
        View Deployment
      </button>
    `);
  }
  
  return buttons.join('');
}

// View DSS recommendations
async function viewRecommendations(requestId) {
  try {
    const response = await fetch(`/api/nstp/dss/results/${requestId}`);
    if (!response.ok) {
      throw new Error('Failed to load recommendations');
    }

    const data = await response.json();
    if (data.success) {
      const results = data.data.results;
      if (results.length > 0) {
        showRecommendationsModal(results);
      } else {
        showInfo('No DSS recommendations found for this request. Generate matches first in DSS Matching module.');
      }
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('View recommendations error:', error);
    showError('Failed to load recommendations: ' + error.message);
  }
}

// Show recommendations in a simple alert (can be enhanced with modal)
function showRecommendationsModal(recommendations) {
  const message = `DSS Recommendations:\n\n${recommendations.slice(0, 5).map((rec, index) => 
    `${index + 1}. ${rec.student_name} (${rec.student_number}) - ${rec.totalScore}% - ${rec.matchLabel}`
  ).join('\n')}\n\n${recommendations.length > 5 ? `... and ${recommendations.length - 5} more` : ''}`;
  
  alert(message);
}

// Assign students to deployment
async function assignStudents(requestId) {
  try {
    // Find the request
    currentRequest = deployableRequests.find(r => r.request_id === requestId);
    if (!currentRequest) {
      throw new Error('Request not found');
    }

    currentRequestId = requestId;
    selectedStudents = [];

    // Load DSS recommendations
    await loadDSSRecommendations(requestId);
    
    // Show assignment section
    showAssignmentSection();
    
  } catch (error) {
    console.error('Assign students error:', error);
    showError('Failed to load assignment interface: ' + error.message);
  }
}

// Load DSS recommendations for assignment
async function loadDSSRecommendations(requestId) {
  try {
    const response = await fetch(`/api/nstp/deployments/request/${requestId}/recommendations`);
    if (!response.ok) {
      throw new Error('Failed to load DSS recommendations');
    }

    const data = await response.json();
    if (data.success) {
      dssRecommendations = data.data.recommendations;
      renderStudentRecommendations();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Load DSS recommendations error:', error);
    showError('Failed to load student recommendations: ' + error.message);
  }
}

// Show assignment section
function showAssignmentSection() {
  assignmentInfo.textContent = `Assigning students to: ${currentRequest.activity_title} (${currentRequest.community_name})`;
  studentsNeeded.textContent = currentRequest.students_needed;
  updateSelectionCount();
  
  // Set default batch name
  deploymentBatchName.value = `${currentRequest.preferred_nstp_component} Deployment - ${currentRequest.community_name}`;
  
  assignmentSection.style.display = 'block';
  assignmentSection.scrollIntoView({ behavior: 'smooth' });
}

// Render student recommendations
function renderStudentRecommendations() {
  if (dssRecommendations.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-muted">
          No DSS recommendations found. Generate matches first in DSS Matching module.
        </td>
      </tr>
    `;
    return;
  }

  studentsTableBody.innerHTML = dssRecommendations.map(student => `
    <tr>
      <td>
        <input type="checkbox" 
               id="student_${student.student_user_id}" 
               value="${student.student_user_id}"
               ${!student.is_available ? 'disabled' : ''}
               onchange="toggleStudentSelection('${student.student_user_id}')">
      </td>
      <td>
        <span class="rank-badge">#${student.recommendation_rank}</span>
      </td>
      <td>
        ${escapeHtml(student.student_name)}
        ${!student.is_available ? '<br><small class="text-muted">(Already assigned)</small>' : ''}
      </td>
      <td>${escapeHtml(student.student_number)}</td>
      <td>${escapeHtml(student.course)}</td>
      <td>${escapeHtml(student.nstp_component)}</td>
      <td>
        <span class="score-badge">${student.match_score}%</span>
      </td>
      <td>
        <span class="match-label match-${student.match_label.toLowerCase().replace(/\s+/g, '-')}">
          ${escapeHtml(student.match_label)}
        </span>
      </td>
      <td>${escapeHtml(student.municipality)}</td>
      <td>
        <div class="skills-list">
          ${(student.skills || []).slice(0, 3).map(skill => 
            `<span class="skill-tag">${escapeHtml(skill)}</span>`
          ).join('')}
          ${student.skills && student.skills.length > 3 ? '<span class="skill-tag">...</span>' : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Toggle student selection
function toggleStudentSelection(studentId) {
  const checkbox = document.getElementById(`student_${studentId}`);
  
  if (checkbox.checked) {
    if (selectedStudents.length >= currentRequest.students_needed) {
      checkbox.checked = false;
      showError(`Cannot select more than ${currentRequest.students_needed} students`);
      return;
    }
    selectedStudents.push(studentId);
  } else {
    selectedStudents = selectedStudents.filter(id => id !== studentId);
  }
  
  updateSelectionCount();
}

// Update selection count and button state
function updateSelectionCount() {
  selectionCount.textContent = selectedStudents.length;
  createDeploymentBtn.disabled = selectedStudents.length === 0;
}

// Cancel assignment
function cancelAssignment() {
  currentRequestId = null;
  currentRequest = null;
  selectedStudents = [];
  dssRecommendations = [];
  assignmentSection.style.display = 'none';
  deploymentForm.reset();
}

// Create deployment
async function createDeployment() {
  try {
    // Validate form
    if (!deploymentForm.checkValidity()) {
      deploymentForm.reportValidity();
      return;
    }

    if (selectedStudents.length === 0) {
      showError('Please select at least one student');
      return;
    }

    showLoadingOverlay(true);

    const deploymentData = {
      request_id: currentRequestId,
      deployment_batch_name: deploymentBatchName.value.trim(),
      deployment_start_date: deploymentStartDate.value,
      deployment_end_date: deploymentEndDate.value,
      selected_students: selectedStudents,
      notes: deploymentNotes.value.trim() || null
    };

    const response = await fetch('/api/nstp/deployments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create deployment');
    }

    const data = await response.json();
    if (data.success) {
      showSuccess(`Deployment created successfully! Assigned ${selectedStudents.length} students.`);
      
      // Refresh data
      await loadDashboardSummary();
      await loadDeployableRequests();
      await loadExistingDeployments();
      
      // Clear assignment
      cancelAssignment();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Create deployment error:', error);
    showError('Failed to create deployment: ' + error.message);
  } finally {
    showLoadingOverlay(false);
  }
}

// Load existing deployments
async function loadExistingDeployments() {
  try {
    const status = document.getElementById('deploymentStatusFilter').value;
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }

    const response = await fetch(`/api/nstp/deployments?${params}`);
    if (!response.ok) {
      throw new Error('Failed to load deployments');
    }
    
    const data = await response.json();
    if (data.success) {
      existingDeployments = data.data;
      renderExistingDeployments();
    }
  } catch (error) {
    console.error('Load existing deployments error:', error);
    showError('Failed to load deployments');
  }
}

// Render existing deployments
function renderExistingDeployments() {
  if (existingDeployments.length === 0) {
    deploymentsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No deployments found.</td>
      </tr>
    `;
    return;
  }

  deploymentsTableBody.innerHTML = existingDeployments.map(deployment => `
    <tr>
      <td>${escapeHtml(deployment.deployment_batch_name)}</td>
      <td>${escapeHtml(deployment.community_name)}</td>
      <td>${escapeHtml(deployment.activity_title)}</td>
      <td>${deployment.assigned_students}/${deployment.students_needed}</td>
      <td>
        <span class="deployment-status-badge deployment-${deployment.deployment_status}">
          ${getDeploymentStatusDisplay(deployment.deployment_status)}
        </span>
      </td>
      <td>${formatDate(deployment.deployment_start_date)}</td>
      <td>${formatDate(deployment.deployment_end_date)}</td>
      <td>
        <div class="action-buttons">
          <button type="button" class="btn btn-sm btn-secondary" onclick="viewDeploymentDetails('${deployment.deployment_id}')">
            View Details
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// View deployment details
function viewDeploymentDetails(deploymentId) {
  window.location.href = `view-deployment.html?deploymentId=${deploymentId}`;
}

// View deployment by request ID (find deployment for request)
async function viewDeployment(requestId) {
  try {
    const deployment = existingDeployments.find(d => d.request_id === requestId);
    if (deployment) {
      viewDeploymentDetails(deployment.deployment_id);
    } else {
      showError('Deployment not found');
    }
  } catch (error) {
    console.error('View deployment error:', error);
    showError('Failed to view deployment');
  }
}

// Set minimum dates (today)
function setMinimumDates() {
  const today = new Date().toISOString().split('T')[0];
  deploymentStartDate.min = today;
  deploymentEndDate.min = today;
  
  // Update end date minimum when start date changes
  deploymentStartDate.addEventListener('change', function() {
    deploymentEndDate.min = this.value;
    if (deploymentEndDate.value && deploymentEndDate.value < this.value) {
      deploymentEndDate.value = this.value;
    }
  });
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

function showSuccess(message) {
  alert('Success: ' + message);
}

function showError(message) {
  alert('Error: ' + message);
}

function showInfo(message) {
  alert('Info: ' + message);
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