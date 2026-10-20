/**
 * CWTSConnect — View Community Request Details Controller
 * Clean, accurate request details view showing only user-submitted inputs,
 * live status, coordinator feedback (if any), and community map.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Read request ID from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('id');

  if (!requestId) {
    window.location.href = 'community-requests.html';
    return;
  }

  // DOM Elements
  const detailsSkeleton = document.getElementById('detailsSkeleton');
  const detailsContent = document.getElementById('detailsContent');
  const editBtn = document.getElementById('editRequestBtn');
  const cancelBtn = document.getElementById('cancelRequestBtn');
  const deleteBtn = document.getElementById('deleteRequestBtn');

  // Hero Fields
  const activityTitleEl = document.getElementById('activityTitle');
  const statusBadgeContainer = document.getElementById('statusBadgeContainer');
  const activityTypeBadge = document.getElementById('activityTypeBadge');
  const createdAtEl = document.getElementById('createdAt');
  const targetScheduleEl = document.getElementById('targetSchedule');

  // Remarks
  const remarksBanner = document.getElementById('remarksBanner');
  const nstpRemarksText = document.getElementById('nstpRemarksText');

  // Activity Details
  const activityDescEl = document.getElementById('activityDescription');
  const skillsTagContainer = document.getElementById('skillsTagContainer');
  const noSkillsMessage = document.getElementById('noSkillsMessage');

  // Location Details
  const communityNameEl = document.getElementById('communityName');
  const completeAddressEl = document.getElementById('completeAddress');

  // Timeline Step Elements
  const timelineStep1 = document.getElementById('timelineStep1');
  const timelineStep1Desc = document.getElementById('timelineStep1Desc');
  const timelineStep2 = document.getElementById('timelineStep2');
  const timelineStep2Title = document.getElementById('timelineStep2Title');
  const timelineStep2Desc = document.getElementById('timelineStep2Desc');
  const timelineStep3 = document.getElementById('timelineStep3');
  const timelineStep3Title = document.getElementById('timelineStep3Title');
  const timelineStep3Desc = document.getElementById('timelineStep3Desc');

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

  let mapInstance = null;

  // Load Request Data
  loadRequestData(requestId);

  async function loadRequestData(id) {
    showLoading();

    try {
      const res = await fetch(`/api/community/requests/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success && result.data) {
        renderDetails(result.data);
      } else {
        showMessage(result.message || 'Request not found.', 'error');
      }
    } catch (err) {
      console.error('Error loading request details:', err);
      showMessage('Unable to load request details. Please check your connection.', 'error');
    } finally {
      hideLoading();
    }
  }

  function renderDetails(data) {
    const title = data.activity_title || 'Untitled Community Activity';
    const status = (data.request_status || 'pending').toLowerCase();
    const isPending = status === 'pending';
    const canEdit = isPending || status === 'rejected' || status === 'needs_revision';

    // 1. Hero Summary Information
    if (activityTitleEl) activityTitleEl.textContent = title;
    if (statusBadgeContainer) {
      statusBadgeContainer.innerHTML = getStatusBadge(status);
    }
    if (activityTypeBadge) {
      activityTypeBadge.textContent = data.activity_type || 'CWTS Project';
    }
    if (createdAtEl) {
      createdAtEl.textContent = formatDate(data.created_at);
    }
    if (targetScheduleEl) {
      const scheduleDate = data.preferred_start_date || data.target_start_date || data.date;
      targetScheduleEl.textContent = formatDate(scheduleDate);
    }

    // 2. Remarks / Coordinator Feedback Banner
    if (remarksBanner && nstpRemarksText) {
      if (data.nstp_remarks && data.nstp_remarks.trim()) {
        nstpRemarksText.textContent = data.nstp_remarks.trim();
        remarksBanner.classList.remove('hidden');
        if (status === 'rejected' || status === 'needs_revision') {
          remarksBanner.className = 'remarks-banner rejected';
        } else if (status === 'approved') {
          remarksBanner.className = 'remarks-banner approved';
        } else {
          remarksBanner.className = 'remarks-banner';
        }
      } else {
        remarksBanner.classList.add('hidden');
      }
    }

    // 3. Activity Description & Scope of Work
    if (activityDescEl) {
      const desc = data.activity_description || data.description;
      activityDescEl.textContent = desc && desc.trim() ? desc.trim() : 'No detailed description provided.';
    }

    // 4. Required Skills Tags
    if (skillsTagContainer) {
      let skills = [];
      const rawSkills = data.needed_skills || data.skills_required;
      if (Array.isArray(rawSkills)) {
        skills = rawSkills;
      } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
        skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (skills.length > 0) {
        skillsTagContainer.innerHTML = skills.map(skill => `
          <span class="skill-tag">${escapeHtml(skill)}</span>
        `).join('');
        skillsTagContainer.style.display = 'flex';
        if (noSkillsMessage) noSkillsMessage.classList.add('hidden');
      } else {
        skillsTagContainer.innerHTML = '';
        skillsTagContainer.style.display = 'none';
        if (noSkillsMessage) noSkillsMessage.classList.remove('hidden');
      }
    }

    // 5. Community Location & Interactive Map
    const commName = data.community_name || 'Community Center';
    const addressParts = [
      data.complete_address || data.community_address || '',
      data.barangay ? `Brgy. ${data.barangay}` : '',
      data.municipality || '',
      data.province || ''
    ].filter(Boolean);

    if (communityNameEl) communityNameEl.textContent = commName;
    if (completeAddressEl) {
      completeAddressEl.textContent = addressParts.length > 0 ? addressParts.join(', ') : 'Not Specified';
    }

    const lat = parseFloat(data.latitude) || 14.2780;
    const lng = parseFloat(data.longitude) || 121.4170;
    initViewMap(lat, lng, title);

    // 6. Realistic 3-Step Progress Timeline
    updateTimeline(status, data.created_at);

    // 7. Action Buttons
    if (editBtn) {
      if (canEdit) {
        editBtn.href = `create-request.html?id=${encodeURIComponent(data.request_id || data.id)}`;
        editBtn.classList.remove('hidden');
      } else {
        editBtn.classList.add('hidden');
      }
    }

    if (cancelBtn) {
      if (isPending) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.onclick = () => cancelRequest(data.request_id || data.id);
      } else {
        cancelBtn.classList.add('hidden');
      }
    }

    if (deleteBtn) {
      if (status === 'cancelled') {
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = () => deleteRequest(data.request_id || data.id);
      } else {
        deleteBtn.classList.add('hidden');
      }
    }
  }

  function updateTimeline(status, createdAt) {
    if (timelineStep1Desc) {
      timelineStep1Desc.textContent = createdAt ? `Submitted on ${formatDate(createdAt)}.` : 'Request successfully submitted.';
    }

    if (status === 'pending') {
      if (timelineStep1) timelineStep1.className = 'timeline-item completed';
      if (timelineStep2) {
        timelineStep2.className = 'timeline-item current';
        if (timelineStep2Title) timelineStep2Title.textContent = '2. Under Coordinator Review';
        if (timelineStep2Desc) timelineStep2Desc.textContent = 'NSTP coordinator is evaluating the activity request.';
      }
      if (timelineStep3) {
        timelineStep3.className = 'timeline-item';
        if (timelineStep3Title) timelineStep3Title.textContent = '3. Pending Decision';
        if (timelineStep3Desc) timelineStep3Desc.textContent = 'Awaiting coordinator approval decision.';
      }
    } else if (status === 'approved') {
      if (timelineStep1) timelineStep1.className = 'timeline-item completed';
      if (timelineStep2) {
        timelineStep2.className = 'timeline-item completed';
        if (timelineStep2Title) timelineStep2Title.textContent = '2. Reviewed & Approved';
        if (timelineStep2Desc) timelineStep2Desc.textContent = 'Coordinator approved the community request.';
      }
      if (timelineStep3) {
        timelineStep3.className = 'timeline-item completed';
        if (timelineStep3Title) timelineStep3Title.textContent = '3. Approved & Queued for Deployment';
        if (timelineStep3Desc) timelineStep3Desc.textContent = 'Ready for student volunteer matching.';
      }
    } else if (status === 'rejected' || status === 'needs_revision') {
      if (timelineStep1) timelineStep1.className = 'timeline-item completed';
      if (timelineStep2) {
        timelineStep2.className = 'timeline-item rejected';
        if (timelineStep2Title) timelineStep2Title.textContent = '2. Returned / Needs Revision';
        if (timelineStep2Desc) timelineStep2Desc.textContent = 'Coordinator requested revisions before approval.';
      }
      if (timelineStep3) {
        timelineStep3.className = 'timeline-item';
        if (timelineStep3Title) timelineStep3Title.textContent = '3. Action Required';
        if (timelineStep3Desc) timelineStep3Desc.textContent = 'Please edit and resubmit request.';
      }
    } else if (status === 'cancelled') {
      if (timelineStep1) timelineStep1.className = 'timeline-item completed';
      if (timelineStep2) {
        timelineStep2.className = 'timeline-item cancelled';
        if (timelineStep2Title) timelineStep2Title.textContent = '2. Request Cancelled';
        if (timelineStep2Desc) timelineStep2Desc.textContent = 'Cancelled by community official.';
      }
      if (timelineStep3) {
        timelineStep3.className = 'timeline-item';
        if (timelineStep3Title) timelineStep3Title.textContent = '3. Inactive';
        if (timelineStep3Desc) timelineStep3Desc.textContent = 'No further action required.';
      }
    }
  }

  function initViewMap(lat, lng, title) {
    try {
      if (typeof L === 'undefined') return;
      const mapEl = document.getElementById('viewMap');
      if (!mapEl) return;

      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }

      mapInstance = L.map('viewMap', {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 14);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Street Map'
      }).addTo(mapInstance);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 250);

      // Add pin cleanly without automatically opening truncated popup
      L.marker([lat, lng]).addTo(mapInstance).bindPopup(`<strong>${escapeHtml(title)}</strong>`);
    } catch (err) {
      console.warn('View map render error:', err);
    }
  }

  function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'approved':
        return '<span class="badge badge-approved">Approved</span>';
      case 'rejected':
      case 'needs_revision':
        return '<span class="badge badge-rejected">Rejected</span>';
      case 'cancelled':
        return '<span class="badge badge-cancelled">Cancelled</span>';
      case 'completed':
        return '<span class="badge badge-approved">Completed</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending</span>';
    }
  }

  function showLoading() {
    if (detailsSkeleton) detailsSkeleton.style.display = 'block';
    if (detailsContent) detailsContent.classList.add('hidden');
  }

  function hideLoading() {
    if (detailsSkeleton) detailsSkeleton.style.display = 'none';
    if (detailsContent) detailsContent.classList.remove('hidden');
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

  function formatDate(dateStr) {
    if (!dateStr) return 'Not Specified';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  /**
   * Simple Neumorphic Confirmation Modal
   * Clean neutral edges, soft neumorphic elevation, simple wordings.
   */
  function showConfirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
  } = {}) {
    return new Promise((resolve) => {
      let modal = document.getElementById('confirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'neu-modal-backdrop';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
          <div class="neu-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
            <div class="neu-modal-icon-wrap danger" id="confirmModalIcon"></div>
            <div class="neu-modal-content">
              <h3 class="neu-modal-title" id="confirmModalTitle"></h3>
              <p class="neu-modal-desc" id="confirmModalDesc"></p>
            </div>
            <div class="neu-modal-actions">
              <button type="button" class="btn-neu-modal btn-neu-cancel" id="btnConfirmCancel"></button>
              <button type="button" class="btn-neu-modal btn-neu-confirm" id="btnConfirmProceed"></button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const titleEl = modal.querySelector('#confirmModalTitle');
      const descEl = modal.querySelector('#confirmModalDesc');
      const cancelBtn = modal.querySelector('#btnConfirmCancel');
      const proceedBtn = modal.querySelector('#btnConfirmProceed');
      const iconWrap = modal.querySelector('#confirmModalIcon');

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = message;
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (proceedBtn) {
        proceedBtn.textContent = confirmText;
        proceedBtn.className = `btn-neu-modal btn-neu-confirm ${type}`;
      }

      if (iconWrap) {
        iconWrap.className = `neu-modal-icon-wrap ${type}`;
        if (type === 'danger') {
          iconWrap.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          `;
        } else {
          iconWrap.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          `;
        }
      }

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');

      function cleanup(result) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        cancelBtn.removeEventListener('click', onCancel);
        proceedBtn.removeEventListener('click', onProceed);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onCancel() { cleanup(false); }
      function onProceed() { cleanup(true); }
      function onBackdrop(e) { if (e.target === modal) cleanup(false); }
      function onKey(e) { if (e.key === 'Escape') cleanup(false); }

      cancelBtn.addEventListener('click', onCancel);
      proceedBtn.addEventListener('click', onProceed);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);

      if (cancelBtn) cancelBtn.focus();
    });
  }

  async function cancelRequest(requestId) {
    const confirmed = await showConfirmModal({
      title: 'Cancel Request',
      message: 'Cancel this community request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request',
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/community/requests/${encodeURIComponent(requestId)}/cancel`, {
        method: 'PUT',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('Request has been cancelled successfully.', 'success');
        setTimeout(() => {
          loadRequestDetails(requestId);
        }, 800);
      } else {
        throw new Error(data.message || 'Failed to cancel request.');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      showMessage(err.message || 'Error cancelling request.', 'error');
    }
  }

  async function deleteRequest(requestId) {
    const confirmed = await showConfirmModal({
      title: 'Delete Request',
      message: 'Delete this cancelled request permanently?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/community/requests/${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('Cancelled request has been deleted successfully.', 'success');
        setTimeout(() => {
          window.location.href = 'community-requests.html';
        }, 1000);
      } else {
        throw new Error(data.message || 'Failed to delete request.');
      }
    } catch (err) {
      console.error('Error deleting request:', err);
      showMessage(err.message || 'Error deleting request.', 'error');
    }
  }

});