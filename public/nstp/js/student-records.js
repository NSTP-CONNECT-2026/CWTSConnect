/**
 * Student Records Management - NSTP Official
 */

let allStudents = [];
let filteredStudents = [];

// DOM Elements
const studentsTableBody = document.getElementById('studentsTableBody');
const searchInput = document.getElementById('searchInput');
const complianceFilter = document.getElementById('complianceFilter');
const componentFilter = document.getElementById('componentFilter');
const municipalityFilter = document.getElementById('municipalityFilter');
const profileStatusFilter = document.getElementById('profileStatusFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const exportBtn = document.getElementById('exportBtn');
const studentDetailsModal = document.getElementById('studentDetailsModal');
const closeStudentModal = document.getElementById('closeStudentModal');
const closeStudentModalBtn = document.getElementById('closeStudentModalBtn');
const studentDetailsBody = document.getElementById('studentDetailsBody');

// Statistics elements
const totalStudentsEl = document.getElementById('totalStudents');
const compliantStudentsEl = document.getElementById('compliantStudents');
const pendingStudentsEl = document.getElementById('pendingStudents');
const incompleteStudentsEl = document.getElementById('incompleteStudents');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  loadStudents();
  setupEventListeners();
});

/**
 * Load user info
 */
async function loadUserInfo() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const data = await response.json();
      document.getElementById('userEmail').textContent = data.user.email;
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

/**
 * Load all students
 */
async function loadStudents() {
  try {
    showLoading();
    
    const response = await fetch('/api/nstp/students');
    
    if (!response.ok) {
      throw new Error('Failed to load students');
    }
    
    const data = await response.json();
    console.log('API Response:', data); // DEBUG
    console.log('Students array:', data.students); // DEBUG
    
    allStudents = data.students || [];
    filteredStudents = [...allStudents];
    
    console.log('Total students loaded:', allStudents.length); // DEBUG
    if (allStudents.length > 0) {
      console.log('Sample student:', allStudents[0]); // DEBUG
    }
    
    populateMunicipalityFilter();
    updateStatistics();
    renderStudentsTable();
    
  } catch (error) {
    console.error('Error loading students:', error);
    showError('Failed to load students. Please try again.');
  }
}

/**
 * Populate municipality filter with unique values
 */
function populateMunicipalityFilter() {
  const municipalities = [...new Set(
    allStudents
      .map(s => s.municipality)
      .filter(m => m && m.trim() !== '')
  )].sort();
  
  municipalityFilter.innerHTML = '<option value="all">All Municipalities</option>';
  municipalities.forEach(municipality => {
    const option = document.createElement('option');
    option.value = municipality;
    option.textContent = municipality;
    municipalityFilter.appendChild(option);
  });
}

/**
 * Update statistics cards
 */
function updateStatistics() {
  const total = allStudents.length;
  const compliant = allStudents.filter(s => s.cmo_compliance_status === 'compliant').length;
  const pending = allStudents.filter(s => s.cmo_compliance_status === 'pending_review').length;
  const incomplete = allStudents.filter(s => s.cmo_compliance_status === 'incomplete').length;
  
  totalStudentsEl.textContent = total;
  compliantStudentsEl.textContent = compliant;
  pendingStudentsEl.textContent = pending;
  incompleteStudentsEl.textContent = incomplete;
}

/**
 * Render students table
 */
