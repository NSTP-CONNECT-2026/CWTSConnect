// Student My Hours JavaScript

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserEmail();
  loadHoursSummary();
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

// Load hours summary
async function loadHoursSummary() {
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch('/api/rendered-hours/my-hours', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayHoursSummary(data);
      displayHoursBreakdown(data.attendance_records || []);
    } else {
      showError('Failed to load hours data');
    }
  } catch (error) {
    console.error('Error loading hours summary:', error);
    showError('Failed to load hours data');
  } finally {
    hideLoading();
  }
}

// Display hours summary
function displayHoursSummary(data) {
  const totalHours = data.total_hours || 0;
  const regularHours = data.regular_hours || 0;
  const makeupHours = data.makeup_hours || 0;
  const requiredHours = data.required_hours || 0;
  
  document.getElementById('totalHours').textContent = totalHours;
  document.getElementById('regularHours').textContent = regularHours;
  document.getElementById('makeupHours').textContent = makeupHours;
  document.getElementById('requiredHours').textContent = requiredHours;
  
  // Calculate progress
  const progress = requiredHours > 0 ? Math.round((totalHours / requiredHours) * 100) : 0;
  const cappedProgress = Math.min(progress, 100);
  
  document.getElementById('progressPercentage').textContent = `${progress}%`;
  document.getElementById('progressFill').style.width = `${cappedProgress}%`;
  document.getElementById('progressText').textContent = `${totalHours} of ${requiredHours} hours completed`;
  
  // Update status message
  const statusMessage = document.getElementById('statusMessage');
  if (progress >= 100) {
    statusMessage.innerHTML = '<p style="color: #10b981; font-weight: 600;">Congratulations! You have completed all required service hours.</p>';
  } else if (progress >= 75) {
    statusMessage.innerHTML = '<p style="color: #3b82f6;">You\'re almost there! Keep up the good work.</p>';
  } else if (progress >= 50) {
    statusMessage.innerHTML = '<p style="color: #f59e0b;">You\'re halfway through your required hours. Keep going!</p>';
  } else {
    statusMessage.innerHTML = '<p>Keep attending your deployment activities to accumulate service hours!</p>';
  }
}

// Display hours breakdown
function displayHoursBreakdown(records) {
  const tbody = document.getElementById('hoursTableBody');
  
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hours recorded yet.</td></tr>';
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

// Setup event listeners
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', loadHoursSummary);
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

function showError(message) {
  alert('Error: ' + message);
}
