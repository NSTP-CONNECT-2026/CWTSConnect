// Attendance Management JavaScript
let currentDeploymentId = null;
let currentStudents = [];

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
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceResponse = await fetch(`/api/attendance/deployment/${currentDeploymentId || 'all'}?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (attendanceResponse.ok) {
      const attendanceData = await attendanceResponse.json();
      const records = attendanceData.attendance || [];
      
      document.getElementById('totalAttendanceToday').textContent = records.length;
      document.getElementById('pendingVerification').textContent = 
        records.filter(r => r.verification_status === 'pending').length;
      document.getElementById('activeStudents').textContent = 
        records.filter(r => r.check_out_time === null).length;
      
      const verifiedCount = records.filter(r => r.verification_status === 'verified').length;
      const rate = records.length > 0 ? Math.round((verifiedCount / records.length) * 100) : 0;
      document.getElementById('averageAttendanceRate').textContent = `${rate}%`;
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

// Load attendance records
async function loadAttendance() {
  if (!currentDeploymentId) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const statusFilter = document.getElementById('statusFilter').value;
    
    let url = `/api/attendance/deployment/${currentDeploymentId}`;
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayAttendance(data.attendance || []);
      document.getElementById('attendanceSection').style.display = 'block';
    } else {
      showError('Failed to load attendance records');
    }
  } catch (error) {
    console.error('Error loading attendance:', error);
    showError('Failed to load attendance records');
  } finally {
    hideLoading();
  }
}

// Display attendance records
function displayAttendance(records) {
  const tbody = document.getElementById('attendanceTableBody');
  
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No attendance records found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${record.student_name || 'N/A'}</td>
      <td>${record.student_number || 'N/A'}</td>
      <td>${formatDate(record.attendance_date)}</td>
      <td>${formatTime(record.check_in_time)}</td>
      <td>${record.check_out_time ? formatTime(record.check_out_time) : 'Not checked out'}</td>
      <td>${record.hours_rendered || '0.0'} hrs</td>
      <td><span class="badge badge-${record.verification_status}">${record.verification_status}</span></td>
      <td>
        ${record.verification_status === 'pending' ? `
          <button class="btn btn-sm btn-primary" onclick="verifyAttendance(${record.attendance_id})">Verify</button>
          <button class="btn btn-sm btn-danger" onclick="rejectAttendance(${record.attendance_id})">Reject</button>
        ` : ''}
        <button class="btn btn-sm btn-secondary" onclick="editAttendance(${record.attendance_id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAttendance(${record.attendance_id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Verify attendance
async function verifyAttendance(attendanceId) {
  if (!confirm('Verify this attendance record?')) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/attendance/${attendanceId}/verify`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      showSuccess('Attendance verified successfully');
      loadAttendance();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to verify attendance');
    }
  } catch (error) {
    console.error('Error verifying attendance:', error);
    showError('Failed to verify attendance');
  } finally {
    hideLoading();
  }
}

// Reject attendance
async function rejectAttendance(attendanceId) {
  const reason = prompt('Enter reason for rejection:');
  if (!reason) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/attendance/${attendanceId}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rejection_reason: reason })
    });
    
    if (response.ok) {
      showSuccess('Attendance rejected');
      loadAttendance();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to reject attendance');
    }
  } catch (error) {
    console.error('Error rejecting attendance:', error);
    showError('Failed to reject attendance');
  } finally {
    hideLoading();
  }
}

// Delete attendance
async function deleteAttendance(attendanceId) {
  if (!confirm('Delete this attendance record? This action cannot be undone.')) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/attendance/${attendanceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showSuccess('Attendance deleted successfully');
      loadAttendance();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to delete attendance');
    }
  } catch (error) {
    console.error('Error deleting attendance:', error);
    showError('Failed to delete attendance');
  } finally {
    hideLoading();
  }
}

// Edit attendance
function editAttendance(attendanceId) {
  // Implementation for edit modal
  showError('Edit functionality coming soon');
}

// Load students for manual attendance
async function loadStudentsForManual() {
  if (!currentDeploymentId) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/nstp/deployments/${currentDeploymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentStudents = data.students || [];
      
      const select = document.getElementById('studentSelect');
      select.innerHTML = '<option value="">-- Select Student --</option>';
      
      currentStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.full_name} (${student.student_number})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading students:', error);
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
      loadAttendance();
      loadSummaryStats();
    } else {
      document.getElementById('attendanceSection').style.display = 'none';
    }
  });
  
  // Status filter
  document.getElementById('statusFilter').addEventListener('change', loadAttendance);
  
  // Refresh buttons
  document.getElementById('refreshDeploymentsBtn').addEventListener('click', loadDeployments);
  document.getElementById('refreshAttendanceBtn').addEventListener('click', loadAttendance);
  
  // Manual attendance
  document.getElementById('addManualAttendanceBtn').addEventListener('click', () => {
    if (!currentDeploymentId) {
      showError('Please select a deployment first');
      return;
    }
    loadStudentsForManual();
    document.getElementById('manualAttendanceModal').style.display = 'flex';
  });
  
  document.getElementById('closeManualModal').addEventListener('click', () => {
    document.getElementById('manualAttendanceModal').style.display = 'none';
  });
  
  document.getElementById('cancelManualBtn').addEventListener('click', () => {
    document.getElementById('manualAttendanceModal').style.display = 'none';
  });
  
  // Manual attendance form
  document.getElementById('manualAttendanceForm').addEventListener('submit', handleManualAttendance);
}

// Handle manual attendance submission
async function handleManualAttendance(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    deployment_id: currentDeploymentId,
    student_id: formData.get('student_id'),
    attendance_date: formData.get('attendance_date'),
    check_in_time: formData.get('check_in_time'),
    check_out_time: formData.get('check_out_time') || null,
    notes: formData.get('notes')
  };
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showSuccess('Manual attendance added successfully');
      document.getElementById('manualAttendanceModal').style.display = 'none';
      e.target.reset();
      loadAttendance();
      loadSummaryStats();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to add manual attendance');
    }
  } catch (error) {
    console.error('Error adding manual attendance:', error);
    showError('Failed to add manual attendance');
  } finally {
    hideLoading();
  }
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
