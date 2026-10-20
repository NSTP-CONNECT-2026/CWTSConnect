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

  let availableRequestTypes = [];

  // Initialize Page
  init();

  async function init() {
    showLoading();
    setupValidationListeners();

    // 1. Fetch available school-offered request types / services
    await loadAvailableRequestTypes();

    // 2. Fetch user's registered community profile to auto-fill location
    await loadUserProfileLocation();

    if (editingRequestId) {
      if (pageHeaderTitle) pageHeaderTitle.textContent = 'Edit Community Request';
      const formHeaderTitle = document.getElementById('formHeaderTitle');
      if (formHeaderTitle) formHeaderTitle.textContent = 'Edit Community Request';
      const formHeaderMeta = document.getElementById('formHeaderMeta');
      if (formHeaderMeta) formHeaderMeta.textContent = 'Update Request Details';

      const btnBackToRequests = document.getElementById('btnBackToRequests');
      if (btnBackToRequests) {
        btnBackToRequests.href = `view-request.html?id=${encodeURIComponent(editingRequestId)}`;
        btnBackToRequests.title = 'Back to Request Details';
        btnBackToRequests.setAttribute('aria-label', 'Back to Request Details');
      }

      const btnCancel = document.getElementById('btnCancel');
      if (btnCancel) {
        btnCancel.href = `view-request.html?id=${encodeURIComponent(editingRequestId)}`;
      }

      if (submitBtnText) submitBtnText.textContent = 'Save Changes';
      await loadRequestForEdit(editingRequestId);
    } else {
      await new Promise(r => setTimeout(r, 120));
    }

    setupServiceTypeListener();

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

  function getCanonicalServiceType(val = '') {
    const s = String(val).toLowerCase().trim();
    if (!s) return '';
    if (s.includes('clean') || s.includes('waste') || s.includes('sanitat')) return 'Clean-up Drive & Environmental Sanitation';
    if (s.includes('tree') || s.includes('plant') || s.includes('green') || s.includes('reforest')) return 'Community Tree Planting & Urban Greening';
    if (s.includes('literacy') || s.includes('tutor') || s.includes('read') || s.includes('teach')) return 'Literacy & Tutorial Outreach Program';
    if (s.includes('computer') || s.includes('digital') || s.includes('it ') || s.includes('tech')) return 'Computer Literacy & Basic IT Skills Training';
    if (s.includes('health') || s.includes('first aid') || s.includes('medical') || s.includes('vital')) return 'Community Health & First Aid Awareness Outreach';
    if (s.includes('disaster') || s.includes('risk') || s.includes('calamity') || s.includes('preparedness') || s.includes('drill')) return 'Disaster Risk Reduction & Emergency Preparedness Seminar';
    if (s.includes('feed') || s.includes('nutrition') || s.includes('diet') || s.includes('food')) return 'Nutritional Feeding & Health Advocacy Program';
    if (s.includes('survey') || s.includes('census') || s.includes('profil') || s.includes('mapping')) return 'Community Profiling & Needs Survey Assistance';
    if (s.includes('youth') || s.includes('leadership')) return 'Youth Leadership & Skills Development Workshop';
    if (s.includes('livelihood') || s.includes('entrepreneur') || s.includes('craft')) return 'Livelihood & Entrepreneurship Training Program';
    if (s.includes('other')) return 'Others / Special Community Project';
    return val;
  }

  function getDefaultRequestTypesCatalog() {
    return [
      {
        type_id: 'rt-001',
        name: 'Clean-up Drive & Environmental Sanitation',
        description: 'Community-wide clean-up operations, coastal care, waste segregation drives, and waterway clearing led by student volunteers.',
        required_skills: ['Community Organizing', 'Documentation']
      },
      {
        type_id: 'rt-002',
        name: 'Community Tree Planting & Urban Greening',
        description: 'Reforestation, watershed protection, and urban greening activities to promote biodiversity and environmental resilience.',
        required_skills: ['Environmental Awareness', 'Leadership', 'Documentation']
      },
      {
        type_id: 'rt-003',
        name: 'Literacy & Tutorial Outreach Program',
        description: 'Basic reading, writing, mathematics, and storytelling sessions for elementary pupils and out-of-school children.',
        required_skills: ['Teaching', 'Public Speaking', 'Community Organizing']
      },
      {
        type_id: 'rt-004',
        name: 'Computer Literacy & Basic IT Skills Training',
        description: 'Hands-on digital literacy workshops for youth, barangay staff, and seniors covering computer basics, office tools, and internet safety.',
        required_skills: ['Computer Literacy', 'Teaching', 'Documentation']
      },
      {
        type_id: 'rt-005',
        name: 'Community Health & First Aid Awareness Outreach',
        description: 'Basic health education, vital signs monitoring assistance, emergency first aid demonstrations, and hygiene advocacy.',
        required_skills: ['First Aid', 'Health Education', 'Public Speaking']
      },
      {
        type_id: 'rt-006',
        name: 'Disaster Risk Reduction & Emergency Preparedness Seminar',
        description: 'Community drills, emergency grab-bag workshops, disaster mitigation mapping, and basic rescue preparedness training.',
        required_skills: ['First Aid', 'Leadership', 'Community Organizing']
      },
      {
        type_id: 'rt-007',
        name: 'Nutritional Feeding & Health Advocacy Program',
        description: 'Supplementary feeding drives for undernourished children accompanied by nutrition and dietary health education for parents.',
        required_skills: ['Health Education', 'Community Organizing', 'Event Management']
      },
      {
        type_id: 'rt-008',
        name: 'Community Profiling & Needs Survey Assistance',
        description: 'Household census support, community mapping, and socio-economic survey conducting for local government planning.',
        required_skills: ['Survey Conducting', 'Data Entry', 'Documentation']
      },
      {
        type_id: 'rt-009',
        name: 'Youth Leadership & Skills Development Workshop',
        description: 'Leadership training, values formation, team building, and life skills workshops for community youth.',
        required_skills: ['Leadership', 'Public Speaking', 'Community Organizing']
      },
      {
        type_id: 'rt-010',
        name: 'Livelihood & Entrepreneurship Training Program',
        description: 'Practical livelihood skills, basic entrepreneurship, craft-making, and financial literacy seminars for community families.',
        required_skills: ['Community Organizing', 'Event Management', 'Documentation']
      },
      {
        type_id: 'rt-011',
        name: 'Others / Special Community Project',
        description: 'Special civic welfare service, community event assistance, or custom community development activities tailored to local barangay needs.',
        required_skills: ['Community Organizing', 'Leadership']
      }
    ];
  }

  function populateForm(data) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('requestId', data.request_id || data.id);
    setVal('activityTitle', data.activity_title);
    setVal('description', data.activity_description || data.description);
    setVal('communityName', data.community_name);
    setVal('completeAddress', data.complete_address || data.community_address);
    setVal('barangay', data.barangay);
    setVal('municipality', data.municipality);
    setVal('province', data.province);
    setVal('latitude', data.latitude);
    setVal('longitude', data.longitude);

    const dateVal = data.preferred_start_date || data.target_start_date || data.date;
    if (dateVal) {
      setVal('targetStartDate', dateVal.split('T')[0]);
    }

    const activityTypeSelect = document.getElementById('activityType');
    const reqActivityType = (data.activity_type || '').trim();

    if (activityTypeSelect && reqActivityType) {
      let matchedValue = null;

      // 1. Exact or case-insensitive match among existing options
      for (const opt of activityTypeSelect.options) {
        if (opt.value && opt.value.toLowerCase() === reqActivityType.toLowerCase()) {
          matchedValue = opt.value;
          break;
        }
      }

      // 2. Canonical / alias match
      if (!matchedValue) {
        const canonical = getCanonicalServiceType(reqActivityType);
        for (const opt of activityTypeSelect.options) {
          if (opt.value && (opt.value.toLowerCase() === canonical.toLowerCase() || opt.value.toLowerCase().includes(canonical.toLowerCase()) || canonical.toLowerCase().includes(opt.value.toLowerCase()))) {
            matchedValue = opt.value;
            break;
          }
        }
      }

      // 3. Fallback: Dynamically add as valid option if not yet present
      if (!matchedValue) {
        const customOpt = document.createElement('option');
        customOpt.value = reqActivityType;
        customOpt.textContent = reqActivityType;
        activityTypeSelect.appendChild(customOpt);
        matchedValue = reqActivityType;

        availableRequestTypes.push({
          type_id: 'custom-' + Date.now(),
          name: reqActivityType,
          description: data.activity_description || 'Community service activity requested for barangay development.',
          required_skills: Array.isArray(data.needed_skills) ? data.needed_skills : []
        });
      }

      activityTypeSelect.value = matchedValue;
      updateServiceCard(matchedValue);
    }
  }

  /**
   * Loads the official school-offered request types / services from the database & catalog
   */
  async function loadAvailableRequestTypes() {
    const activityTypeSelect = document.getElementById('activityType');
    if (!activityTypeSelect) return;

    let apiServices = [];
    try {
      const response = await fetch('/api/request-types?active=true', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        apiServices = result.data;
      }
    } catch (err) {
      console.warn('Could not load dynamic request types from API:', err.message);
    }

    // Merge API services with standard catalog to guarantee all services are always available
    const standardCatalog = getDefaultRequestTypesCatalog();
    const serviceMap = new Map();

    // Priority 1: Services from database / local store
    apiServices.forEach(srv => {
      if (srv && srv.name && srv.name.trim()) {
        serviceMap.set(srv.name.trim().toLowerCase(), srv);
      }
    });

    // Priority 2: Standard institutional catalog (fills in any missing services)
    standardCatalog.forEach(srv => {
      const key = srv.name.toLowerCase();
      if (!serviceMap.has(key)) {
        serviceMap.set(key, srv);
      }
    });

    availableRequestTypes = Array.from(serviceMap.values());

    const currentVal = activityTypeSelect.value;
    activityTypeSelect.innerHTML = '<option value="">Select School-Offered Service</option>';

    availableRequestTypes.forEach(srv => {
      const opt = document.createElement('option');
      opt.value = srv.name;
      opt.textContent = srv.name;
      activityTypeSelect.appendChild(opt);
    });

    if (currentVal) {
      activityTypeSelect.value = currentVal;
      updateServiceCard(currentVal);
    }
  }

  function setupServiceTypeListener() {
    const activityTypeSelect = document.getElementById('activityType');
    const btnUseServiceDesc = document.getElementById('btnUseServiceDesc');
    const descTextarea = document.getElementById('description');

    if (activityTypeSelect) {
      activityTypeSelect.addEventListener('change', function () {
        updateServiceCard(this.value);
      });
    }

    if (btnUseServiceDesc && descTextarea) {
      btnUseServiceDesc.addEventListener('click', function () {
        const canonical = getCanonicalServiceType(activityTypeSelect.value);
        const selected = availableRequestTypes.find(t => 
          t.name.toLowerCase() === activityTypeSelect.value.toLowerCase() ||
          t.name.toLowerCase() === canonical.toLowerCase()
        );
        if (selected && selected.description) {
          descTextarea.value = selected.description;
          clearError(descTextarea);
        }
      });
    }
  }

  function updateServiceCard(typeName) {
    const card = document.getElementById('serviceDetailCard');
    const cardTitle = document.getElementById('serviceCardTitle');
    const cardDesc = document.getElementById('serviceCardDesc');
    const cardSkills = document.getElementById('serviceCardSkills');
    const btnUseServiceDesc = document.getElementById('btnUseServiceDesc');

    if (!card || !typeName) {
      if (card) card.style.display = 'none';
      return;
    }

    const canonical = getCanonicalServiceType(typeName);
    const selected = availableRequestTypes.find(t => 
      t.name.toLowerCase() === typeName.toLowerCase() ||
      t.name.toLowerCase() === canonical.toLowerCase() ||
      t.name.toLowerCase().includes(typeName.toLowerCase()) ||
      typeName.toLowerCase().includes(t.name.toLowerCase())
    );

    if (!selected) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    if (cardTitle) cardTitle.textContent = selected.name;
    if (cardDesc) cardDesc.textContent = selected.description || 'Assistance and volunteer services organized under NSTP-CWTS.';

    if (btnUseServiceDesc) {
      btnUseServiceDesc.style.display = selected.description ? 'inline-flex' : 'none';
    }

    if (cardSkills) {
      const skills = Array.isArray(selected.required_skills) ? selected.required_skills : [];
      if (skills.length === 0) {
        cardSkills.innerHTML = '<span style="font-size: 0.75rem; color: #64748B; font-style: italic;">No specific skills required. Open to all students.</span>';
      } else {
        cardSkills.innerHTML = skills.map(skill => `
          <span class="preview-skill-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ${escapeHtml(skill)}
          </span>
        `).join('');
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  /**
   * Handles Form Submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const defaultLat = 14.2780;
    const defaultLng = 121.4170;
    const selectedTypeName = document.getElementById('activityType').value.trim();
    const selectedService = availableRequestTypes.find(t => t.name.toLowerCase() === selectedTypeName.toLowerCase());
    const requiredSkills = selectedService && Array.isArray(selectedService.required_skills) && selectedService.required_skills.length > 0
      ? selectedService.required_skills
      : [];

    const targetDate = document.getElementById('targetStartDate')?.value || '';
    const desc = document.getElementById('description')?.value?.trim() || '';

    const payload = {
      activity_title: document.getElementById('activityTitle').value.trim(),
      activity_type: selectedTypeName,
      activity_description: desc,
      description: desc,
      preferred_start_date: targetDate,
      target_start_date: targetDate,
      preferred_end_date: targetDate,
      target_end_date: targetDate,
      date: targetDate,
      community_name: document.getElementById('communityName')?.value?.trim() || 'Barangay Community',
      complete_address: document.getElementById('completeAddress')?.value?.trim() || 'Barangay Hall',
      community_address: document.getElementById('completeAddress')?.value?.trim() || 'Barangay Hall',
      barangay: document.getElementById('barangay')?.value?.trim() || 'Poblacion',
      municipality: document.getElementById('municipality')?.value?.trim() || 'Santa Cruz',
      province: document.getElementById('province')?.value?.trim() || 'Laguna',
      latitude: parseFloat(document.getElementById('latitude')?.value) || defaultLat,
      longitude: parseFloat(document.getElementById('longitude')?.value) || defaultLng,
      students_needed: parseInt(document.getElementById('studentsNeeded')?.value || 15, 10) || 15,
      estimated_hours: parseInt(document.getElementById('estimatedHours')?.value || 30, 10) || 30,
      skills_required: requiredSkills,
      needed_skills: requiredSkills,
      preferred_schedule: 'Flexible / As Scheduled',
      urgency_level: 'Medium',
      target_beneficiaries: 'Community Residents & Youth',
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