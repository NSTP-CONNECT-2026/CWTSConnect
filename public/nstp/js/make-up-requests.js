// Make-up Requests Management JavaScript
let currentDeploymentId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserEmail();
  loadDeployments();
  loadSummaryStats();
  setupEventListeners();
});

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../login.html';
    return;
  }
}

// Load user email
async function loadUserEmail() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/nstp/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('userEmail').textContent = data.email || 'NSTP Official';
    }
  } catch (error) {
    console.error('Error loading user email:', error);
  }
}

// Load summary statistics
async function loadSummaryStats() {
  try {
    const token = localStorage.getItem('token');
    
    if (currentDeploymentId) {
      const response = await fetch(`/api/make-up-requests/deployment/${currentDeploymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || [];
        
        document.getElementById('pendingRequests').textContent = 
          requests.filter(r => r.status === 'pending').length;
        document.getElementById('approvedRequests').textContent = 
          requests.filter(r => r.status === 'approved').length;
        document.getElementById('completedRequests').textContent = 
          requests.filter(r => r.status === 'completed').length;
        document.getElementById('rejectedRequests').textContent = 
          requests.filter(r => r.status === 'rejected').length;
      }
    }
  } catch (error) {
    console.error('Error loading summary stats:', error);
  }
}

// Load deployments
async function loadDeployments() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/nstp/deployments?status=active,ongoing', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const deployments = data.deployments || [];
      
      const select = document.getElementById('deploymentSelect');
      select.innerHTML = '<option value="">-- Select Deployment --</option>';
      
      deployments.forEach(deployment => {
        const option = document.createElement('option');
        option.value = deployment.deployment_id;
        option.textContent = `${deployment.deployment_batch_name} - ${deployment.community_name}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading deployments:', error);
    showError('Failed to load deployments');
  }
}

// Load make-up requests
async function loadRequests() {
  if (!currentDeploymentId) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const statusFilter = document.getElementById('statusFilter').value;
    
    let url = `/api/make-up-requests/deployment/${currentDeploymentId}`;
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayRequests(data.requests || []);
      document.getElementById('requestsSection').style.display = 'block';
    } else {
      showError('Failed to load make-up requests');
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    showError('Failed to load make-up requests');
  } finally {
    hideLoading();
  }
}

// Display requests
function displayRequests(requests) {
  const tbody = document.getElementById('requestsTableBody');
  
  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No make-up requests found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = requests.map(request => `
    <tr>
      <td>${request.student_name || 'N/A'}</td>
      <td>${request.student_number || 'N/A'}</td>
      <td>${formatDate(request.missed_date)}</td>
      <td>${formatDate(request.proposed_date)}</td>
      <td>${request.reason || 'N/A'}</td>
      <td><span class="badge badge-${request.status}">${request.status}</span></td>
      <td>${formatDate(request.created_at)}</td>
      <td>
        ${request.status === 'pending' ? `
          <button class="btn btn-sm btn-primary" onclick="reviewRequest(${request.request_id}, '${request.student_name}', '${request.student_number}', '${request.missed_date}', '${request.proposed_date}', '${request.reason}')">Review</button>
        ` : ''}
        ${request.status === 'approved' ? `
          <button class="btn btn-sm btn-success" onclick="completeRequest(${request.request_id})">Complete</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// Review request
function reviewRequest(requestId, studentName, studentNumber, missedDate, proposedDate, reason) {
  document.getElementById('reviewRequestId').value = requestId;
  document.getElementById('reviewStudentName').textContent = studentName;
  document.getElementById('reviewStudentNumber').textContent = studentNumber;
  document.getElementById('reviewMissedDate').textContent = formatDate(missedDate);
  document.getElementById('reviewProposedDate').textContent = formatDate(proposedDate);
  document.getElementById('reviewReason').textContent = reason;
  document.getElementById('reviewModal').style.display = 'flex';
}

// Approve request
async function approveRequest() {
  const requestId = document.getElementById('reviewRequestId').value;
  const notes = document.getElementById('reviewNotes').value;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/make-up-requests/${requestId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ review_notes: notes })
    });
    
    if (response.ok) {
      showSuccess('Request approved successfully');
      document.getElementById('reviewModal').style.display = 'none';
      loadRequests();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to approve request');
    }
  } catch (error) {
    console.error('Error approving request:', error);
    showError('Failed to approve request');
  } finally {
    hideLoading();
  }
}

// Reject request
async function rejectRequest() {
  const requestId = document.getElementById('reviewRequestId').value;
  const notes = document.getElementById('reviewNotes').value;
  
  if (!notes) {
    showError('Please provide a reason for rejection');
    return;
  }
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/make-up-requests/${requestId}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ review_notes: notes })
    });
    
    if (response.ok) {
      showSuccess('Request rejected');
      document.getElementById('reviewModal').style.display = 'none';
      loadRequests();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to reject request');
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    showError('Failed to reject request');
  } finally {
    hideLoading();
  }
}

// Complete request
function completeRequest(requestId) {
  document.getElementById('completeRequestId').value = requestId;
  document.getElementById('actualDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('completeModal').style.display = 'flex';
}

// Handle complete form submission
async function handleCompleteSubmit(e) {
  e.preventDefault();
  
  const requestId = document.getElementById('completeRequestId').value;
  const formData = new FormData(e.target);
  const data = {
    actual_date: formData.get('actual_date'),
    hours_rendered: parseFloat(formData.get('hours_rendered')),
    completion_notes: formData.get('completion_notes')
  };
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/make-up-requests/${requestId}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showSuccess('Make-up session marked as completed');
      document.getElementById('completeModal').style.display = 'none';
      e.target.reset();
      loadRequests();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to complete request');
    }
  } catch (error) {
    console.error('Error completing request:', error);
    showError('Failed to complete request');
  } finally {
    hideLoading();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../login.html';
  });
  
  // Deployment selection
  document.getElementById('deploymentSelect').addEventListener('change', (e) => {
    currentDeploymentId = e.target.value;
    if (currentDeploymentId) {
      loadRequests();
      loadSummaryStats();
    } else {
      document.getElementById('requestsSection').style.display = 'none';
    }
  });
  
  // Status filter
  document.getElementById('statusFilter').addEventListener('change', loadRequests);
  
  // Refresh buttons
  document.getElementById('refreshDeploymentsBtn').addEventListener('click', loadDeployments);
  document.getElementById('refreshRequestsBtn').addEventListener('click', loadRequests);
  
  // Review modal
  document.getElementById('closeReviewModal').addEventListener('click', () => {
    document.getElementById('reviewModal').style.display = 'none';
  });
  
  document.getElementById('cancelReviewBtn').addEventListener('click', () => {
    document.getElementById('reviewModal').style.display = 'none';
  });
  
  document.getElementById('approveRequestBtn').addEventListener('click', approveRequest);
  document.getElementById('rejectRequestBtn').addEventListener('click', rejectRequest);
  
  // Complete modal
  document.getElementById('closeCompleteModal').addEventListener('click', () => {
    document.getElementById('completeModal').style.display = 'none';
  });
  
  document.getElementById('cancelCompleteBtn').addEventListener('click', () => {
    document.getElementById('completeModal').style.display = 'none';
  });
  
  document.getElementById('completeForm').addEventListener('submit', handleCompleteSubmit);
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showSuccess(message) {
  alert(message);
}

function showError(message) {
  alert('Error: ' + message);
}
