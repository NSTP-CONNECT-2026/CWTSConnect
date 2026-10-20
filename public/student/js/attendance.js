// Student Attendance JavaScript
let currentAttendanceId = null;
let checkInInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserEmail();
  loadTodayStatus();
  loadSummaryStats();
  loadAttendanceHistory();
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

// Load today's status
async function loadTodayStatus() {
  try {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/attendance/my-attendance?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data.attendance || [];
      const todayRecord = records.find(r => r.attendance_date === today);
      
      if (todayRecord) {
        currentAttendanceId = todayRecord.attendance_id;
        
        if (todayRecord.check_out_time) {
          // Already checked out
          updateStatusDisplay('checked_out', todayRecord);
        } else {
          // Checked in, show check out button
          updateStatusDisplay('checked_in', todayRecord);
          startDurationTimer(todayRecord.check_in_time);
        }
      } else {
        // Not checked in yet
        updateStatusDisplay('not_checked_in');
      }
    }
  } catch (error) {
    console.error('Error loading today status:', error);
  }
}

// Update status display
function updateStatusDisplay(status, record = null) {
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');
  const todayInfo = document.getElementById('todayInfo');
  
  if (status === 'not_checked_in') {
    statusTitle.textContent = 'Not Checked In';
    statusMessage.textContent = 'Click the button below to check in for today\'s activity.';
    checkInBtn.style.display = 'inline-block';
    checkOutBtn.style.display = 'none';
    todayInfo.style.display = 'none';
    statusIcon.style.color = '#6b7280';
  } else if (status === 'checked_in') {
    statusTitle.textContent = 'Checked In';
    statusMessage.textContent = 'You are currently checked in. Don\'t forget to check out when you finish.';
    checkInBtn.style.display = 'none';
    checkOutBtn.style.display = 'inline-block';
    todayInfo.style.display = 'block';
    statusIcon.style.color = '#10b981';
    
    if (record) {
      document.getElementById('checkInTime').textContent = formatTime(record.check_in_time);
    }
  } else if (status === 'checked_out') {
    statusTitle.textContent = 'Checked Out';
    statusMessage.textContent = `You completed ${record.hours_rendered || 0} hours today. Great work!`;
    checkInBtn.style.display = 'none';
    checkOutBtn.style.display = 'none';
    todayInfo.style.display = 'block';
    statusIcon.style.color = '#3b82f6';
    
    if (record) {
      document.getElementById('checkInTime').textContent = formatTime(record.check_in_time);
      document.getElementById('duration').textContent = `${record.hours_rendered || 0}h`;
    }
    
    if (checkInInterval) {
      clearInterval(checkInInterval);
    }
  }
}

// Start duration timer
function startDurationTimer(checkInTime) {
  if (checkInInterval) {
    clearInterval(checkInInterval);
  }
  
  checkInInterval = setInterval(() => {
    const checkIn = new Date(`1970-01-01T${checkInTime}`);
    const now = new Date();
    const diff = now - checkIn;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('duration').textContent = `${hours}h ${minutes}m`;
  }, 1000);
}

// Load summary statistics
async function loadSummaryStats() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/attendance/my-attendance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data.attendance || [];
      
      document.getElementById('totalAttendance').textContent = records.length;
      document.getElementById('pendingCount').textContent = 
        records.filter(r => r.verification_status === 'pending').length;
      document.getElementById('verifiedCount').textContent = 
        records.filter(r => r.verification_status === 'verified').length;
      
      const verifiedCount = records.filter(r => r.verification_status === 'verified').length;
      const rate = records.length > 0 ? Math.round((verifiedCount / records.length) * 100) : 0;
      document.getElementById('attendanceRate').textContent = `${rate}%`;
    }
  } catch (error) {
    console.error('Error loading summary stats:', error);
  }
}

// Load attendance history
async function loadAttendanceHistory() {
  try {
    const token = localStorage.getItem('token');
    const statusFilter = document.getElementById('statusFilter').value;
    
    let url = '/api/attendance/my-attendance';
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayAttendanceHistory(data.attendance || []);
    } else {
      showError('Failed to load attendance history');
    }
  } catch (error) {
    console.error('Error loading attendance history:', error);
    showError('Failed to load attendance history');
  }
}

// Display attendance history
function displayAttendanceHistory(records) {
  const tbody = document.getElementById('attendanceTableBody');
  
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance records found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${formatDate(record.attendance_date)}</td>
      <td>${formatTime(record.check_in_time)}</td>
      <td>${record.check_out_time ? formatTime(record.check_out_time) : 'Not checked out'}</td>
      <td>${record.hours_rendered || '0.0'} hrs</td>
      <td><span class="badge badge-${record.verification_status}">${record.verification_status}</span></td>
      <td>${record.verified_by_name || 'N/A'}</td>
    </tr>
  `).join('');
}

// Check in
async function handleCheckIn() {
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      showSuccess('Checked in successfully!');
      loadTodayStatus();
      loadSummaryStats();
      loadAttendanceHistory();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to check in');
    }
  } catch (error) {
    console.error('Error checking in:', error);
    showError('Failed to check in');
  } finally {
    hideLoading();
  }
}

// Check out
async function handleCheckOut() {
  if (!confirm('Are you sure you want to check out?')) return;
  
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      showSuccess('Checked out successfully!');
      loadTodayStatus();
      loadSummaryStats();
      loadAttendanceHistory();
    } else {
      const error = await response.json();
      showError(error.message || 'Failed to check out');
    }
  } catch (error) {
    console.error('Error checking out:', error);
    showError('Failed to check out');
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
  
  // Check in/out buttons
  document.getElementById('checkInBtn').addEventListener('click', handleCheckIn);
  document.getElementById('checkOutBtn').addEventListener('click', handleCheckOut);
  
  // Status filter
  document.getElementById('statusFilter').addEventListener('change', loadAttendanceHistory);
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadTodayStatus();
    loadSummaryStats();
    loadAttendanceHistory();
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeString) {
  if (!timeString || timeString === '---' || String(timeString).toUpperCase() === 'N/A' || String(timeString).toUpperCase() === 'N\\A') {
    return '---';
  }
  const trimmed = String(timeString).trim();
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ap}`;
    }
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = String(parseInt(match[2], 10)).padStart(2, '0');
  const modifier = match[4] ? match[4].toUpperCase() : null;
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
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
