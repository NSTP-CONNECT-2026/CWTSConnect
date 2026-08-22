/**
 * CWTSConnect — NSTP Coordinator User Management Controller
 * Manages:
 *  - Tab Switching: Students vs Community Accounts
 *  - Fetching & Filtering Students Data
 *  - Fetching, Creating & Toggling Community Official Accounts
 *  - View Student Profile Modal & Create Official Modal
 *  - Section 12 Skeleton Loading System
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global State
  let allStudents = [];
  let allOfficials = [];

  // Tab Elements
  const tabStudents = document.getElementById('tabStudents');
  const tabCommunity = document.getElementById('tabCommunity');
  const paneStudents = document.getElementById('paneStudents');
  const paneCommunity = document.getElementById('paneCommunity');
  const tabStudentsCount = document.getElementById('tabStudentsCount');
  const tabCommunityCount = document.getElementById('tabCommunityCount');

  // Skeleton & Content
  const usersSkeleton = document.getElementById('usersSkeleton');
  const usersContent = document.getElementById('usersContent');

  // Student Filter Elements
  const studentSearchInput = document.getElementById('studentSearchInput');
  const studentCourseFilter = document.getElementById('studentCourseFilter');
  const studentProfileFilter = document.getElementById('studentProfileFilter');
  const studentAccountFilter = document.getElementById('studentAccountFilter');
  const clearStudentFiltersBtn = document.getElementById('clearStudentFiltersBtn');
  const studentsTable = document.getElementById('studentsTable');
  const studentsTableBody = document.getElementById('studentsTableBody');
  const studentsEmptyState = document.getElementById('studentsEmptyState');

  // Official Filter Elements
  const officialSearchInput = document.getElementById('officialSearchInput');
  const officialStatusFilter = document.getElementById('officialStatusFilter');
  const clearOfficialFiltersBtn = document.getElementById('clearOfficialFiltersBtn');
  const officialsTable = document.getElementById('officialsTable');
  const officialsTableBody = document.getElementById('officialsTableBody');
  const officialsEmptyState = document.getElementById('officialsEmptyState');

  // Modal Elements
  const openCreateOfficialModalBtn = document.getElementById('openCreateOfficialModalBtn');
  const createOfficialModal = document.getElementById('createOfficialModal');
  const createOfficialForm = document.getElementById('createOfficialForm');
  const studentDetailsModal = document.getElementById('studentDetailsModal');
  const studentModalBody = document.getElementById('studentModalBody');

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

  // Initialize Page
  init();

  async function init() {
    setupTabSwitching();
    setupFilters();
    setupModals();

    showLoading();
    await Promise.all([loadStudents(), loadOfficials()]);
    hideLoading();

    // Check URL query for tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'community') {
      switchTab('community');
    }
  }

  /**
   * Tab Switching Logic
   */
  function setupTabSwitching() {
    if (tabStudents) {
      tabStudents.addEventListener('click', () => switchTab('students'));
    }
    if (tabCommunity) {
      tabCommunity.addEventListener('click', () => switchTab('community'));
    }
  }

  function switchTab(tabName) {
    if (tabName === 'students') {
      tabStudents.classList.add('active');
      tabStudents.setAttribute('aria-selected', 'true');
      tabCommunity.classList.remove('active');
      tabCommunity.setAttribute('aria-selected', 'false');

      paneStudents.classList.add('active');
      paneCommunity.classList.remove('active');
    } else {
      tabCommunity.classList.add('active');
      tabCommunity.setAttribute('aria-selected', 'true');
      tabStudents.classList.remove('active');
      tabStudents.setAttribute('aria-selected', 'false');

      paneCommunity.classList.add('active');
      paneStudents.classList.remove('active');
    }
  }

  /**
   * Fetch Students Data
   */
  async function loadStudents() {
    try {
      const res = await fetch('/api/nstp/students', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const data = await res.json();
      allStudents = (data.success && Array.isArray(data.data)) ? data.data : [];

      updateStudentStats(allStudents);
      renderStudentsTable(allStudents);
    } catch (err) {
      console.error('Error loading students:', err);
      renderStudentsTable([]);
    }
  }

  function updateStudentStats(students) {
    const total = students.length;
    const completed = students.filter(s => s.student_profiles || s.profile_completed).length;
    const pending = total - completed;
    const deployed = students.filter(s => s.is_deployed || s.deployed).length;

    setText('totalStudentsCount', total);
    setText('completeProfilesCount', completed);
    setText('deployedStudentsCount', deployed);
    setText('pendingProfilesCount', pending);

    if (tabStudentsCount) tabStudentsCount.textContent = total;
  }

  /**
   * Fetch Community Officials Data
   */
  async function loadOfficials() {
    try {
      const res = await fetch('/api/nstp/community-officials', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const data = await res.json();
      allOfficials = (data.success && Array.isArray(data.data)) ? data.data : [];

      updateOfficialStats(allOfficials);
      renderOfficialsTable(allOfficials);
    } catch (err) {
      console.error('Error loading officials:', err);
      renderOfficialsTable([]);
    }
  }

  function updateOfficialStats(officials) {
    const total = officials.length;
    const active = officials.filter(o => o.is_active !== false).length;
    const pending = total - active;

    setText('totalOfficialsCount', total);
    setText('activePartnersCount', active);
    setText('verifiedCommunitiesCount', active);
    setText('pendingOfficialsCount', pending);

    if (tabCommunityCount) tabCommunityCount.textContent = total;
  }

  /**
   * Setup Filters
   */
  function setupFilters() {
    if (studentSearchInput) studentSearchInput.addEventListener('input', applyStudentFilters);
    if (studentCourseFilter) studentCourseFilter.addEventListener('change', applyStudentFilters);
    if (studentProfileFilter) studentProfileFilter.addEventListener('change', applyStudentFilters);
    if (studentAccountFilter) studentAccountFilter.addEventListener('change', applyStudentFilters);
    if (clearStudentFiltersBtn) {
      clearStudentFiltersBtn.addEventListener('click', () => {
        if (studentSearchInput) studentSearchInput.value = '';
        if (studentCourseFilter) studentCourseFilter.value = 'all';
        if (studentProfileFilter) studentProfileFilter.value = 'all';
        if (studentAccountFilter) studentAccountFilter.value = 'all';
        applyStudentFilters();
      });
    }

    if (officialSearchInput) officialSearchInput.addEventListener('input', applyOfficialFilters);
    if (officialStatusFilter) officialStatusFilter.addEventListener('change', applyOfficialFilters);
    if (clearOfficialFiltersBtn) {
      clearOfficialFiltersBtn.addEventListener('click', () => {
        if (officialSearchInput) officialSearchInput.value = '';
        if (officialStatusFilter) officialStatusFilter.value = 'all';
        applyOfficialFilters();
      });
    }
  }

  function applyStudentFilters() {
    const q = (studentSearchInput ? studentSearchInput.value : '').toLowerCase().trim();
    const course = studentCourseFilter ? studentCourseFilter.value : 'all';
    const profile = studentProfileFilter ? studentProfileFilter.value : 'all';
    const account = studentAccountFilter ? studentAccountFilter.value : 'all';

    const filtered = allStudents.filter(s => {
      const p = s.student_profiles || {};
      const name = (p.full_name || s.full_name || '').toLowerCase();
      const num = (p.student_number || s.student_number || '').toLowerCase();
      const email = (s.email || '').toLowerCase();

      const searchMatch = !q || name.includes(q) || num.includes(q) || email.includes(q);
      const courseMatch = course === 'all' || (p.course || '').toLowerCase() === course.toLowerCase();
      
      const hasProfile = Boolean(s.student_profiles || s.profile_completed);
      const profileMatch = profile === 'all' || (profile === 'completed' ? hasProfile : !hasProfile);
      const accountMatch = account === 'all' || (account === 'active' ? s.is_active !== false : s.is_active === false);

      return searchMatch && courseMatch && profileMatch && accountMatch;
    });

    renderStudentsTable(filtered);
  }

  function applyOfficialFilters() {
    const q = (officialSearchInput ? officialSearchInput.value : '').toLowerCase().trim();
    const status = officialStatusFilter ? officialStatusFilter.value : 'all';

    const filtered = allOfficials.filter(o => {
      const name = (o.full_name || '').toLowerCase();
      const comm = (o.community_name || o.organization_name || '').toLowerCase();
      const email = (o.email || '').toLowerCase();

      const searchMatch = !q || name.includes(q) || comm.includes(q) || email.includes(q);
      const statusMatch = status === 'all' || (status === 'active' ? o.is_active !== false : o.is_active === false);

      return searchMatch && statusMatch;
    });

    renderOfficialsTable(filtered);
  }

  /**
   * Render Students Table
   */
  function renderStudentsTable(students) {
    if (!studentsTableBody) return;

    if (!students || students.length === 0) {
      studentsTableBody.innerHTML = '';
      if (studentsTable) studentsTable.style.display = 'none';
      if (studentsEmptyState) studentsEmptyState.classList.remove('hidden');
      return;
    }

    if (studentsTable) studentsTable.style.display = 'table';
    if (studentsEmptyState) studentsEmptyState.classList.add('hidden');

    studentsTableBody.innerHTML = students.map(s => {
      const p = s.student_profiles || {};
      const name = escapeHtml(p.full_name || s.full_name || 'Student Enrollee');
      const studentNumber = escapeHtml(p.student_number || s.student_number || 'No ID');
      const email = escapeHtml(s.email || 'N/A');
      const course = escapeHtml(p.course || 'CWTS');
      const yearSection = `${escapeHtml(p.year_level || '1st Year')} • Section ${escapeHtml(p.section || '1')}`;
      const location = `${escapeHtml(p.barangay || '---')}, ${escapeHtml(p.municipality || '---')}`;
      const isActive = s.is_active !== false;
      const hasProfile = Boolean(s.student_profiles || s.profile_completed);
      const userId = s.user_id || s.id;

      // Extract skills
      let skills = [];
      if (Array.isArray(p.skills)) skills = p.skills;
      else if (typeof p.skills === 'string' && p.skills) skills = p.skills.split(',').map(x => x.trim()).filter(Boolean);

      const skillsSnippet = skills.length > 0 
        ? skills.slice(0, 2).map(sk => `<span class="skill-mini-pill">${escapeHtml(sk)}</span>`).join('') + (skills.length > 2 ? `<span class="skill-mini-pill">+${skills.length - 2}</span>` : '')
        : '<span class="user-sub-meta">No skills listed</span>';

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta">
              <span class="user-code-tag">${studentNumber}</span> • ${email}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${course}</div>
            <div class="user-sub-meta">${yearSection}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${location}</div>
            <div class="user-sub-meta">${escapeHtml(p.province || 'Philippines')}</div>
          </td>
          <td>
            <div class="skills-pills-cell">
              ${skillsSnippet}
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${isActive ? '<span class="badge badge-complete">Active</span>' : '<span class="badge badge-rejected">Inactive</span>'}
              ${hasProfile ? '<span class="badge badge-complete" style="font-size: 0.65rem;">Profile Complete</span>' : '<span class="badge badge-warning" style="font-size: 0.65rem;">Profile Incomplete</span>'}
            </div>
          </td>
          <td>
            <button type="button" class="action-btn-sm action-btn-view" onclick="window.viewStudentDetails('${escapeHtml(String(userId))}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <span>View Profile</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render Community Officials Table
   */
  function renderOfficialsTable(officials) {
    if (!officialsTableBody) return;

    if (!officials || officials.length === 0) {
      officialsTableBody.innerHTML = '';
      if (officialsTable) officialsTable.style.display = 'none';
      if (officialsEmptyState) officialsEmptyState.classList.remove('hidden');
      return;
    }

    if (officialsTable) officialsTable.style.display = 'table';
    if (officialsEmptyState) officialsEmptyState.classList.add('hidden');

    officialsTableBody.innerHTML = officials.map(o => {
      const name = escapeHtml(o.full_name || 'Community Leader');
      const email = escapeHtml(o.email || 'N/A');
      const contact = escapeHtml(o.contact_number || 'N/A');
      const position = escapeHtml(o.position || 'Community Representative');
      const community = escapeHtml(o.community_name || o.organization_name || 'Community Partner');
      const location = `${escapeHtml(o.barangay || '---')}, ${escapeHtml(o.municipality || '---')}`;
      const isActive = o.is_active !== false;
      const userId = o.user_id || o.id;

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta">${position} • ${email} • ${contact}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark);">${community}</div>
            <div class="user-sub-meta">CWTS Community Partner</div>
          </td>
          <td>
            <div style="font-weight: 500;">${location}</div>
            <div class="user-sub-meta">${escapeHtml(o.province || 'Philippines')}</div>
          </td>
          <td>
            ${isActive ? '<span class="badge badge-complete">Active Partner</span>' : '<span class="badge badge-rejected">Inactive</span>'}
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="action-btn-sm action-btn-status-toggle" onclick="window.toggleOfficialStatus('${escapeHtml(String(userId))}', ${!isActive})">
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * View Student Profile Modal Trigger
   */
  window.viewStudentDetails = async function (userId) {
    if (!studentDetailsModal || !studentModalBody) return;

    studentModalBody.innerHTML = '<div class="skeleton-card" style="padding: 24px; height: 180px;"></div>';
    studentDetailsModal.classList.add('active');

    try {
      const res = await fetch(`/api/nstp/students/${encodeURIComponent(userId)}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const s = data.data;
        const p = s.student_profiles || {};

        let skills = [];
        if (Array.isArray(p.skills)) skills = p.skills;
        else if (typeof p.skills === 'string' && p.skills) skills = p.skills.split(',').map(x => x.trim()).filter(Boolean);

        studentModalBody.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(226, 232, 240, 0.8); padding-bottom: 12px;">
              <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--cwts-primary-dark);">${escapeHtml(p.full_name || s.full_name || 'Student')}</h3>
                <span class="user-code-tag">${escapeHtml(p.student_number || 'N/A')}</span> • <span>${escapeHtml(s.email || '')}</span>
              </div>
              <span class="badge badge-complete">CWTS Student</span>
            </div>

            <div class="meta-list">
              <div class="meta-item"><span class="meta-label">Course & Year Level</span><span class="meta-value">${escapeHtml(p.course || '---')} - ${escapeHtml(p.year_level || '1st Year')} (Section ${escapeHtml(p.section || '1')})</span></div>
              <div class="meta-item"><span class="meta-label">Contact Number</span><span class="meta-value">${escapeHtml(p.contact_number || 'Not provided')}</span></div>
              <div class="meta-item"><span class="meta-label">Complete Address</span><span class="meta-value">${escapeHtml(p.complete_address || '---')}, ${escapeHtml(p.barangay || '')}, ${escapeHtml(p.municipality || '')}</span></div>
              <div class="meta-item"><span class="meta-label">Emergency Contact</span><span class="meta-value">${escapeHtml(p.emergency_contact_name || 'N/A')} (${escapeHtml(p.emergency_contact_number || 'N/A')})</span></div>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Skills & Competencies:</span>
              <div class="skills-tags-wrap" style="margin-top: 8px;">
                ${skills.length > 0 ? skills.map(sk => `<span class="skill-tag" style="cursor: default;">${escapeHtml(sk)}</span>`).join('') : '<span class="user-sub-meta">No specific skills encoded</span>'}
              </div>
            </div>
          </div>
        `;
      } else {
        studentModalBody.innerHTML = '<p style="color: #DC2626;">Unable to load student profile details.</p>';
      }
    } catch (err) {
      studentModalBody.innerHTML = '<p style="color: #DC2626;">Connection error while retrieving student data.</p>';
    }
  };

  window.closeStudentModal = function () {
    if (studentDetailsModal) studentDetailsModal.classList.remove('active');
  };

  /**
   * Modal Handlers for Create Community Account
   */
  function setupModals() {
    if (openCreateOfficialModalBtn) {
      openCreateOfficialModalBtn.addEventListener('click', () => {
        if (createOfficialForm) createOfficialForm.reset();
        if (createOfficialModal) createOfficialModal.classList.add('active');
      });
    }

    if (createOfficialForm) {
      createOfficialForm.addEventListener('submit', handleCreateOfficialSubmit);
    }
  }

  window.closeCreateOfficialModal = function () {
    if (createOfficialModal) createOfficialModal.classList.remove('active');
  };

  async function handleCreateOfficialSubmit(e) {
    e.preventDefault();

    const fullName = document.getElementById('newOfficialName').value.trim();
    const email = document.getElementById('newOfficialEmail').value.trim();
    const password = document.getElementById('newOfficialPassword').value;
    const contact = document.getElementById('newOfficialContact').value.trim();
    const position = document.getElementById('newOfficialPosition').value.trim();
    const community = document.getElementById('newOfficialCommunity').value.trim();
    const barangay = document.getElementById('newOfficialBarangay').value.trim();
    const municipality = document.getElementById('newOfficialMunicipality').value.trim();
    const province = document.getElementById('newOfficialProvince').value.trim();

    if (!fullName || !email || !password || !position || !community || !barangay || !municipality || !province) {
      showMessage('Please fill in all mandatory fields (*).', 'error');
      return;
    }

    const saveBtn = document.getElementById('btnSaveNewOfficial');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating Account...';

    try {
      const res = await fetch('/api/nstp/community-officials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          contact_number: contact,
          position: position,
          community_name: community,
          barangay: barangay,
          municipality: municipality,
          province: province
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage('Community Official Account created successfully!', 'success');
        closeCreateOfficialModal();
        await loadOfficials();
      } else {
        showMessage(data.message || 'Failed to create account.', 'error');
      }
    } catch (err) {
      console.error('Create official error:', err);
      showMessage('Network error. Unable to create official account.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Create Account';
    }
  }

  /**
   * Toggle Community Official Account Status
   */
  window.toggleOfficialStatus = async function (userId, targetStatus) {
    const actionName = targetStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionName} this community official account?`)) return;

    try {
      const res = await fetch(`/api/nstp/community-officials/${encodeURIComponent(userId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: targetStatus })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(`Account has been ${targetStatus ? 'activated' : 'deactivated'}.`, 'success');
        await loadOfficials();
      } else {
        showMessage(data.message || 'Unable to update account status.', 'error');
      }
    } catch (err) {
      showMessage('Network error while updating status.', 'error');
    }
  };

  function showLoading() {
    if (usersSkeleton) usersSkeleton.style.display = 'block';
    if (usersContent) usersContent.classList.add('hidden');
  }

  function hideLoading() {
    if (usersSkeleton) usersSkeleton.style.display = 'none';
    if (usersContent) usersContent.classList.remove('hidden');
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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
