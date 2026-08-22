// Student Make-up Request JavaScript

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserEmail();
  loadSummaryStats();
  loadMyRequests();
  setupEventListeners();
});

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
}

// Load user email
async function loadUserEmail() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/student/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('topbarEmail').textContent = data.email || 'Student';
    }
  } catch (error) {
    console.error('Error loading user email:', error);
  }
}

// Load summary statistics
async function loadSummaryStats() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/make-up-requests/my-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const requests = data.requests || [];
      
      document.getElementById('pendingCount').textContent = 
        requests.filter(r => r.status === 'pending').length;
      document.getElementById('approvedCount').textContent = 
        requests.filter(r => r.status === 'approved').length;
      document.getElementById('completedCount').textContent = 
        requests.filter(r => r.status === 'completed').length;
      document.getElementById('rejectedCount').textContent = 
        requests.filter(r => r.status === 'rejected').length;
    }
  } catch (error) {
    console.error('Error loading summary stats:', error);
  }
}

// Load my requests
async function loadMyRequests() {
  try {
    const token = localStorage.getItem('token');
    const statusFilter = document.getElementById('statusFilter').value;
    
    let url = '/api/make-up-requests/my-requests';
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayRequests(data.requests || []);
    } else {
      showError('Failed to load requests');
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    showError('Failed to load requests');
  }
}

// Display requests
function displayRequests(requests) {
  const tbody = document.getElementById('requestsTableBody');
  
  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No make-up requests found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = requests.map(request => `
    <tr>
      <td>${formatDate(request.missed_date)}</td>
      <td>${formatDate(request.proposed_date)}</td>
      <td>${truncateText(request.reason, 50)}</td>
      <td><span class="badge badge-${request.status}">${request.status}</span></td>
      <td>${formatDate(request.created_at)}</td>
      <td>
        <button class="brutal-btn brutal-btn-secondary" style="padding: 4px 12px; font-size: 0.75rem;" onclick="viewRequest(${request.request_id})">View</button>
        ${request.status === 'pending' ? `
          <button class="brutal-btn brutal-btn-danger" style="padding: 4px 12px; font-size: 0.75rem;" onclick="cancelRequest(${request.request_id})">Cancel</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// View request
async function viewRequest(requestId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/make-up-requests/my-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const request = data.requests.find(r => r.request_id === requestId);
      
      if (request) {
        document.getElementById('viewMissedDate').textContent = formatDate(request.missed_date);
        document.getElementById('viewProposedDate').textContent = formatDate(request.proposed_date);
        document.getElementById('viewStatus').innerHTML = `<span class="badge badge-${request.status}">${request.status}</span>`;
        document.getElementById('viewSubmitted').textContent = formatDate(request.created_at);
        document.getElementById('viewReason').textContent = request.reason;
        
        // Show review notes if available
        if (request.review_notes) {
          document.getElementById('reviewNotesSection').style.display = 'block';
          document.getElementById('viewReviewNotes').textContent = request.review_notes;
        } else {
          document.getElementById('reviewNotesSection').style.display = 'none';
        }
        
        // Show completion details if completed
        if (request.status === 'completed') {
          document.getElementById('completionSection').style.display = 'block';
          document.getElementById('viewActualDate').textContent = formatDate(request.actual_date);
          document.getElementById('viewHoursRendered').textContent = request.hours_rendered || 0;
          document.getElementById('viewCompletionNotes').textContent = request.completion_notes || 'N/A';
        } else {
          document.getElementById('completionSection').style.display = 'none';
        }
        
        document.getElementById('viewModal').style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('Error loading request details:', error);
    showError('Failed to load request details');
  }
}

// Cancel request
async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this request?')) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/make-up-requests/${requestId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showSuccess('Request cancelled successfully');
      loadSummaryStats();
      loadMyRequests();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to cancel request');
    }
  } catch (error) {
    console.error('Error cancelling request:', error);
    showError('Failed to cancel request');
  } finally {
    hideLoading();
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    missed_date: formData.get('missed_date'),
    proposed_date: formData.get('proposed_date'),
    reason: formData.get('reason')
  };
  
  // Validate dates
  const missedDate = new Date(data.missed_date);
  const proposedDate = new Date(data.proposed_date);
  const today = new Date();
  
  if (missedDate > today) {
    showError('Missed date cannot be in the future');
    return;
  }
  
  if (proposedDate < today) {
    showError('Proposed date must be in the future');
    return;
  }
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch('/api/make-up-requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showSuccess('Make-up request submitted successfully');
      e.target.reset();
      loadSummaryStats();
      loadMyRequests();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to submit request');
    }
  } catch (error) {
    console.error('Error submitting request:', error);
    showError('Failed to submit request');
  } finally {
    hideLoading();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
  
  // Form submission
  document.getElementById('makeUpRequestForm').addEventListener('submit', handleFormSubmit);
  
  // Status filter
  document.getElementById('statusFilter').addEventListener('change', loadMyRequests);
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadSummaryStats();
    loadMyRequests();
  });
  
  // View modal
  document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewModal').style.display = 'none';
  });
  
  document.getElementById('closeViewBtn').addEventListener('click', () => {
    document.getElementById('viewModal').style.display = 'none';
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
