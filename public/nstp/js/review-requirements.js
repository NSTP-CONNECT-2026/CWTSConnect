/**
 * CWTSConnect — Review Student CMO Requirements Controller
 * Manages:
 *  - Fetching individual student requirements
 *  - Rendering 4 CMO Document cards (Medical, Consent, Waiver, ID)
 *  - Submitting Document Approvals & Rejections with remarks
 *  - Section 12 Skeleton Loading
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Get student ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('studentId') || urlParams.get('id');

  // DOM Elements
  const reviewSkeleton = document.getElementById('reviewSkeleton');
  const reviewContent = document.getElementById('reviewContent');
  const studentAvatar = document.getElementById('studentAvatar');
  const studentName = document.getElementById('studentName');
  const studentNumber = document.getElementById('studentNumber');
  const studentCourseYear = document.getElementById('studentCourseYear');
  const studentEmail = document.getElementById('studentEmail');
  const overallStatusBadge = document.getElementById('overallStatusBadge');
  const approvedDocsCount = document.getElementById('approvedDocsCount');
  const requirementsGrid = document.getElementById('requirementsGrid');

  // Toast message elements
  const messageContainer = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  const messageContent = document.getElementById('messageContent');
  const messageClose = document.getElementById('messageClose');

  if (messageClose) {
    messageClose.addEventListener('click', () => {
      messageContainer.style.display = 'none';
    });
  }

  // Standard 4 CMO Types
  const REQUIRED_TYPES = [
    { key: 'medical_clearance', name: 'Medical Clearance', desc: 'Physician physical fitness assessment per CMO guidelines' },
    { key: 'parent_consent', name: 'Parent / Guardian Consent', desc: 'Signed consent form for NSTP CWTS community deployment' },
    { key: 'waiver', name: 'Waiver of Liability', desc: 'Assumption of risk and institutional field activity waiver' },
    { key: 'valid_id', name: 'Valid Government / School ID', desc: 'Official student ID or government identification copy' }
  ];

  if (!studentId) {
    alert('No Student ID provided. Redirecting to Requirement Compliance list...');
    window.location.href = 'requirement-compliance.html';
    return;
  }

  // Initialize Page
  loadStudentRequirements();

  async function loadStudentRequirements() {
    showLoading();

    try {
      const res = await fetch(`/api/nstp/requirements/${encodeURIComponent(studentId)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        renderStudentView(result.data);
      } else {
        showMessage(result.message || 'Unable to retrieve student requirement records.', 'error');
      }
    } catch (err) {
      console.error('Error fetching student requirements:', err);
      showMessage('Network error while loading requirement details.', 'error');
    } finally {
      hideLoading();
    }
  }

  function renderStudentView(data) {
    const s = data.student || data;
    const p = s.student_profiles || s.profile || {};
    const name = p.full_name || s.full_name || 'Student';
    const num = p.student_number || s.student_number || 'N/A';
    const email = s.email || 'N/A';
    const course = p.course || 'BSIT';
    const yearSection = `${p.year_level || '1st Year'} • Section ${p.section || '1'}`;

    if (studentName) studentName.textContent = name;
    if (studentNumber) studentNumber.textContent = num;
    if (studentCourseYear) studentCourseYear.textContent = `${course} (${yearSection})`;
    if (studentEmail) studentEmail.textContent = email;

    // Avatar initials
    if (studentAvatar) {
      const parts = name.trim().split(' ');
      const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
      studentAvatar.textContent = initials;
    }

    // Map requirements list
    const submittedReqs = Array.isArray(data.requirements) ? data.requirements : (data.cmo_requirements || []);
    const reqMap = {};
    submittedReqs.forEach(r => {
      const normKey = (r.requirement_type || r.type || '').toLowerCase().replace(/[\s/-]+/g, '_');
      reqMap[normKey] = r;
      if (r.type) reqMap[r.type.toLowerCase().replace(/[\s/-]+/g, '_')] = r;
    });

    let approvedCount = 0;

    // Render 4 requirement cards
    const cardsHtml = REQUIRED_TYPES.map((typeDef, index) => {
      const reqDoc = reqMap[typeDef.key] || reqMap[typeDef.name.toLowerCase().replace(/[\s/-]+/g, '_')];
      const status = (reqDoc ? reqDoc.status || reqDoc.verification_status || 'pending' : 'not_submitted').toLowerCase();

      if (status === 'approved') approvedCount++;

      let badgeHtml = '';
      if (status === 'approved') {
        badgeHtml = '<span class="badge badge-complete">Approved</span>';
      } else if (status === 'pending') {
        badgeHtml = '<span class="badge badge-pending">Pending Review</span>';
      } else if (status === 'rejected') {
        badgeHtml = '<span class="badge badge-rejected">Rejected / Incomplete</span>';
      } else {
        badgeHtml = '<span class="badge badge-warning">Not Submitted</span>';
      }

      const fileUrl = reqDoc ? (reqDoc.file_url || reqDoc.file_path || `/api/nstp/requirements/file/${reqDoc.requirement_id || reqDoc.id}`) : null;
      const fileName = reqDoc ? (reqDoc.file_name || `${typeDef.name} Upload`) : null;
      const submittedAt = reqDoc && reqDoc.created_at ? new Date(reqDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
      const reqId = reqDoc ? (reqDoc.requirement_id || reqDoc.id) : null;
      const remarks = reqDoc ? (reqDoc.remarks || '') : '';

      return `
        <div class="req-item-card" id="card_${typeDef.key}">
          <div>
            <div class="req-item-header">
              <div>
                <h3 class="req-item-title">${typeDef.name}</h3>
                <p class="req-item-desc">${typeDef.desc}</p>
              </div>
              <div>${badgeHtml}</div>
            </div>

            ${reqDoc ? `
              <div class="req-file-preview-box">
                <div class="file-info-snippet">
                  <div class="file-icon-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <div class="file-title-text">${escapeHtml(fileName)}</div>
                    <div class="file-date-text">Submitted on ${submittedAt || 'Recent'}</div>
                  </div>
                </div>
                ${fileUrl ? `
                  <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <span>View File</span>
                  </a>
                ` : ''}
              </div>

              <!-- Coordinator Feedback Remarks Input -->
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.75rem;">Coordinator Feedback / Remarks:</label>
                <input type="text" id="remarks_${reqId}" class="form-input" placeholder="e.g. Valid document, approved. Or reason for rejection..." value="${escapeHtml(remarks)}" />
              </div>
            ` : `
              <div class="empty-table-state" style="padding: 24px 0;">
                <div style="font-size: 0.8125rem; color: var(--text-muted);">The student has not yet uploaded this document.</div>
              </div>
            `}
          </div>

          ${reqDoc ? `
            <div class="req-review-actions">
              <button type="button" class="btn btn-secondary btn-sm" style="color: #DC2626; border-color: rgba(239, 68, 68, 0.4);" onclick="window.submitReview('${reqId}', 'rejected')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Reject</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="window.submitReview('${reqId}', 'approved')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Approve Document</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    if (requirementsGrid) requirementsGrid.innerHTML = cardsHtml;

    // Overall Status Progress
    if (approvedDocsCount) approvedDocsCount.textContent = `${approvedCount} of 4 Requirements Approved`;
    if (overallStatusBadge) {
      if (approvedCount === 4) {
        overallStatusBadge.className = 'badge badge-complete';
        overallStatusBadge.textContent = 'Fully Compliant';
      } else if (submittedReqs.some(r => (r.status || '').toLowerCase() === 'pending')) {
        overallStatusBadge.className = 'badge badge-pending';
        overallStatusBadge.textContent = 'Review In Progress';
      } else {
        overallStatusBadge.className = 'badge badge-rejected';
        overallStatusBadge.textContent = 'Incomplete';
      }
    }
  }

  /**
   * Submit Review Action (Approve / Reject)
   */
  window.submitReview = async function (requirementId, targetStatus) {
    if (!requirementId) return;

    const remarksInput = document.getElementById(`remarks_${requirementId}`);
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    const actionText = targetStatus === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${actionText} this CMO requirement?`)) return;

    try {
      const res = await fetch(`/api/nstp/requirements/${encodeURIComponent(requirementId)}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: targetStatus,
          remarks: remarks
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(`Document marked as ${targetStatus}!`, 'success');
        await loadStudentRequirements();
      } else {
        showMessage(data.message || 'Unable to update requirement status.', 'error');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      showMessage('Network error while saving review decision.', 'error');
    }
  };

  function showLoading() {
    if (reviewSkeleton) reviewSkeleton.style.display = 'block';
    if (reviewContent) reviewContent.classList.add('hidden');
  }

  function hideLoading() {
    if (reviewSkeleton) reviewSkeleton.style.display = 'none';
    if (reviewContent) reviewContent.classList.remove('hidden');
  }

  function showMessage(msg, type = 'info') {
    if (!messageContainer || !messageText) return;
    messageText.textContent = msg;
    if (messageContent) messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 4500);
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