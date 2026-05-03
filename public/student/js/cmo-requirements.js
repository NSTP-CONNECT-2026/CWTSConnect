// CMO Requirements Management
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const profileIncompleteWarning = document.getElementById('profileIncompleteWarning');
  const statusSummary = document.getElementById('statusSummary');
  const requirementsContainer = document.getElementById('requirementsContainer');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const messageContainer = document.getElementById('messageContainer');
  const messageContent = document.getElementById('messageContent');
  const messageText = document.getElementById('messageText');
  const messageClose = document.getElementById('messageClose');
  const backToDashboardBtn = document.getElementById('backToDashboardBtn');

  // Status elements
  const totalRequired = document.getElementById('totalRequired');
  const submittedCount = document.getElementById('submittedCount');
  const approvedCount = document.getElementById('approvedCount');
  const rejectedCount = document.getElementById('rejectedCount');
  const overallStatus = document.getElementById('overallStatus');

  // State
  let requirements = [];
  let statusData = {};

  // Initialize
  init();

  async function init() {
    try {
      showLoading(true);
      await loadRequirements();
      await loadStatus();
      setupEventListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      showMessage('Failed to load CMO requirements', 'error');
    } finally {
      showLoading(false);
    }
  }

  async function loadRequirements() {
    try {
      const response = await fetch('/api/student/cmo-requirements', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403 && result.message.includes('complete your profile')) {
          showProfileIncompleteWarning();
          return;
        }
        throw new Error(result.message || 'Failed to load requirements');
      }

      requirements = result.data.requirements;
      renderRequirements();
      showRequirementsSection();
    } catch (error) {
      console.error('Load requirements error:', error);
      throw error;
    }
  }

  async function loadStatus() {
    try {
      const response = await fetch('/api/student/cmo-requirements/status', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load status');
      }

      statusData = result.data;
      updateStatusSummary();
    } catch (error) {
      console.error('Load status error:', error);
      // Don't throw here, status is not critical for basic functionality
    }
  }

  function renderRequirements() {
    requirementsContainer.innerHTML = '';

    requirements.forEach(requirement => {
      const card = createRequirementCard(requirement);
      requirementsContainer.appendChild(card);
    });
  }

  function createRequirementCard(requirement) {
    const section = document.createElement('section');
    section.className = 'brutal-section';
    section.setAttribute('data-requirement-type', requirement.type);

    const statusBadgeClass = getStatusBadgeClass(requirement.status);
    const canUpload = requirement.status !== 'approved';
    const hasFile = requirement.file_name && requirement.status !== 'not_submitted';

    section.innerHTML = `
      <div class="brutal-section-header">
        <h3 class="brutal-section-title">${requirement.displayName}</h3>
        <span class="brutal-status-badge ${statusBadgeClass}">${getStatusDisplayName(requirement.status)}</span>
      </div>
      <div class="brutal-section-content">
        <p style="margin-bottom: 16px; color: var(--text-secondary);">${requirement.description}</p>
        
        ${hasFile ? `
          <div class="file-info" style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style="font-weight: 500;">${requirement.file_name}</span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-muted);">
              Uploaded: ${formatDate(requirement.uploaded_at)}
              ${requirement.file_size ? ` • ${formatFileSize(requirement.file_size)}` : ''}
            </div>
            ${requirement.remarks ? `
              <div style="margin-top: 8px; padding: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: #dc2626; font-size: 0.875rem;">
                <strong>Remarks:</strong> ${requirement.remarks}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="upload-section">
          <div class="brutal-form-group">
            <input type="file" 
                   id="file-${requirement.type}" 
                   class="file-input" 
                   accept=".pdf,.jpg,.jpeg,.png"
                   style="display: none;"
                   ${!canUpload ? 'disabled' : ''}>
            <label for="file-${requirement.type}" 
                   class="file-label ${!canUpload ? 'disabled' : ''}"
                   style="display: inline-block; padding: 8px 16px; border: 1px solid var(--border-primary); border-radius: var(--radius-md); cursor: ${canUpload ? 'pointer' : 'not-allowed'}; background: ${canUpload ? 'var(--bg-primary)' : 'var(--bg-secondary)'}; color: ${canUpload ? 'var(--text-primary)' : 'var(--text-muted)'};">
              Choose File
            </label>
            <span class="file-name" style="margin-left: 12px; color: var(--text-secondary); font-size: 0.875rem;">
              ${hasFile ? 'Choose new file to replace' : 'No file selected'}
            </span>
          </div>
          
          <button type="button" 
                  class="upload-btn brutal-btn brutal-btn-primary" 
                  data-requirement-type="${requirement.type}"
                  style="margin-top: 12px; ${!canUpload ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                  ${!canUpload ? 'disabled' : ''}>
            <span class="btn-text">${hasFile ? 'Replace File' : 'Upload File'}</span>
            <span class="spinner" style="display: none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-left: 8px;"></span>
          </button>
          
          ${!canUpload ? `
            <p style="margin-top: 8px; font-size: 0.875rem; color: var(--text-muted);">
              This requirement is approved and cannot be replaced.
            </p>
          ` : ''}
        </div>
      </div>
    `;

    return section;
  }

  function setupEventListeners() {
    // File input change handlers
    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('file-input')) {
        handleFileSelection(e.target);
      }
    });

    // Upload button handlers
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('upload-btn') || e.target.closest('.upload-btn')) {
        const btn = e.target.classList.contains('upload-btn') ? e.target : e.target.closest('.upload-btn');
        handleUpload(btn);
      }
    });

    // Back to dashboard
    backToDashboardBtn.addEventListener('click', function() {
      window.location.href = 'dashboard.html';
    });

    // Message close
    messageClose.addEventListener('click', function() {
      hideMessage();
    });
  }

  function handleFileSelection(input) {
    const file = input.files[0];
    const fileNameSpan = input.parentElement.querySelector('.file-name');
    
    if (file) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        showMessage(validation.error, 'error');
        input.value = '';
        fileNameSpan.textContent = 'No file selected';
        return;
      }
      
      fileNameSpan.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    } else {
      fileNameSpan.textContent = 'No file selected';
    }
  }

  async function handleUpload(button) {
    const requirementType = button.getAttribute('data-requirement-type');
    const fileInput = document.getElementById(`file-${requirementType}`);
    const file = fileInput.files[0];

    if (!file) {
      showMessage('Please select a file to upload', 'error');
      return;
    }

    // Validate file again
    const validation = validateFile(file);
    if (!validation.isValid) {
      showMessage(validation.error, 'error');
      return;
    }

    try {
      setUploadLoading(button, true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('requirement_type', requirementType);

      const response = await fetch('/api/student/cmo-requirements/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      showMessage(result.message || 'File uploaded successfully', 'success');
      
      // Reload requirements and status
      await loadRequirements();
      await loadStatus();

    } catch (error) {
      console.error('Upload error:', error);
      showMessage(error.message || 'Upload failed', 'error');
    } finally {
      setUploadLoading(button, false);
    }
  }

  function validateFile(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    return { isValid: true };
  }

  function updateStatusSummary() {
    if (!statusData) return;

    totalRequired.textContent = statusData.total_required || 4;
    submittedCount.textContent = statusData.submitted_count || 0;
    approvedCount.textContent = statusData.approved_count || 0;
    rejectedCount.textContent = statusData.rejected_count || 0;

    // Update overall status
    const status = statusData.overall_status || 'incomplete';
    overallStatus.textContent = getOverallStatusDisplayName(status);
    overallStatus.className = `brutal-status-badge ${status}`;
  }

  function showProfileIncompleteWarning() {
    profileIncompleteWarning.style.display = 'flex';
    statusSummary.style.display = 'none';
    requirementsContainer.style.display = 'none';
  }

  function showRequirementsSection() {
    profileIncompleteWarning.style.display = 'none';
    statusSummary.style.display = 'flex';
    requirementsContainer.style.display = 'flex';
  }

  function setUploadLoading(button, loading) {
    const spinner = button.querySelector('.spinner');
    const text = button.querySelector('.btn-text');
    
    if (loading) {
      button.disabled = true;
      spinner.style.display = 'inline-block';
      text.textContent = 'Uploading...';
    } else {
      button.disabled = false;
      spinner.style.display = 'none';
      text.textContent = button.getAttribute('data-requirement-type').includes('file') ? 'Replace File' : 'Upload File';
    }
  }

  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  function showMessage(message, type = 'success') {
    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideMessage();
    }, 5000);
  }

  function hideMessage() {
    messageContainer.style.display = 'none';
  }

  // Utility functions
  function getStatusBadgeClass(status) {
    const statusClasses = {
      'not_submitted': 'incomplete',
      'pending': 'incomplete',
      'approved': 'complete',
      'rejected': 'incomplete'
    };
    return statusClasses[status] || 'incomplete';
  }

  function getStatusDisplayName(status) {
    const statusNames = {
      'not_submitted': 'Not Submitted',
      'pending': 'Pending Review',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusNames[status] || 'Unknown';
  }

  function getOverallStatusDisplayName(status) {
    const statusNames = {
      'incomplete': 'Incomplete',
      'pending_review': 'Pending Review',
      'compliant': 'Compliant',
      'rejected': 'Rejected'
    };
    return statusNames[status] || 'Unknown';
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
});