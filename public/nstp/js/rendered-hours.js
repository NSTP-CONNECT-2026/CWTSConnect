// Rendered Hours JavaScript
let currentDeploymentId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserEmail();
  loadDeployments();
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

// Load deployments
async function loadDeployments() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/nstp/deployments', {
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

// Load statistics
async function loadStatistics() {
  if (!currentDeploymentId) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/rendered-hours/deployment/${currentDeploymentId}/statistics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const stats = data.statistics;
      
      document.getElementById('totalHours').textContent = stats.total_hours || 0;
      document.getElementById('averageHours').textContent = stats.average_hours || 0;
      document.getElementById('studentsCompleted').textContent = stats.students_completed || 0;
      document.getElementById('studentsInProgress').textContent = stats.students_in_progress || 0;
      
      document.getElementById('statisticsCards').style.display = 'grid';
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Load hours
async function loadHours() {
  if (!currentDeploymentId) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/rendered-hours/deployment/${currentDeploymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayHours(data.hours || []);
      document.getElementById('hoursSection').style.display = 'block';
    } else {
      showError('Failed to load hours data');
    }
  } catch (error) {
    console.error('Error loading hours:', error);
    showError('Failed to load hours data');
  } finally {
    hideLoading();
  }
}

// Display hours
function displayHours(hours) {
  const tbody = document.getElementById('hoursTableBody');
  
  if (hours.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hours data found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = hours.map(record => {
    const progress = record.required_hours > 0 
      ? Math.round((record.total_hours / record.required_hours) * 100) 
      : 0;
    const status = progress >= 100 ? 'completed' : 'in_progress';
    
    return `
      <tr>
        <td>${record.student_name || 'N/A'}</td>
        <td>${record.student_number || 'N/A'}</td>
        <td>${record.total_hours || 0}</td>
        <td>${record.regular_hours || 0}</td>
        <td>${record.makeup_hours || 0}</td>
        <td>${record.required_hours || 0}</td>
        <td>
          <div class="progress-bar-small">
            <div class="progress-fill-small" style="width: ${Math.min(progress, 100)}%"></div>
          </div>
          <span class="progress-text-small">${progress}%</span>
        </td>
        <td><span class="badge badge-${status}">${status === 'completed' ? 'Completed' : 'In Progress'}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewStudentDetails(${record.student_id})">View Details</button>
        </td>
      </tr>
    `;
  }).join('');
}

// View student details
async function viewStudentDetails(studentId) {
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/rendered-hours/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayStudentDetails(data);
      document.getElementById('studentDetailsModal').style.display = 'flex';
    } else {
      showError('Failed to load student details');
    }
  } catch (error) {
    console.error('Error loading student details:', error);
    showError('Failed to load student details');
  } finally {
    hideLoading();
  }
}

// Display student details
function displayStudentDetails(data) {
  document.getElementById('studentName').textContent = data.student_name || 'N/A';
  document.getElementById('studentNumber').textContent = data.student_number || 'N/A';
  document.getElementById('detailTotalHours').textContent = data.total_hours || 0;
  document.getElementById('detailRegularHours').textContent = data.regular_hours || 0;
  document.getElementById('detailMakeupHours').textContent = data.makeup_hours || 0;
  document.getElementById('detailRequiredHours').textContent = data.required_hours || 0;
  
  const tbody = document.getElementById('detailsTableBody');
  const records = data.attendance_records || [];
  
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance records found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${formatDate(record.attendance_date)}</td>
      <td>${formatTime(record.check_in_time)}</td>
      <td>${record.check_out_time ? formatTime(record.check_out_time) : 'N/A'}</td>
      <td>${record.hours_rendered || 0}</td>
      <td>${record.is_makeup ? 'Make-up' : 'Regular'}</td>
      <td><span class="badge badge-${record.verification_status}">${record.verification_status}</span></td>
    </tr>
  `).join('');
}

// Export hours
async function exportHours() {
  if (!currentDeploymentId) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/rendered-hours/deployment/${currentDeploymentId}/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hours_export_${currentDeploymentId}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Hours exported successfully');
    } else {
      showError('Failed to export hours');
    }
  } catch (error) {
    console.error('Error exporting hours:', error);
    showError('Failed to export hours');
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
      loadStatistics();
      loadHours();
    } else {
      document.getElementById('statisticsCards').style.display = 'none';
      document.getElementById('hoursSection').style.display = 'none';
    }
  });
  
  // Refresh buttons
  document.getElementById('refreshDeploymentsBtn').addEventListener('click', loadDeployments);
  document.getElementById('refreshHoursBtn').addEventListener('click', () => {
    loadStatistics();
    loadHours();
  });
  
  // Export button
  document.getElementById('exportHoursBtn').addEventListener('click', exportHours);
  
  // Student details modal
  document.getElementById('closeDetailsModal').addEventListener('click', () => {
    document.getElementById('studentDetailsModal').style.display = 'none';
  });
  
  document.getElementById('closeDetailsBtn').addEventListener('click', () => {
    document.getElementById('studentDetailsModal').style.display = 'none';
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeString) {
  if (!timeString) return 'N/A';
  return timeString.substring(0, 5);
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
