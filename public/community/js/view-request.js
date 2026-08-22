/**
 * CWTSConnect — View Community Request Details Controller
 * Manages:
 *  - Fetching single request by ID
 *  - Rendering 2x2 Info Grid + Processing Status Timeline + Mini Map
 *  - Actions: Edit & Cancel (for pending requests)
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

  // Fields
  const activityTitleEl = document.getElementById('activityTitle');
  const requestCodeEl = document.getElementById('requestCode');
  const createdAtEl = document.getElementById('createdAt');
  const communitySiteSnippetEl = document.getElementById('communitySiteSnippet');
  const statusBadgeContainer = document.getElementById('statusBadgeContainer');

  const activityTypeEl = document.getElementById('activityType');
  const nstpComponentEl = document.getElementById('nstpComponent');
  const targetScheduleEl = document.getElementById('targetSchedule');
  const estimatedHoursEl = document.getElementById('estimatedHours');
  const beneficiariesEl = document.getElementById('beneficiaries');
  const activityDescEl = document.getElementById('activityDescription');

  const communityNameEl = document.getElementById('communityName');
  const completeAddressEl = document.getElementById('completeAddress');
  const locationDetailsEl = document.getElementById('locationDetails');
  const coordinatesTextEl = document.getElementById('coordinatesText');

  const studentsNeededEl = document.getElementById('studentsNeeded');
  const skillsTagContainer = document.getElementById('skillsTagContainer');

  // Timeline Step Elements
  const step2 = document.getElementById('timelineStep2');
  const step3 = document.getElementById('timelineStep3');
  const step4 = document.getElementById('timelineStep4');

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

      const result = await res.json();

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
    const reqCode = String(data.request_id || data.id || '').substring(0, 8);
    const status = data.request_status || 'pending';
    const isPending = status === 'pending';

    // 1. Header Area
    if (activityTitleEl) activityTitleEl.textContent = title;
    if (requestCodeEl) requestCodeEl.textContent = reqCode ? `REQ-${reqCode.toUpperCase()}` : '---';
    if (createdAtEl) createdAtEl.textContent = formatDate(data.created_at);
    if (communitySiteSnippetEl) communitySiteSnippetEl.textContent = `${data.community_name || ''} (${data.municipality || ''})`;

    if (statusBadgeContainer) {
      statusBadgeContainer.innerHTML = getStatusBadge(status);
    }

    // 2. Activity Overview Card
    if (activityTypeEl) activityTypeEl.textContent = data.activity_type || 'CWTS Community Project';
    if (nstpComponentEl) nstpComponentEl.textContent = data.preferred_nstp_component || 'CWTS';
    if (targetScheduleEl) {
      const start = formatDate(data.target_start_date);
      const end = data.target_end_date ? formatDate(data.target_end_date) : 'Open Schedule';
      targetScheduleEl.textContent = `${start} – ${end}`;
    }
    if (estimatedHoursEl) estimatedHoursEl.textContent = `${data.estimated_hours || 30}.0 Hours Total`;
    if (beneficiariesEl) beneficiariesEl.textContent = data.beneficiaries_description || 'Community Residents & Youth';
    if (activityDescEl) activityDescEl.textContent = data.description || 'No detailed scope of work provided.';

    // 3. Location Card
    if (communityNameEl) communityNameEl.textContent = data.community_name || 'Community Center';
    if (completeAddressEl) completeAddressEl.textContent = data.complete_address || 'Not Specified';
    if (locationDetailsEl) {
      locationDetailsEl.textContent = `${data.barangay || ''}, ${data.municipality || ''}, ${data.province || ''}`.replace(/^,\s*/, '');
    }

    const lat = parseFloat(data.latitude) || 14.5995;
    const lng = parseFloat(data.longitude) || 120.9842;
    if (coordinatesTextEl) coordinatesTextEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // Render Map
    initViewMap(lat, lng, title);

    // 4. Quota & Skills Card
    if (studentsNeededEl) {
      studentsNeededEl.textContent = `${data.students_needed || data.required_students || 15} CWTS Student Volunteers`;
    }

    if (skillsTagContainer) {
      let skills = [];
      if (Array.isArray(data.skills_required)) {
        skills = data.skills_required;
      } else if (typeof data.skills_required === 'string' && data.skills_required) {
        skills = data.skills_required.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (skills.length === 0) {
        skills = ['Community Engagement', 'General Volunteering', 'CWTS Civic Service'];
      }

      skillsTagContainer.innerHTML = skills.map(skill => `
        <span class="skill-tag" style="cursor: default;">${escapeHtml(skill)}</span>
      `).join('');
    }

    // 5. Timeline States
    updateTimeline(status);

    // 6. Action Buttons
    if (editBtn) {
      if (isPending) {
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
  }

  function updateTimeline(status) {
    if (step2) step2.className = 'timeline-item';
    if (step3) step3.className = 'timeline-item';
    if (step4) step4.className = 'timeline-item';

    if (status === 'pending') {
      if (step2) step2.className = 'timeline-item current';
    } else if (status === 'approved') {
      if (step2) step2.className = 'timeline-item completed';
      if (step3) step3.className = 'timeline-item current';
    } else if (status === 'completed') {
      if (step2) step2.className = 'timeline-item completed';
      if (step3) step3.className = 'timeline-item completed';
      if (step4) step4.className = 'timeline-item completed';
    } else if (status === 'rejected') {
      if (step2) {
        step2.className = 'timeline-item';
        const titleEl = step2.querySelector('.timeline-item-title');
        if (titleEl) titleEl.textContent = '2. Returned / Needs Revision';
      }
    } else if (status === 'cancelled') {
      if (step2) {
        step2.className = 'timeline-item';
        const titleEl = step2.querySelector('.timeline-item-title');
        if (titleEl) titleEl.textContent = '2. Request Cancelled by Official';
      }
    }
  }

  function initViewMap(lat, lng, title) {
    try {
      if (typeof L === 'undefined') return;
      const mapEl = document.getElementById('viewMap');
      if (!mapEl) return;

      const map = L.map('viewMap').setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      L.marker([lat, lng]).addTo(map).bindPopup(`<strong>${escapeHtml(title)}</strong>`).openPopup();
    } catch (err) {
      console.warn('View map render error:', err);
    }
  }

  async function cancelRequest(id) {
    if (!confirm('Are you sure you want to cancel this community request?')) return;

    try {
      const res = await fetch(`/api/community/requests/${encodeURIComponent(id)}/cancel`, {
        method: 'PUT',
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage('Request has been cancelled.', 'success');
        loadRequestData(id);
      } else {
        showMessage(data.message || 'Unable to cancel request.', 'error');
      }
    } catch (err) {
      showMessage('Network error while cancelling request.', 'error');
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'approved':
        return '<span class="badge badge-approved">Approved & Queued</span>';
      case 'rejected':
        return '<span class="badge badge-rejected">Rejected / Needs Revision</span>';
      case 'cancelled':
        return '<span class="badge badge-incomplete">Cancelled</span>';
      case 'completed':
        return '<span class="badge badge-approved">Completed</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending Review</span>';
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
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
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

});