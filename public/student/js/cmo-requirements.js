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
    const hasFile = Boolean(requirement.file_name && requirement.status !== 'not_submitted');
    const submissionDateText = hasFile ? formatDate(requirement.uploaded_at) : 'Not yet submitted';
    const isImage = Boolean(
      (requirement.file_type && requirement.file_type.startsWith('image/')) ||
      /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(requirement.file_name || requirement.file_url || '')
    );

    let pasilipHtml = '';

    if (hasFile && requirement.file_url) {
      if (isImage) {
        // Visual Pasilip Picture Sneak Peek
        pasilipHtml = `
          <div class="pasilip-container">
            <div class="pasilip-img-card btn-view-doc" 
                 role="button"
                 tabindex="0"
                 data-file-url="${escapeHtml(requirement.file_url)}"
                 data-title="${escapeHtml(requirement.displayName || requirement.title)}"
                 data-file-name="${escapeHtml(requirement.file_name || '')}"
                 data-status="${escapeHtml(requirement.status || '')}"
                 data-date="${escapeHtml(requirement.uploaded_at || '')}"
                 title="Click to view image">
              <div class="pasilip-img-wrapper">
                <img src="${escapeHtml(requirement.file_url)}" 
                     alt="${escapeHtml(requirement.displayName || 'Preview')}" 
                     class="pasilip-img" 
                     loading="lazy" 
                     onerror="this.parentElement.classList.add('img-error'); this.style.display='none';" />
                <div class="pasilip-img-fallback">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Preview Image</span>
                </div>
              </div>
              <div class="pasilip-info-footer">
                <div class="pasilip-filename">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span class="text-truncate">${escapeHtml(requirement.file_name)}</span>
                </div>
                <div class="pasilip-meta">
                  ${submissionDateText}${requirement.file_size ? ` • ${formatFileSize(requirement.file_size)}` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // PDF / Document Pasilip
        pasilipHtml = `
          <div class="pasilip-container">
            <div class="pasilip-doc-card btn-view-doc"
                 role="button"
                 tabindex="0"
                 data-file-url="${escapeHtml(requirement.file_url)}"
                 data-title="${escapeHtml(requirement.displayName || requirement.title)}"
                 data-file-name="${escapeHtml(requirement.file_name || '')}"
                 data-status="${escapeHtml(requirement.status || '')}"
                 data-date="${escapeHtml(requirement.uploaded_at || '')}"
                 title="Click to view document">
              <div class="pasilip-doc-icon-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <span class="pasilip-doc-type">PDF</span>
              </div>
              <div class="pasilip-doc-details">
                <span class="pasilip-filename text-truncate">${escapeHtml(requirement.file_name)}</span>
                <span class="pasilip-meta">
                  ${submissionDateText}${requirement.file_size ? ` • ${formatFileSize(requirement.file_size)}` : ''}
                </span>
              </div>
              <button type="button" class="pasilip-doc-view-btn" tabindex="-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span>View</span>
              </button>
            </div>
          </div>
        `;
      }
    } else {
      // Empty placeholder when no file is submitted yet
      pasilipHtml = `
        <div class="pasilip-empty-card">
          <div class="pasilip-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
          </div>
          <div class="pasilip-empty-title">Walang file na na-upload</div>
          <div class="pasilip-empty-sub">Pumili ng PDF, JPG, o PNG (Hanggang 5MB)</div>
        </div>
      `;
    }

    // Feedback remarks if coordinator rejected or requested revision
    const remarksHtml = requirement.remarks ? `
      <div class="file-remarks-alert">
        <strong>Coordinator Feedback:</strong> ${escapeHtml(requirement.remarks)}
      </div>
    ` : '';

    // Upload / Replace Controls (Only when status is NOT approved)
    const uploadControlsHtml = canUpload ? `
      <div class="upload-controls ${hasFile ? 'has-existing' : ''}">
        <input type="file" 
               id="file-${requirement.type}" 
               class="file-input" 
               accept=".pdf,.jpg,.jpeg,.png"
               style="display: none;">
        <label for="file-${requirement.type}" class="file-choose-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          <span>${hasFile ? 'Palitan ang File' : 'Pumili ng File'}</span>
        </label>
        <span class="file-name file-selected-text">
          ${hasFile ? 'Pumili ng bago kung nais palitan' : 'Walang napiling file'}
        </span>
        <button type="button" 
                class="upload-btn btn btn-primary btn-sm" 
                data-requirement-type="${requirement.type}">
          <span class="spinner" aria-hidden="true"></span>
          <span class="btn-text">${hasFile ? 'I-upload ang Kapalit' : 'I-upload ang Dokumento'}</span>
        </button>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="requirement-card-header">
        <div class="requirement-title-wrap">
          <div class="requirement-doc-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 class="requirement-title">${escapeHtml(requirement.displayName || requirement.title)}</h3>
        </div>
        <span class="badge ${statusBadgeClass}">${getStatusDisplayName(requirement.status)}</span>
      </div>

      <div class="requirement-card-body">
        ${pasilipHtml}
        ${remarksHtml}
        ${uploadControlsHtml}
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

    // Document/Image View in Modal handlers (supports pasilip cards & buttons)
    document.addEventListener('click', function(e) {
      const viewBtn = e.target.closest('.btn-view-doc, .btn-thumb-preview, .pasilip-img-card, .pasilip-doc-card, .pasilip-doc-view-btn');
      if (viewBtn) {
        e.preventDefault();
        const trigger = viewBtn.hasAttribute('data-file-url') ? viewBtn : viewBtn.closest('[data-file-url]');
        if (!trigger) return;

        const fileUrl = trigger.getAttribute('data-file-url');
        const title = trigger.getAttribute('data-title') || 'Document Preview';
        const fileName = trigger.getAttribute('data-file-name') || '';
        const status = trigger.getAttribute('data-status') || '';
        const date = trigger.getAttribute('data-date') || '';

        if (fileUrl) {
          if (typeof window.openDocumentViewer === 'function') {
            window.openDocumentViewer({ url: fileUrl, title, fileName, status, date });
          } else {
            window.open(fileUrl, '_blank');
          }
        }
      }
    });

    // Keyboard support for pasilip cards (Enter or Space)
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target;
        if (target && (target.classList.contains('pasilip-img-card') || target.classList.contains('pasilip-doc-card'))) {
          e.preventDefault();
          target.click();
        }
      }
    });

    // Upload button handlers
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('upload-btn') || e.target.closest('.upload-btn')) {
        const btn = e.target.classList.contains('upload-btn') ? e.target : e.target.closest('.upload-btn');
        handleUpload(btn);
      }
    });

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
    if (window.showStudentToast) {
      window.showStudentToast(message, type);
      return;
    }
    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    setTimeout(() => {
      hideMessage();
    }, 3800);
  }

  function hideMessage() {
    if (window.hideStudentToast) {
      window.hideStudentToast();
      return;
    }
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