function renderStudentsTable() {
  if (filteredStudents.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem;">
          No students found matching the filters.
        </td>
      </tr>
    `;
    return;
  }
  
  studentsTableBody.innerHTML = filteredStudents.map(student => `
    <tr>
      <td>${escapeHtml(student.student_number || 'N/A')}</td>
      <td>${escapeHtml(student.full_name || 'N/A')}</td>
      <td>${escapeHtml(student.course || 'N/A')}</td>
      <td>${escapeHtml(student.year_level || 'N/A')} - ${escapeHtml(student.section || 'N/A')}</td>
      <td>${escapeHtml(student.nstp_component || 'N/A')}</td>
      <td>${escapeHtml(student.municipality || 'N/A')}</td>
      <td>
        <span class="nstp-badge ${student.profile_status === 'complete' ? 'nstp-badge-active' : 'nstp-badge-incomplete'}">
          ${student.profile_status === 'complete' ? 'Complete' : 'Incomplete'}
        </span>
      </td>
      <td>
        <span class="nstp-badge ${getComplianceBadgeClass(student.cmo_compliance_status)}">
          ${formatComplianceStatus(student.cmo_compliance_status)}
        </span>
      </td>
      <td>
        <button class="nstp-btn nstp-btn-sm nstp-btn-primary" onclick="viewStudentDetails('${student.user_id}')">
          View Details
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * View student details
 */
async function viewStudentDetails(userId) {
  try {
    const response = await fetch(`/api/nstp/students/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load student details');
    }
    
    const data = await response.json();
    const student = data.student;

    let coordsDisplay = 'Not pinned';
    if (student.latitude && student.longitude) {
      coordsDisplay = `Lat: ${parseFloat(student.latitude).toFixed(6)}, Lng: ${parseFloat(student.longitude).toFixed(6)}`;
    } else if (student.location && typeof student.location === 'string' && student.location.includes(',')) {
      const parts = student.location.split(',');
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        coordsDisplay = `Lat: ${parseFloat(parts[0]).toFixed(6)}, Lng: ${parseFloat(parts[1]).toFixed(6)}`;
      }
    }
    
    // Render student details
    studentDetailsBody.innerHTML = `
      <div style="display: grid; gap: 1.5rem;">
        <!-- Personal Information -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Personal Information</h4>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Full Name:</span>
              <span class="detail-value">${escapeHtml(student.full_name || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Student Number:</span>
              <span class="detail-value">${escapeHtml(student.student_number || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${escapeHtml(student.email || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Contact Number:</span>
              <span class="detail-value">${escapeHtml(student.contact_number || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Birthdate:</span>
              <span class="detail-value">${student.birthdate ? formatDate(student.birthdate) : 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Sex:</span>
              <span class="detail-value">${escapeHtml(student.sex || 'N/A')}</span>
            </div>
          </div>
        </div>
        
        <!-- Academic Information -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Academic Information</h4>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Course:</span>
              <span class="detail-value">${escapeHtml(student.course || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Year Level:</span>
              <span class="detail-value">${escapeHtml(student.year_level || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Section:</span>
              <span class="detail-value">${escapeHtml(student.section || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">NSTP Component:</span>
              <span class="detail-value">${escapeHtml(student.nstp_component || 'N/A')}</span>
            </div>
          </div>
        </div>
        
        <!-- Location Information -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Location Information</h4>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Complete Address:</span>
              <span class="detail-value">${escapeHtml(student.complete_address || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Barangay:</span>
              <span class="detail-value">${escapeHtml(student.barangay || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Municipality:</span>
              <span class="detail-value">${escapeHtml(student.municipality || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Province:</span>
              <span class="detail-value">${escapeHtml(student.province || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Coordinates (GPS):</span>
              <span class="detail-value" style="font-family: monospace; color: #047857; font-weight: 600;">${escapeHtml(coordsDisplay)}</span>
            </div>
          </div>
        </div>
        
        <!-- Skills -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Skills</h4>
          <div class="skills-container">
            ${renderSkills(student.skills)}
          </div>
        </div>
        
        <!-- Status Information -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Status Information</h4>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Profile Status:</span>
              <span class="detail-value">
                <span class="nstp-badge ${student.profile_status === 'complete' ? 'nstp-badge-active' : 'nstp-badge-incomplete'}">
                  ${student.profile_status === 'complete' ? 'Complete' : 'Incomplete'}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">CMO Compliance:</span>
              <span class="detail-value">
                <span class="nstp-badge ${getComplianceBadgeClass(student.cmo_compliance_status)}">
                  ${formatComplianceStatus(student.cmo_compliance_status)}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Account Status:</span>
              <span class="detail-value">
                <span class="nstp-badge ${student.account_status === 'active' ? 'nstp-badge-active' : 'nstp-badge-incomplete'}">
                  ${escapeHtml(student.account_status || 'N/A')}
                </span>
              </span>
            </div>
          </div>
        </div>
        
        <!-- CMO Requirements -->
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">CMO Requirements</h4>
          ${renderCMORequirements(student.cmo_requirements)}
        </div>
        
        <!-- Emergency Contact -->
        ${student.emergency_contact_name ? `
        <div>
          <h4 style="margin-bottom: 0.75rem; color: var(--color-dark-grey);">Emergency Contact</h4>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${escapeHtml(student.emergency_contact_name)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Contact Number:</span>
              <span class="detail-value">${escapeHtml(student.emergency_contact_number || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Relationship:</span>
              <span class="detail-value">${escapeHtml(student.emergency_contact_relationship || 'N/A')}</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    studentDetailsModal.style.display = 'flex';
    
  } catch (error) {
    console.error('Error loading student details:', error);
    alert('Failed to load student details. Please try again.');
  }
}

/**
 * Render skills
 */
function renderSkills(skills) {
  if (!skills || skills.length === 0) {
    return '<p style="color: var(--color-muted);">No skills listed</p>';
  }
  
  const skillsArray = Array.isArray(skills) ? skills : 
                      typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : 
                      [];
  
  if (skillsArray.length === 0) {
    return '<p style="color: var(--color-muted);">No skills listed</p>';
  }
  
  return skillsArray.map(skill => 
    `<span class="nstp-badge nstp-badge-active" style="margin: 0.25rem;">${escapeHtml(skill)}</span>`
  ).join('');
}

/**
 * Render CMO Requirements
 */
function renderCMORequirements(requirements) {
  if (!requirements || requirements.length === 0) {
    return '<p style="color: var(--color-muted);">No requirements submitted yet</p>';
  }
  
  const requirementTypes = {
    'notarized_parent_waiver': 'Notarized Parent Waiver',
    'validated_student_id': 'Validated Student ID',
    'valid_parent_id': 'Valid Parent ID',
    'medical_certificate': 'Medical Certificate'
  };
  
  return `
    <div style="display: grid; gap: 1rem;">
      ${requirements.map(req => {
        const isImage = req.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(req.file_name);
        
        return `
          <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <strong>${requirementTypes[req.requirement_type] || req.requirement_type}</strong>
              <span class="nstp-badge ${getRequirementStatusBadge(req.status)}">
                ${formatRequirementStatus(req.status)}
              </span>
            </div>
            
            ${req.file_name ? `
              <div style="margin-bottom: 0.5rem;">
                <span style="color: var(--color-muted); font-size: 0.875rem;">File: ${escapeHtml(req.file_name)}</span>
              </div>
            ` : ''}
            
            ${req.file_url ? `
              <div style="margin-bottom: 0.5rem;">
                ${isImage ? `
                  <div style="margin-bottom: 0.5rem;">
                    <img 
                      src="${escapeHtml(req.file_url)}" 
                      alt="${escapeHtml(req.requirement_type)}"
                      style="max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid #e5e7eb; cursor: pointer;"
                      onclick="if (typeof openDocumentViewer === 'function') { openDocumentViewer('${escapeHtml(req.file_url)}', '${escapeHtml(getRequirementTypeName(req.requirement_type))}', '${escapeHtml(req.file_name || '')}', '${escapeHtml(req.status || '')}', '${escapeHtml(req.uploaded_at || '')}'); } else { window.open('${escapeHtml(req.file_url)}', '_blank'); }"
                    />
                  </div>
                ` : ''}
                <button type="button" 
                        class="nstp-btn nstp-btn-sm nstp-btn-outline" 
                        style="display: inline-block; cursor: pointer;"
                        onclick="if (typeof openDocumentViewer === 'function') { openDocumentViewer('${escapeHtml(req.file_url)}', '${escapeHtml(getRequirementTypeName(req.requirement_type))}', '${escapeHtml(req.file_name || '')}', '${escapeHtml(req.status || '')}', '${escapeHtml(req.uploaded_at || '')}'); } else { window.open('${escapeHtml(req.file_url)}', '_blank'); }">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  ${isImage ? 'View Full Image' : 'View Document'}
                </button>
              </div>
            ` : ''}
            
            ${req.uploaded_at ? `
              <div style="color: var(--color-muted); font-size: 0.875rem;">
                Uploaded: ${formatDate(req.uploaded_at)}
              </div>
            ` : ''}
            
            ${req.remarks ? `
              <div style="margin-top: 0.5rem; padding: 0.5rem; background: #f9fafb; border-radius: 4px;">
                <strong style="font-size: 0.875rem;">Remarks:</strong>
                <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem;">${escapeHtml(req.remarks)}</p>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Format requirement type name
 */
function getRequirementTypeName(type) {
  const requirementTypes = {
    'notarized_parent_waiver': 'Notarized Parent Waiver',
    'validated_student_id': 'Validated Student ID',
    'valid_parent_id': 'Valid Parent ID',
    'medical_certificate': 'Medical Certificate'
  };
  return requirementTypes[type] || type || 'Document';
}

/**
 * Get requirement status badge class
 */
function getRequirementStatusBadge(status) {
  switch (status) {
    case 'approved': return 'nstp-badge-active';
    case 'pending': return 'nstp-badge-pending';
    case 'rejected': return 'nstp-badge-rejected';
    default: return 'nstp-badge-incomplete';
  }
}

/**
 * Format requirement status
 */
function formatRequirementStatus(status) {
  switch (status) {
    case 'approved': return 'Approved';
    case 'pending': return 'Pending';
    case 'rejected': return 'Rejected';
    default: return status || 'Not Submitted';
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const complianceStatus = complianceFilter.value;
  const component = componentFilter.value;
  const municipality = municipalityFilter.value;
  const profileStatus = profileStatusFilter.value;
  
  filteredStudents = allStudents.filter(student => {
    // Search filter
    if (searchTerm) {
      const matchesSearch = 
        (student.full_name || '').toLowerCase().includes(searchTerm) ||
        (student.student_number || '').toLowerCase().includes(searchTerm) ||
        (student.email || '').toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    // Compliance status filter
    if (complianceStatus !== 'all' && student.cmo_compliance_status !== complianceStatus) {
      return false;
    }
    
    // Component filter
    if (component !== 'all' && student.nstp_component !== component) {
      return false;
    }
    
    // Municipality filter
    if (municipality !== 'all' && student.municipality !== municipality) {
      return false;
    }
    
    // Profile status filter
    if (profileStatus !== 'all' && student.profile_status !== profileStatus) {
      return false;
    }
    
    return true;
  });
  
  renderStudentsTable();
}

/**
 * Clear all filters
 */
function clearFilters() {
  searchInput.value = '';
  complianceFilter.value = 'all';
  componentFilter.value = 'all';
  municipalityFilter.value = 'all';
  profileStatusFilter.value = 'all';
  
  filteredStudents = [...allStudents];
  renderStudentsTable();
}

/**
 * Export to CSV
 */
function exportToCSV() {
  const headers = [
    'Student Number',
    'Full Name',
    'Email',
    'Course',
    'Year Level',
    'Section',
    'NSTP Component',
    'Municipality',
    'Province',
    'Skills',
    'Profile Status',
    'Compliance Status'
  ];
  
  const rows = filteredStudents.map(student => [
    student.student_number || '',
    student.full_name || '',
    student.email || '',
    student.course || '',
    student.year_level || '',
    student.section || '',
    student.nstp_component || '',
    student.municipality || '',
    student.province || '',
    Array.isArray(student.skills) ? student.skills.join('; ') : student.skills || '',
    student.profile_status || '',
    student.cmo_compliance_status || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student-records-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search and filters
  searchInput.addEventListener('input', applyFilters);
  complianceFilter.addEventListener('change', applyFilters);
  componentFilter.addEventListener('change', applyFilters);
  municipalityFilter.addEventListener('change', applyFilters);
  profileStatusFilter.addEventListener('change', applyFilters);
  clearFiltersBtn.addEventListener('click', clearFilters);
  
  // Export
  exportBtn.addEventListener('click', exportToCSV);
  
  // Modal
  closeStudentModal.addEventListener('click', () => {
    studentDetailsModal.style.display = 'none';
  });
  
  closeStudentModalBtn.addEventListener('click', () => {
    studentDetailsModal.style.display = 'none';
  });
  
  studentDetailsModal.addEventListener('click', (e) => {
    if (e.target === studentDetailsModal) {
      studentDetailsModal.style.display = 'none';
    }
  });
}

/**
 * Helper functions
 */
function getComplianceBadgeClass(status) {
  switch (status) {
    case 'compliant': return 'nstp-badge-active';
    case 'pending_review': return 'nstp-badge-pending';
    case 'incomplete': return 'nstp-badge-incomplete';
    case 'rejected': return 'nstp-badge-rejected';
    default: return 'nstp-badge-incomplete';
  }
}

function formatComplianceStatus(status) {
  switch (status) {
    case 'compliant': return 'Compliant';
    case 'pending_review': return 'Pending Review';
    case 'incomplete': return 'Incomplete';
    case 'rejected': return 'Rejected';
    default: return status || 'Unknown';
  }
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

function showLoading() {
  studentsTableBody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 2rem;">
        <div class="loading">Loading students...</div>
      </td>
    </tr>
  `;
}

function showError(message) {
  studentsTableBody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 2rem;">
        <div class="alert alert-danger">${escapeHtml(message)}</div>
      </td>
    </tr>
  `;
}
