/**
 * CWTSConnect — Create / Edit Community Request Controller
 * Manages:
 *  - 3-Step Wizard Pagination & Real-time Field Validation
 *  - Section 12 Skeleton Loading State
 *  - Leaflet Map Pin Coordinates & GPS Geolocation
 *  - Form Submissions to /api/community/requests
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
  const requestWizardNav = document.getElementById('requestWizardNav');
  const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');

  // Coordinates & Address Fields
  const latField = document.getElementById('latitude');
  const lngField = document.getElementById('longitude');
  const addressField = document.getElementById('completeAddress');
  const barangayField = document.getElementById('barangay');
  const municipalityField = document.getElementById('municipality');
  const provinceField = document.getElementById('province');
  const targetStartDateField = document.getElementById('targetStartDate');

  // Stepper State
  let currentStep = 1;
  const totalSteps = 3;

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
  if (targetStartDateField) {
    const today = new Date().toISOString().split('T')[0];
    targetStartDateField.min = today;
  }

  // Map Variables
  let map = null;
  let marker = null;
  const defaultLat = 14.5995;
  const defaultLng = 120.9842;

  // Initialize Page
  init();

  async function init() {
    showLoading();
    setupWizardNavigation();
    setupValidationListeners();

    if (editingRequestId) {
      if (pageHeaderTitle) pageHeaderTitle.textContent = 'Edit Community Request';
      if (submitBtnText) submitBtnText.textContent = 'Save Changes';
      await loadRequestForEdit(editingRequestId);
    } else {
      // Simulate quick smooth loading
      await new Promise(r => setTimeout(r, 200));
    }

    hideLoading();

    // Initialize Map after DOM elements are unhidden
    initMap(defaultLat, defaultLng);
  }

  /**
   * Wizard Stepper Navigation Controls
   */
  function setupWizardNavigation() {
    const btnNextStep1 = document.getElementById('btnNextStep1');
    const btnNextStep2 = document.getElementById('btnNextStep2');
    const btnPrevStep2 = document.getElementById('btnPrevStep2');
    const btnPrevStep3 = document.getElementById('btnPrevStep3');

    if (btnNextStep1) btnNextStep1.addEventListener('click', () => goToStep(2));
    if (btnNextStep2) btnNextStep2.addEventListener('click', () => goToStep(3));
    if (btnPrevStep2) btnPrevStep2.addEventListener('click', () => goToStep(1));
    if (btnPrevStep3) btnPrevStep3.addEventListener('click', () => goToStep(2));

    // Hook up top step tab clicks
    document.querySelectorAll('.wizard-step-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const targetStep = parseInt(this.getAttribute('data-step'), 10);
        if (targetStep) goToStep(targetStep);
      });
    });

    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    if (useCurrentLocationBtn) {
      useCurrentLocationBtn.addEventListener('click', getCurrentLocation);
    }
  }

  function goToStep(targetStep) {
    if (targetStep < 1 || targetStep > totalSteps) return;

    // Validate current step before advancing forward
    if (targetStep > currentStep) {
      if (!validateStep(currentStep)) {
        return;
      }
    }

    currentStep = targetStep;

    // Toggle Panels & Nav Tabs
    for (let i = 1; i <= totalSteps; i++) {
      const panel = document.getElementById(`stepPanel${i}`);
      const tab = document.getElementById(`tabStep${i}`);

      if (panel) {
        panel.classList.toggle('active', i === currentStep);
      }
      if (tab) {
        tab.classList.toggle('active', i === currentStep);
        tab.classList.toggle('completed', i < currentStep);
        tab.setAttribute('aria-selected', i === currentStep ? 'true' : 'false');
      }
    }

    // Invalidate Leaflet Map Size so it renders sharply on Step 2
    if (currentStep === 2) {
      setTimeout(() => {
        if (!map) {
          const lat = parseFloat(latField?.value) || defaultLat;
          const lng = parseFloat(lngField?.value) || defaultLng;
          initMap(lat, lng);
        } else {
          map.invalidateSize();
        }
      }, 150);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(step) {
    let isValid = true;
    let firstInvalid = null;

    if (step === 1) {
      const step1Fields = ['activity_title', 'activity_type', 'target_start_date', 'description'];
      step1Fields.forEach(fieldName => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input && (!input.value || !input.value.trim())) {
          input.classList.add('invalid');
          if (!firstInvalid) firstInvalid = input;
          isValid = false;
        }
      });

      if (!isValid) {
        showMessage('Please fill in all required Activity Details marked with an asterisk (*).', 'error');
      }
    } else if (step === 2) {
      const step2Fields = ['community_name', 'complete_address', 'barangay', 'municipality', 'province'];
      step2Fields.forEach(fieldName => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input && (!input.value || !input.value.trim())) {
          input.classList.add('invalid');
          if (!firstInvalid) firstInvalid = input;
          isValid = false;
        }
      });

      if (!isValid) {
        showMessage('Please fill in all required Community Location fields marked with an asterisk (*).', 'error');
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
    }

    return isValid;
  }

  function setupValidationListeners() {
    if (!form) return;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', function () {
        if (this.value.trim()) {
          this.classList.remove('invalid');
        }
      });
      input.addEventListener('change', function () {
        if (this.value.trim()) {
          this.classList.remove('invalid');
        }
      });
    });
  }

  /**
   * Initializes the interactive Leaflet Map
   */
  function initMap(lat, lng) {
    try {
      if (typeof L === 'undefined') return;

      const mapContainer = document.getElementById('requestMap');
      if (!mapContainer || map) return;

      map = L.map('requestMap').setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      // Update coordinates on drag
      marker.on('dragend', function () {
        const pos = marker.getLatLng();
        setCoordinates(pos.lat, pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });

      // Update coordinates on map click
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        setCoordinates(e.latlng.lat, e.latlng.lng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      setCoordinates(lat, lng);
    } catch (err) {
      console.warn('Map initialization error:', err);
    }
  }

  function setCoordinates(lat, lng) {
    if (latField) latField.value = parseFloat(lat).toFixed(6);
    if (lngField) lngField.value = parseFloat(lng).toFixed(6);
  }

  /**
   * Get user's current GPS location
   */
  function getCurrentLocation() {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.', 'error');
      return;
    }

    useCurrentLocationBtn.disabled = true;
    useCurrentLocationBtn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (map && marker) {
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
        }
        setCoordinates(lat, lng);
        reverseGeocode(lat, lng);
        useCurrentLocationBtn.disabled = false;
        useCurrentLocationBtn.textContent = 'Use My Location';
        showMessage('Location updated from your device GPS!', 'success');
      },
      err => {
        console.warn('Geolocation error:', err);
        showMessage('Unable to retrieve device location. Please click on the map to pin site location.', 'info');
        useCurrentLocationBtn.disabled = false;
        useCurrentLocationBtn.textContent = 'Use My Location';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  /**
   * Reverse geocodes coordinates to street / barangay / city
   */
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const addr = data.address;
          if (barangayField && !barangayField.value) {
            barangayField.value = addr.quarter || addr.suburb || addr.village || addr.neighbourhood || '';
          }
          if (municipalityField && !municipalityField.value) {
            municipalityField.value = addr.city || addr.town || addr.municipality || '';
          }
          if (provinceField && !provinceField.value) {
            provinceField.value = addr.state || addr.province || addr.region || 'Metro Manila';
          }
          if (addressField && !addressField.value) {
            addressField.value = data.display_name.split(',').slice(0, 3).join(', ');
          }
        }
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
  }

  /**
   * Loads existing request data in Edit Mode
   */
  async function loadRequestForEdit(requestId) {
    try {
      const res = await fetch(`/api/community/requests/${encodeURIComponent(requestId)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();

      if (res.ok && result.success && result.data) {
        populateForm(result.data);
      } else {
        showMessage(result.message || 'Unable to load request details.', 'error');
      }
    } catch (err) {
      console.error('Error fetching request for edit:', err);
      showMessage('Failed to load request for editing.', 'error');
    }
  }

  /**
   * Populates fields in Edit Mode
   */
  function populateForm(data) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('requestId', data.request_id || data.id);
    setVal('activityTitle', data.activity_title);
    setVal('activityType', data.activity_type);
    setVal('beneficiariesDescription', data.beneficiaries_description);
    setVal('description', data.description);
    setVal('communityName', data.community_name);
    setVal('completeAddress', data.complete_address);
    setVal('barangay', data.barangay);
    setVal('municipality', data.municipality);
    setVal('province', data.province);
    setVal('studentsNeeded', data.students_needed || data.required_students || 15);
    setVal('estimatedHours', data.estimated_hours || 30);
    setVal('skillsRequired', Array.isArray(data.skills_required) ? data.skills_required.join(', ') : (data.skills_required || ''));

    if (data.target_start_date) {
      setVal('targetStartDate', data.target_start_date.split('T')[0]);
    }
    if (data.target_end_date) {
      setVal('targetEndDate', data.target_end_date.split('T')[0]);
    }

    if (data.latitude && data.longitude) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      setCoordinates(lat, lng);
      if (map && marker) {
        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]);
      }
    }
  }

  /**
   * Handles Form Submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) return;

    const studentsNeeded = parseInt(document.getElementById('studentsNeeded').value, 10);
    if (!studentsNeeded || studentsNeeded < 1) {
      showMessage('Please specify a valid number of student volunteers needed.', 'error');
      document.getElementById('studentsNeeded').focus();
      return;
    }

    const skillsRaw = document.getElementById('skillsRequired').value.trim();
    const skillsArray = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const payload = {
      activity_title: document.getElementById('activityTitle').value.trim(),
      activity_type: document.getElementById('activityType').value.trim(),
      description: document.getElementById('description').value.trim(),
      community_name: document.getElementById('communityName').value.trim(),
      complete_address: document.getElementById('completeAddress').value.trim(),
      barangay: document.getElementById('barangay').value.trim(),
      municipality: document.getElementById('municipality').value.trim(),
      province: document.getElementById('province').value.trim(),
      latitude: latField ? parseFloat(latField.value) || defaultLat : defaultLat,
      longitude: lngField ? parseFloat(lngField.value) || defaultLng : defaultLng,
      students_needed: studentsNeeded,
      estimated_hours: parseInt(document.getElementById('estimatedHours').value, 10) || 30,
      skills_required: skillsArray,
      beneficiaries_description: document.getElementById('beneficiariesDescription').value.trim(),
      target_start_date: document.getElementById('targetStartDate').value,
      target_end_date: document.getElementById('targetEndDate').value || null,
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
        showMessage(editingRequestId ? 'Request updated successfully! Redirecting...' : 'Community request submitted successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'community-requests.html';
        }, 1500);
      } else {
        showMessage(data.message || 'Failed to submit request. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtnText.textContent = editingRequestId ? 'Save Changes' : 'Submit Community Request';
      }
    } catch (err) {
      console.error('Request submission error:', err);
      showMessage('Unable to connect to server. Please check your network and try again.', 'error');
      submitBtn.disabled = false;
      submitBtnText.textContent = editingRequestId ? 'Save Changes' : 'Submit Community Request';
    }
  }

  function showLoading() {
    if (requestSkeleton) requestSkeleton.style.display = 'block';
    if (requestWizardNav) requestWizardNav.classList.add('hidden');
    if (form) form.classList.add('hidden');
  }

  function hideLoading() {
    if (requestSkeleton) requestSkeleton.style.display = 'none';
    if (requestWizardNav) requestWizardNav.classList.remove('hidden');
    if (form) form.classList.remove('hidden');
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

});