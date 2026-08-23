/**
 * CWTSConnect — Create / Edit Community Request Controller
 * Streamlined single direct form page with essential activity details
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Check if we are in Edit Mode
  const urlParams = new URLSearchParams(window.location.search);
  const editingRequestId = urlParams.get('id');

  // DOM Elements
  const form = document.getElementById('communityRequestForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const pageHeaderTitle = document.getElementById('pageHeaderTitle');
  const requestSkeleton = document.getElementById('requestSkeleton');

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

  // Set min date for target start date to today
  const targetStartDateField = document.getElementById('targetStartDate');
  if (targetStartDateField) {
    const today = new Date().toISOString().split('T')[0];
    targetStartDateField.min = today;
  }

  // Initialize Page
  init();

  async function init() {
    showLoading();
    setupValidationListeners();

    // 1. Fetch user's registered community profile to auto-fill location
    await loadUserProfileLocation();

    if (editingRequestId) {
      if (pageHeaderTitle) pageHeaderTitle.textContent = 'Edit Community Request';
      if (submitBtnText) submitBtnText.textContent = 'Save Changes';
      await loadRequestForEdit(editingRequestId);
    } else {
      await new Promise(r => setTimeout(r, 120));
    }

    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    hideLoading();
  }

  async function loadUserProfileLocation() {
    try {
      const res = await fetch('/api/community/me');
      const result = await res.json();

      if (result.success && result.data) {
        const p = result.data.profile || result.data;
        const setHidden = (id, val) => {
          const el = document.getElementById(id);
          if (el && val) el.value = val;
        };

        setHidden('communityName', p.organization_name || p.community_name || 'Barangay Community');
        setHidden('completeAddress', p.street_address || p.complete_address || p.office_address || 'Barangay Hall');
        setHidden('barangay', p.barangay || '');
        setHidden('municipality', p.municipality || p.city || '');
        setHidden('province', p.province || 'Laguna');
        setHidden('latitude', p.latitude || '14.2780');
        setHidden('longitude', p.longitude || '121.4170');
      }
    } catch (err) {
      console.warn('Could not auto-fetch community profile location:', err.message);
    }
  }

  function validateForm() {
    let isValid = true;

    const activityTitle = document.getElementById('activityTitle');
    const activityType = document.getElementById('activityType');
    const targetStartDate = document.getElementById('targetStartDate');
    const description = document.getElementById('description');

    if (!activityTitle.value.trim()) {
      highlightError(activityTitle, 'Please provide an activity title.');
      isValid = false;
    } else {
      clearError(activityTitle);
    }

    if (!activityType.value) {
      highlightError(activityType, 'Please select an activity type.');
      isValid = false;
    } else {
      clearError(activityType);
    }

    if (!targetStartDate.value) {
      highlightError(targetStartDate, 'Please set a date for the activity.');
      isValid = false;
    } else {
      clearError(targetStartDate);
    }

    if (!description.value.trim()) {
      highlightError(description, 'Please describe the activity scope and planned volunteer tasks.');
      isValid = false;
    } else {
      clearError(description);
    }

    return isValid;
  }

  function setupValidationListeners() {
    const inputs = form ? form.querySelectorAll('input, select, textarea') : [];
    inputs.forEach(input => {
      input.addEventListener('input', () => clearError(input));
      input.addEventListener('change', () => clearError(input));
    });
  }

  function highlightError(field, message) {
    if (!field) return;
    field.classList.add('error');
    field.style.borderColor = '#DC2626';

    let errText = field.parentElement.querySelector('.field-error-text');
    if (!errText) {
      errText = document.createElement('span');
      errText.className = 'field-error-text';
      errText.style.color = '#DC2626';
      errText.style.fontSize = '0.75rem';
      errText.style.marginTop = '4px';
      errText.style.display = 'block';
      field.parentElement.appendChild(errText);
    }
    errText.textContent = message;
    field.focus();
  }

  function clearError(field) {
    if (!field) return;
    field.classList.remove('error');
    field.style.borderColor = '';
    const errText = field.parentElement.querySelector('.field-error-text');
    if (errText) errText.remove();
  }

  /**
   * Load Request for Edit Mode
   */
  async function loadRequestForEdit(id) {
    try {
      const response = await fetch(`/api/community/requests/${encodeURIComponent(id)}`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load community request details.');
      }

      const result = await response.json();
      if (result.success && result.data) {
        populateForm(result.data);
      } else {
        throw new Error(result.message || 'Request not found.');
      }
    } catch (err) {
      console.error('Error fetching request for edit:', err);
      showMessage(err.message || 'Unable to load request.', 'error');
    }
  }

  function populateForm(data) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('requestId', data.request_id || data.id);
    setVal('activityTitle', data.activity_title);
    setVal('activityType', data.activity_type);
    setVal('description', data.description);
    setVal('communityName', data.community_name);
    setVal('completeAddress', data.complete_address);
    setVal('barangay', data.barangay);
    setVal('municipality', data.municipality);
    setVal('province', data.province);
    setVal('latitude', data.latitude);
    setVal('longitude', data.longitude);

    if (data.target_start_date) {
      setVal('targetStartDate', data.target_start_date.split('T')[0]);
    }
  }

  /**
   * Handles Form Submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const defaultLat = 14.2780;
    const defaultLng = 121.4170;

    const payload = {
      activity_title: document.getElementById('activityTitle').value.trim(),
      activity_type: document.getElementById('activityType').value.trim(),
      description: document.getElementById('description').value.trim(),
      community_name: document.getElementById('communityName')?.value?.trim() || 'Barangay Community',
      complete_address: document.getElementById('completeAddress')?.value?.trim() || 'Barangay Hall',
      barangay: document.getElementById('barangay')?.value?.trim() || '',
      municipality: document.getElementById('municipality')?.value?.trim() || '',
      province: document.getElementById('province')?.value?.trim() || 'Laguna',
      latitude: parseFloat(document.getElementById('latitude')?.value) || defaultLat,
      longitude: parseFloat(document.getElementById('longitude')?.value) || defaultLng,
      students_needed: parseInt(document.getElementById('studentsNeeded')?.value || 15, 10) || 15,
      estimated_hours: parseInt(document.getElementById('estimatedHours')?.value || 30, 10) || 30,
      skills_required: [],
      target_start_date: document.getElementById('targetStartDate')?.value || '',
      preferred_nstp_component: 'CWTS'
    };

    submitBtn.disabled = true;
    submitBtnText.textContent = editingRequestId ? 'Saving Changes...' : 'Submitting Request...';

    try {
      const endpoint = editingRequestId ? `/api/community/requests/${encodeURIComponent(editingRequestId)}` : '/api/community/requests';
      const method = editingRequestId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(editingRequestId ? 'Request updated successfully!' : 'Community request submitted successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'community-requests.html';
        }, 1200);
      } else {
        throw new Error(data.message || 'Failed to process community request.');
      }
    } catch (error) {
      console.error('Request submission error:', error);
      showMessage(error.message || 'Server error. Please check inputs and retry.', 'error');
      submitBtn.disabled = false;
      submitBtnText.textContent = editingRequestId ? 'Save Changes' : 'Submit Community Request';
    }
  }

  function showMessage(msg, type = 'info') {
    if (!messageContainer || !messageText || !messageContent) return;
    messageText.textContent = msg;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        messageContainer.style.display = 'none';
      }, 4000);
    }
  }

  function showLoading() {
    if (requestSkeleton) requestSkeleton.classList.remove('hidden');
    if (form) form.classList.add('hidden');
  }

  function hideLoading() {
    if (requestSkeleton) requestSkeleton.classList.add('hidden');
    if (form) form.classList.remove('hidden');
  }

})();