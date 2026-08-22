/**
 * NSTPConnect - Student Match Profile JavaScript
 * Handles student profile quick view functionality
 */

// DOM elements
const studentProfileCard = document.getElementById('studentProfileCard');
const actionButtons = document.getElementById('actionButtons');
const selectForDeploymentBtn = document.getElementById('selectForDeploymentBtn');

// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);
document.getElementById('logoutBtn').addEventListener('click', logout);
selectForDeploymentBtn.addEventListener('click', selectForDeployment);

// Initialize page
async function initializePage() {
  try {
    await loadUserInfo();
    await loadStudentProfile();
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

// Load student profile
async function loadStudentProfile() {
  try {
    // Get student ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');

    if (!studentId) {
      throw new Error('Student ID not provided');
    }

    const response = await fetch(`/api/nstp/dss/student/${studentId}`);
    if (!response.ok) {
      throw new Error('Failed to load student profile');
    }

    const data = await response.json();
    if (data.success) {
      renderStudentProfile(data.data);
      actionButtons.style.display = 'flex';
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Load student profile error:', error);
    studentProfileCard.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Profile</h3>
        <p>${error.message}</p>
        <button type="button" class="btn btn-secondary" onclick="window.history.back()">
          Go Back
        </button>
      </div>
    `;
  }
}

// Render student profile
function renderStudentProfile(student) {
  studentProfileCard.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="profile-info">
        <h2>${escapeHtml(student.full_name)}</h2>
        <p class="profile-subtitle">${escapeHtml(student.student_number)} • ${escapeHtml(student.course)}</p>
        <div class="profile-badges">
          <span class="status-badge status-${student.profile_status}">
            Profile: ${escapeHtml(student.profile_status)}
          </span>
          <span class="status-badge status-${student.cmo_compliance_status}">
            CMO: ${escapeHtml(student.cmo_compliance_status)}
          </span>
        </div>
      </div>
    </div>

    <div class="profile-content">
      <div class="profile-section">
        <h3>Personal Information</h3>
        <div class="profile-grid">
          <div class="profile-item">
            <label>Full Name</label>
            <span>${escapeHtml(student.full_name)}</span>
          </div>
          <div class="profile-item">
            <label>Student Number</label>
            <span>${escapeHtml(student.student_number)}</span>
          </div>
          <div class="profile-item">
            <label>Email Address</label>
            <span>${escapeHtml(student.email)}</span>
          </div>
          <div class="profile-item">
            <label>Contact Number</label>
            <span>${escapeHtml(student.contact_number || 'Not provided')}</span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h3>Academic Information</h3>
        <div class="profile-grid">
          <div class="profile-item">
            <label>Course</label>
            <span>${escapeHtml(student.course)}</span>
          </div>
          <div class="profile-item">
            <label>Year Level</label>
            <span>${escapeHtml(student.year_level)}</span>
          </div>
          <div class="profile-item">
            <label>Section</label>
            <span>${escapeHtml(student.section || 'Not provided')}</span>
          </div>
          <div class="profile-item">
            <label>NSTP Component</label>
            <span class="component-badge component-${student.nstp_component.toLowerCase()}">
              ${escapeHtml(student.nstp_component)}
            </span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h3>Location Information</h3>
        <div class="profile-grid">
          <div class="profile-item full-width">
            <label>Complete Address</label>
            <span>${escapeHtml(student.complete_address || 'Not provided')}</span>
          </div>
          <div class="profile-item">
            <label>Barangay</label>
            <span>${escapeHtml(student.barangay)}</span>
          </div>
          <div class="profile-item">
            <label>Municipality</label>
            <span>${escapeHtml(student.municipality)}</span>
          </div>
          <div class="profile-item">
            <label>Province</label>
            <span>${escapeHtml(student.province)}</span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h3>Skills & Competencies</h3>
        <div class="skills-container">
          ${(student.skills && student.skills.length > 0) ? 
            student.skills.map(skill => 
              `<span class="skill-tag">${escapeHtml(skill)}</span>`
            ).join('') :
            '<p class="text-muted">No skills listed</p>'
          }
        </div>
      </div>

      <div class="profile-section">
        <h3>Compliance Status</h3>
        <div class="compliance-grid">
          <div class="compliance-item">
            <label>Profile Completion</label>
            <span class="status-badge status-${student.profile_status}">
              ${escapeHtml(student.profile_status)}
            </span>
          </div>
          <div class="compliance-item">
            <label>CMO Requirements</label>
            <span class="status-badge status-${student.cmo_compliance_status}">
              ${escapeHtml(student.cmo_compliance_status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Select student for deployment (placeholder)
function selectForDeployment() {
  alert('Deployment assignment feature is coming soon!');
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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