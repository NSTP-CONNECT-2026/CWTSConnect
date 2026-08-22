// cmo-requirements.js — CWTSConnect Student CMO Requirements Management

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const cmoSkeleton = document.getElementById('cmoSkeleton');
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
      await loadUserInfo();
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

  async function loadUserInfo() {
    try {
      const response = await fetch('/api/student/me', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.email) {
          const email = data.user.email;
          const emailPrefix = email.split('@')[0];
          const topbarEmail = document.getElementById('topbarEmail');
          const sidebarUserName = document.getElementById('sidebarUserName');
          const sidebarAvatar = document.getElementById('sidebarAvatar');

          if (topbarEmail) topbarEmail.textContent = email;
          if (sidebarUserName) sidebarUserName.textContent = emailPrefix;
          if (sidebarAvatar) sidebarAvatar.textContent = emailPrefix.substring(0, 2).toUpperCase();
        }
      }
    } catch (err) {
      console.warn('Could not load user details:', err);
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
        if (response.status === 403 && result.message && result.message.includes('complete your profile')) {
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
    const card = document.createElement('div');
    card.className = 'requirement-card';
    card.setAttribute('data-requirement-type', requirement.type);

    const statusBadgeClass = getStatusBadgeClass(requirement.status);
    const canUpload = requirement.status !== 'approved';
    const hasFile = requirement.file_name && requirement.status !== 'not_submitted';
    const submissionDateText = hasFile ? formatDate(requirement.uploaded_at) : 'Not yet submitted';

    card.innerHTML = `
      <!-- 1. Required Document Header & 2. Current Submission State -->
      <div class="requirement-card-header">
        <div class="requirement-title-wrap">
          <div class="requirement-doc-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 class="requirement-title">${escapeHtml(requirement.displayName)}</h3>
        </div>
        <span class="badge ${statusBadgeClass}">${getStatusDisplayName(requirement.status)}</span>
      </div>

      <div class="requirement-card-body">
        <p class="requirement-desc">${escapeHtml(requirement.description)}</p>

        <!-- 2. Current Submission State & 3. Submission Date Overview -->
        <div class="requirement-meta-row">
          <div class="meta-item">
            <span class="meta-label">Current Submission State</span>
            <span class="meta-value">
              <span class="badge ${statusBadgeClass}">${getStatusDisplayName(requirement.status)}</span>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Submission Date</span>
            <span class="meta-value">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${submissionDateText}
            </span>
          </div>
        </div>
        
        ${hasFile ? `
          <div class="file-meta-box">
            <div class="file-meta-row">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>${escapeHtml(requirement.file_name)}</span>
            </div>
            <div class="file-meta-details">
              Submitted on ${formatDate(requirement.uploaded_at)}
              ${requirement.file_size ? ` • ${formatFileSize(requirement.file_size)}` : ''}
            </div>
            ${requirement.remarks ? `
              <div class="file-remarks-alert">
                <strong>Coordinator Feedback:</strong> ${escapeHtml(requirement.remarks)}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 4. Upload / Submission Controls -->
        ${canUpload ? `
          <div class="upload-controls">
            <input type="file" 
                   id="file-${requirement.type}" 
                   class="file-input" 
                   accept=".pdf,.jpg,.jpeg,.png"
                   style="display: none;">
            <label for="file-${requirement.type}" class="file-choose-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span>Choose Document</span>
            </label>
            <span class="file-name file-selected-text">
              ${hasFile ? 'Select a new file to replace existing document' : 'No file selected (PDF, JPG, PNG up to 5MB)'}
            </span>
            <button type="button" 
                    class="upload-btn btn btn-primary btn-sm" 
                    data-requirement-type="${requirement.type}">
              <span class="spinner" aria-hidden="true"></span>
              <span class="btn-text">${hasFile ? 'Replace Document' : 'Upload Document'}</span>
            </button>
          </div>
        ` : `
          <div class="approved-state-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Document Approved & Validated</span>
          </div>
        `}
      </div>
    `;

    return card;
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
    if (backToDashboardBtn) {
      backToDashboardBtn.addEventListener('click', function() {
        window.location.href = 'dashboard.html';
      });
    }

    // Message close
    if (messageClose) {
      messageClose.addEventListener('click', function() {
        hideMessage();
      });
    }
  }

  function handleFileSelection(input) {
    const file = input.files[0];
    const parent = input.closest('.upload-controls');
    const fileNameSpan = parent ? parent.querySelector('.file-name') : null;
    
    if (file) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        showMessage(validation.error, 'error');
        input.value = '';
        if (fileNameSpan) fileNameSpan.textContent = 'No file selected';
        return;
      }
      
      if (fileNameSpan) {
        fileNameSpan.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
      }
    } else {
      if (fileNameSpan) fileNameSpan.textContent = 'No file selected';
    }
  }

  async function handleUpload(button) {
    const requirementType = button.getAttribute('data-requirement-type');
    const fileInput = document.getElementById(`file-${requirementType}`);
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
      showMessage('Please select a file to upload first.', 'error');
      return;
    }

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

      showMessage(result.message || 'Document uploaded successfully!', 'success');
      
      // Reload requirements and status
      await loadRequirements();
      await loadStatus();

    } catch (error) {
      console.error('Upload error:', error);
      showMessage(error.message || 'Upload failed. Please try again.', 'error');
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
        error: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are accepted.'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size allowed is 5MB.'
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
    overallStatus.className = `badge ${getStatusBadgeClass(status)}`;
  }

  function showProfileIncompleteWarning() {
    profileIncompleteWarning.classList.remove('hidden');
    statusSummary.classList.add('hidden');
    requirementsContainer.classList.add('hidden');
  }

  function showRequirementsSection() {
    profileIncompleteWarning.classList.add('hidden');
    statusSummary.classList.remove('hidden');
    requirementsContainer.classList.remove('hidden');
  }

  function setUploadLoading(button, loading) {
    const text = button.querySelector('.btn-text');
    
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      if (text) text.textContent = 'Uploading...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      if (text) text.textContent = 'Upload Document';
    }
  }

  function showLoading(show) {
    if (cmoSkeleton) {
      cmoSkeleton.style.display = show ? 'block' : 'none';
    }
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none'; // Replaced by skeleton loader
    }
  }

  function showMessage(message, type = 'success') {
    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    setTimeout(() => {
      hideMessage();
    }, 5000);
  }

  function hideMessage() {
    messageContainer.style.display = 'none';
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      'not_submitted': 'badge-incomplete',
      'incomplete': 'badge-incomplete',
      'pending': 'badge-pending',
      'pending_review': 'badge-pending',
      'approved': 'badge-approved',
      'compliant': 'badge-approved',
      'rejected': 'badge-rejected'
    };
    return statusClasses[status] || 'badge-incomplete';
  }

  function getStatusDisplayName(status) {
    const statusNames = {
      'not_submitted': 'Not Submitted',
      'pending': 'Pending Review',
      'pending_review': 'Pending Review',
      'approved': 'Approved',
      'compliant': 'Compliant',
      'rejected': 'Needs Action'
    };
    return statusNames[status] || 'Not Submitted';
  }

  function getOverallStatusDisplayName(status) {
    const statusNames = {
      'incomplete': 'Incomplete',
      'pending_review': 'Under Review',
      'compliant': 'Compliant & Approved',
      'rejected': 'Action Required'
    };
    return statusNames[status] || 'Incomplete';
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});