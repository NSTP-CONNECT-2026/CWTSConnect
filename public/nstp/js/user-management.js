/**
 * CWTSConnect - NSTP Coordinator User Management Controller
 * Manages:
 *  - Tab Switching: Students Management vs Community Accounts Management
 *  - Fetching, Filtering, and Monitoring Students Data
 *  - Student Profile Inspection Modal & Account Activation/Deactivation
 *  - Fetching, Provisioning, Editing, and Toggling Community Official Accounts
 *  - Dynamic Course Filtering and Metrics Calculation
 *  - Section 12 Skeleton Loading System & Toast Alerts
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global State
  let allStudents = [];
  let allOfficials = [];

  // Undergraduate Programs (Strictly LSPU SC Undergraduate List)
  const UNDERGRADUATE_COURSES = [
    { abbr: 'BSA (Agri)', name: 'Bachelor of Science in Agriculture', aliases: ['bsa', 'bsagri', 'bs agri', 'agriculture'] },
    { abbr: 'BSAB', name: 'Bachelor of Science in Agricultural Business', aliases: ['bsab', 'agricultural business', 'agri business'] },
    { abbr: 'BSPsych', name: 'Bachelor of Science in Psychology', aliases: ['bspsych', 'bs psych', 'bsp', 'psychology'] },
    { abbr: 'BSOA', name: 'Bachelor of Science in Office Administration', aliases: ['bsoa', 'office administration'] },
    { abbr: 'BSBA', name: 'Bachelor of Science in Business Administration', aliases: ['bsba', 'business administration'] },
    { abbr: 'BSA (Acct)', name: 'Bachelor of Science in Accountancy', aliases: ['bsa', 'bsacct', 'bs acct', 'accountancy'] },
    { abbr: 'BSCS', name: 'Bachelor of Science in Computer Science', aliases: ['bscs', 'computer science'] },
    { abbr: 'BSIT', name: 'Bachelor of Science in Information Technology', aliases: ['bsit', 'information technology'] },
    { abbr: 'BSIS', name: 'Bachelor of Science in Information System', aliases: ['bsis', 'information system', 'information systems'] },
    { abbr: 'BSCrim', name: 'Bachelor of Science in Criminology', aliases: ['bscrim', 'bs crim', 'criminology', 'criminilogy'] },
    { abbr: 'BSABE', name: 'Bachelor of Science in Agricultural and Biosystems Engineering', aliases: ['bsabe', 'bsae', 'agricultural and biosystems engineering', 'biosystems engineering'] },
    { abbr: 'BSCpE', name: 'Bachelor of Science in Computer Engineering', aliases: ['bscpe', 'bsce', 'computer engineering'] },
    { abbr: 'BSME', name: 'Bachelor of Science in Mechanical Engineering', aliases: ['bsme', 'mechanical engineering'] },
    { abbr: 'BSIndTech', name: 'Bachelor of Science in Industrial Technology', aliases: ['bsindtech', 'bsitech', 'bsit-indtech', 'industrial technology'] },
    { abbr: 'BSHM', name: 'Bachelor of Science in Hospitality Management', aliases: ['bshm', 'hospitality management'] },
    { abbr: 'BSTM', name: 'Bachelor of Science in Tourism Management', aliases: ['bstm', 'tourism management'] },
    { abbr: 'BSED', name: 'Bachelor of Secondary Education', aliases: ['bsed', 'secondary education'] },
    { abbr: 'BEED', name: 'Bachelor of Elementary Education', aliases: ['beed', 'elementary education'] },
    { abbr: 'BECEd', name: 'Bachelor of Early Childhood Education', aliases: ['beced', 'early childhood education'] },
    { abbr: 'BPEd', name: 'Bachelor of Physical Education', aliases: ['bped', 'physical education'] },
    { abbr: 'BTVTEd', name: 'Bachelor of Technical - Vocational Teacher', aliases: ['btvted', 'btvte', 'technical - vocational teacher', 'technical vocational teacher'] },
    { abbr: 'BTLEd', name: 'Bachelor of Technology and Livelihood Education', aliases: ['btled', 'technology and livelihood education'] }
  ];

  function getCourseAbbreviation(courseStr) {
    if (!courseStr) return '---';
    const raw = String(courseStr).trim();
    const s = raw.toLowerCase();
    for (const c of UNDERGRADUATE_COURSES) {
      if (s === c.abbr.toLowerCase() || s === c.name.toLowerCase() || s.includes(c.name.toLowerCase())) {
        return c.abbr;
      }
      if (c.aliases.some(alias => s === alias || s.includes(alias))) {
        if (c.abbr === 'BSIT' && (s.includes('industrial') || s.includes('indtech'))) continue;
        if (c.abbr === 'BSIndTech' && (s.includes('information') && !s.includes('industrial'))) continue;
        if (c.abbr === 'BSA (Agri)' && (s.includes('accountancy') || s.includes('acct'))) continue;
        if (c.abbr === 'BSA (Acct)' && (s.includes('agriculture') || s.includes('agri'))) continue;
        return c.abbr;
      }
    }
    return raw;
  }

  function matchCourse(studentCourse, filterVal) {
    if (!filterVal || filterVal === 'all') return true;
    if (!studentCourse) return false;
    const s = String(studentCourse).toLowerCase().trim();
    const f = String(filterVal).toLowerCase().trim();
    if (s === f) return true;

    const courseConfig = UNDERGRADUATE_COURSES.find(c =>
      c.abbr.toLowerCase() === f ||
      c.name.toLowerCase() === f ||
      c.aliases.includes(f)
    );

    if (courseConfig) {
      if (s === courseConfig.abbr.toLowerCase() || s === courseConfig.name.toLowerCase() || s.includes(courseConfig.name.toLowerCase())) {
        return true;
      }
      if (courseConfig.aliases.some(alias => s === alias || s.includes(alias))) {
        if (courseConfig.abbr === 'BSIT' && (s.includes('industrial') || s.includes('indtech'))) return false;
        if (courseConfig.abbr === 'BSIndTech' && (s.includes('information') && !s.includes('industrial'))) return false;
        if (courseConfig.abbr === 'BSA (Agri)' && (s.includes('accountancy') || s.includes('acct'))) return false;
        if (courseConfig.abbr === 'BSA (Acct)' && (s.includes('agriculture') || s.includes('agri'))) return false;
        return true;
      }
    }

    return s.includes(f) || f.includes(s);
  }

  function matchYear(studentYear, filterVal) {
    if (!filterVal || filterVal === 'all') return true;
    if (!studentYear) return false;
    const yStr = String(studentYear).toLowerCase().trim();
    const fStr = String(filterVal).toLowerCase().trim();
    if (yStr === fStr) return true;
    if (fStr === '1') return yStr.includes('1') || yStr.includes('first');
    if (fStr === '2') return yStr.includes('2') || yStr.includes('second');
    if (fStr === '3') return yStr.includes('3') || yStr.includes('third');
    if (fStr === '4') return yStr.includes('4') || yStr.includes('fourth');
    return yStr.includes(fStr);
  }

  function matchSection(studentSection, filterVal) {
    if (!filterVal || filterVal === 'all') return true;
    if (!studentSection) return false;
    const sStr = String(studentSection).trim();
    const fStr = String(filterVal).trim().toUpperCase();
    if (sStr.toUpperCase() === fStr) return true;
    const pattern = new RegExp('(?:^|[^a-zA-Z])' + fStr + '(?:[^a-zA-Z]|$)', 'i');
    return pattern.test(sStr);
  }

  // Tab Elements
  const tabStudents = document.getElementById('tabStudents');
  const tabCommunity = document.getElementById('tabCommunity');
  const paneStudents = document.getElementById('paneStudents');
  const paneCommunity = document.getElementById('paneCommunity');
  const tabStudentsCount = document.getElementById('tabStudentsCount');
  const tabCommunityCount = document.getElementById('tabCommunityCount');

  // Skeleton & Content Containers
  const usersSkeleton = document.getElementById('usersSkeleton');
  const usersContent = document.getElementById('usersContent');

  // Student Filter Elements
  const studentSearchInput = document.getElementById('studentSearchInput');
  const studentCourseFilter = document.getElementById('studentCourseFilter');
  const studentYearFilter = document.getElementById('studentYearFilter');
  const studentSectionFilter = document.getElementById('studentSectionFilter');
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

  // Modals
  const openCreateOfficialModalBtn = document.getElementById('openCreateOfficialModalBtn');
  const createOfficialModal = document.getElementById('createOfficialModal');
  const createOfficialForm = document.getElementById('createOfficialForm');

  const editOfficialModal = document.getElementById('editOfficialModal');
  const editOfficialForm = document.getElementById('editOfficialForm');

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

    // Check URL query for tab navigation
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
      allStudents = (data.success && (Array.isArray(data.data) ? data.data : Array.isArray(data.students) ? data.students : [])) || [];

      populateCourseOptions(allStudents);
      updateStudentStats(allStudents);
      applyStudentFilters();
    } catch (err) {
      console.error('Error loading students:', err);
      allStudents = [];
      updateStudentStats([]);
      renderStudentsTable([]);
    }
  }

  /**
   * Populate course filter dropdown strictly with abbreviated undergraduate courses
   */
  function populateCourseOptions() {
    if (!studentCourseFilter) return;

    const currentVal = studentCourseFilter.value;

    studentCourseFilter.innerHTML = '<option value="all">All Courses</option>' +
      UNDERGRADUATE_COURSES.map(c => `<option value="${escapeHtml(c.abbr)}" title="${escapeHtml(c.name)}">${escapeHtml(c.abbr)}</option>`).join('');

    if (currentVal && (currentVal === 'all' || UNDERGRADUATE_COURSES.some(c => c.abbr === currentVal))) {
      studentCourseFilter.value = currentVal;
    } else {
      studentCourseFilter.value = 'all';
    }
  }

  function updateStudentStats(students) {
    const total = students.length;
    const completed = students.filter(s => {
      const p = s.student_profiles || {};
      return s.profile_completed || Boolean(p.full_name || s.full_name);
    }).length;
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
      allOfficials = (data.success && (Array.isArray(data.data) ? data.data : Array.isArray(data.officials) ? data.officials : [])) || [];

      updateOfficialStats(allOfficials);
      applyOfficialFilters();
    } catch (err) {
      console.error('Error loading officials:', err);
      allOfficials = [];
      updateOfficialStats([]);
      renderOfficialsTable([]);
    }
  }

  function updateOfficialStats(officials) {
    const total = officials.length;
    const active = officials.filter(o => o.is_active !== false && o.account_status !== 'inactive').length;
    const pending = total - active;

    // Unique communities represented
    const uniqueCommunities = new Set();
    officials.forEach(o => {
      const name = (o.community_name || o.barangay || '').trim();
      if (name) uniqueCommunities.add(name);
    });

    setText('totalOfficialsCount', total);
    setText('activePartnersCount', active);
    setText('verifiedCommunitiesCount', uniqueCommunities.size || active);
    setText('pendingOfficialsCount', pending);

    if (tabCommunityCount) tabCommunityCount.textContent = total;
  }

  /**
   * Setup Filters
   */
  function setupFilters() {
    // Collapsible Filter Panels
    const toggleStudentFiltersBtn = document.getElementById('toggleStudentFiltersBtn');
    const studentFilterPanel = document.getElementById('studentFilterPanel');
    const studentFilterActiveDot = document.getElementById('studentFilterActiveDot');

    const toggleOfficialFiltersBtn = document.getElementById('toggleOfficialFiltersBtn');
    const officialFilterPanel = document.getElementById('officialFilterPanel');
    const officialFilterActiveDot = document.getElementById('officialFilterActiveDot');

    if (toggleStudentFiltersBtn && studentFilterPanel) {
      toggleStudentFiltersBtn.addEventListener('click', function () {
        const isOpen = studentFilterPanel.classList.toggle('open');
        toggleStudentFiltersBtn.classList.toggle('active', isOpen);
        toggleStudentFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    if (toggleOfficialFiltersBtn && officialFilterPanel) {
      toggleOfficialFiltersBtn.addEventListener('click', function () {
        const isOpen = officialFilterPanel.classList.toggle('open');
        toggleOfficialFiltersBtn.classList.toggle('active', isOpen);
        toggleOfficialFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    if (studentSearchInput) studentSearchInput.addEventListener('input', applyStudentFilters);
    if (studentCourseFilter) studentCourseFilter.addEventListener('change', applyStudentFilters);
    if (studentYearFilter) studentYearFilter.addEventListener('change', applyStudentFilters);
    if (studentSectionFilter) studentSectionFilter.addEventListener('change', applyStudentFilters);
    if (studentAccountFilter) studentAccountFilter.addEventListener('change', applyStudentFilters);
    if (clearStudentFiltersBtn) {
      clearStudentFiltersBtn.addEventListener('click', () => {
        if (studentSearchInput) studentSearchInput.value = '';
        if (studentCourseFilter) studentCourseFilter.value = 'all';
        if (studentYearFilter) studentYearFilter.value = 'all';
        if (studentSectionFilter) studentSectionFilter.value = 'all';
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

  function updateStudentFilterActiveDot() {
    const dot = document.getElementById('studentFilterActiveDot');
    if (!dot) return;
    const courseVal = studentCourseFilter ? studentCourseFilter.value : 'all';
    const yearVal = studentYearFilter ? studentYearFilter.value : 'all';
    const sectionVal = studentSectionFilter ? studentSectionFilter.value : 'all';
    const accountVal = studentAccountFilter ? studentAccountFilter.value : 'all';
    const hasActiveFilters = courseVal !== 'all' || yearVal !== 'all' || sectionVal !== 'all' || accountVal !== 'all';
    dot.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }

  function updateOfficialFilterActiveDot() {
    const dot = document.getElementById('officialFilterActiveDot');
    if (!dot) return;
    const statusVal = officialStatusFilter ? officialStatusFilter.value : 'all';
    const hasActiveFilters = statusVal !== 'all';
    dot.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }

  function applyStudentFilters() {
    const q = (studentSearchInput ? studentSearchInput.value : '').toLowerCase().trim();
    const course = studentCourseFilter ? studentCourseFilter.value : 'all';
    const year = studentYearFilter ? studentYearFilter.value : 'all';
    const section = studentSectionFilter ? studentSectionFilter.value : 'all';
    const account = studentAccountFilter ? studentAccountFilter.value : 'all';

    const filtered = allStudents.filter(s => {
      const p = s.student_profiles || {};
      const name = (p.full_name || s.full_name || '').toLowerCase();
      const num = (p.student_number || s.student_number || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const stCourse = (p.course || s.course || '').toLowerCase();
      const brgy = (p.barangay || s.barangay || '').toLowerCase();
      const mun = (p.municipality || s.municipality || '').toLowerCase();

      // Check skills text match
      let skillsStr = '';
      if (Array.isArray(p.skills || s.skills)) skillsStr = (p.skills || s.skills).join(' ').toLowerCase();
      else if (typeof (p.skills || s.skills) === 'string') skillsStr = (p.skills || s.skills).toLowerCase();

      const searchMatch = !q || name.includes(q) || num.includes(q) || email.includes(q) || stCourse.includes(q) || brgy.includes(q) || mun.includes(q) || skillsStr.includes(q);
      
      const courseMatch = matchCourse(p.course || s.course, course);
      const yearMatch = matchYear(p.year_level || s.year_level, year);
      const sectionMatch = matchSection(p.section || s.section, section);

      const isActive = s.account_status !== 'inactive' && s.is_active !== false;
      const accountMatch = account === 'all' || (account === 'active' ? isActive : !isActive);

      return searchMatch && courseMatch && yearMatch && sectionMatch && accountMatch;
    });

    updateStudentFilterActiveDot();
    renderStudentsTable(filtered);
  }

  function applyOfficialFilters() {
    const q = (officialSearchInput ? officialSearchInput.value : '').toLowerCase().trim();
    const status = officialStatusFilter ? officialStatusFilter.value : 'all';

    const filtered = allOfficials.filter(o => {
      const name = (o.full_name || '').toLowerCase();
      const comm = (o.community_name || '').toLowerCase();
      const email = (o.email || '').toLowerCase();
      const position = (o.position || '').toLowerCase();
      const brgy = (o.barangay || '').toLowerCase();
      const mun = (o.municipality || '').toLowerCase();

      const searchMatch = !q || name.includes(q) || comm.includes(q) || email.includes(q) || position.includes(q) || brgy.includes(q) || mun.includes(q);
      
      const isActive = o.account_status !== 'inactive' && o.is_active !== false;
      const statusMatch = status === 'all' || (status === 'active' ? isActive : !isActive);

      return searchMatch && statusMatch;
    });

    updateOfficialFilterActiveDot();
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
      const name = escapeHtml(p.full_name || s.full_name || 'Student Volunteer');
      const studentNumber = escapeHtml(p.student_number || s.student_number || 'No ID');
      const email = escapeHtml(s.email || 'N/A');
      const rawCourse = p.course || s.course || 'BSIT';
      const courseAbbr = escapeHtml(getCourseAbbreviation(rawCourse));
      const courseFull = escapeHtml(rawCourse);
      const yearSection = `${escapeHtml(p.year_level || s.year_level || '1st Year')} • Section ${escapeHtml(p.section || s.section || '1')}`;
      const location = `${escapeHtml(p.barangay || s.barangay || '---')}, ${escapeHtml(p.municipality || s.municipality || '---')}`;
      const province = escapeHtml(p.province || s.province || 'Laguna');

      const isActive = s.account_status !== 'inactive' && s.is_active !== false;
      const userId = s.user_id || s.id;

      return `
        <tr class="clickable-row" onclick="window.viewStudentDetails('${escapeHtml(String(userId))}')" title="Click row to view profile details">
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta">
              <span class="user-code-tag">${studentNumber}</span> • ${email}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);" title="${courseFull}">${courseAbbr}</div>
            <div class="user-sub-meta">${yearSection}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${location}</div>
            <div class="user-sub-meta">${province}</div>
          </td>
          <td>
            ${isActive ? '<span class="badge badge-complete">Active</span>' : '<span class="badge badge-rejected">Inactive</span>'}
          </td>
          <td>
            <div class="table-actions" style="display: flex; gap: 6px; align-items: center;">
              <button type="button" class="action-btn-sm action-btn-status-toggle" onclick="event.stopPropagation(); window.toggleStudentStatus('${escapeHtml(String(userId))}', ${isActive})" title="${isActive ? 'Deactivate Account' : 'Activate Account'}">
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
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
      const name = escapeHtml(o.full_name || o.community_name || 'Community Partner');
      const email = escapeHtml(o.email || 'N/A');
      const contact = escapeHtml(o.contact_number || 'N/A');
      const community = escapeHtml(o.community_name || 'Community Partner');
      const location = `${escapeHtml(o.barangay || '---')}, ${escapeHtml(o.municipality || '---')}`;
      const province = escapeHtml(o.province || 'Laguna');
      const coords = (o.latitude && o.longitude) ? `${Number(o.latitude).toFixed(4)}, ${Number(o.longitude).toFixed(4)}` : '';

      const isActive = o.account_status !== 'inactive' && o.is_active !== false;
      const userId = o.user_id || o.id;

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta">${email}${contact !== 'N/A' && contact ? ` • ${contact}` : ''}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark);">${community}</div>
            <div class="user-sub-meta">CWTS Community Partner</div>
          </td>
          <td>
            <div style="font-weight: 500;">${location}</div>
            <div class="user-sub-meta">${province}${coords ? ` • Pin: ${coords}` : ''}</div>
          </td>
          <td>
            ${isActive ? '<span class="badge badge-complete">Active Partner</span>' : '<span class="badge badge-rejected">Inactive</span>'}
          </td>
          <td>
            <div class="table-actions" style="display: flex; gap: 6px; align-items: center;">
              <button type="button" class="action-btn-sm action-btn-view" onclick="window.openEditOfficialModal('${escapeHtml(String(userId))}')" title="Edit Official Details">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button type="button" class="action-btn-sm action-btn-status-toggle" onclick="window.toggleOfficialStatus('${escapeHtml(String(userId))}', ${isActive})" title="${isActive ? 'Deactivate Account' : 'Activate Account'}">
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

    studentModalBody.innerHTML = '<div class="skeleton-card" style="padding: 24px; height: 220px;"></div>';
    studentDetailsModal.classList.add('active');

    try {
      const res = await fetch(`/api/nstp/students/${encodeURIComponent(userId)}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.success && (data.data || data.student)) {
        const s = data.data || data.student;
        const p = s.student_profiles || s;

        let rawSkills = p.skills || s.skills || [];
        let skills = [];
        if (Array.isArray(rawSkills)) skills = rawSkills;
        else if (typeof rawSkills === 'string' && rawSkills) skills = rawSkills.split(',').map(x => x.trim()).filter(Boolean);

        let coordsDisplay = 'Not pinned';
        if (p.latitude && p.longitude) {
          coordsDisplay = `Lat: ${parseFloat(p.latitude).toFixed(6)}, Lng: ${parseFloat(p.longitude).toFixed(6)}`;
        } else if (p.location && typeof p.location === 'string' && p.location.includes(',')) {
          const parts = p.location.split(',');
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coordsDisplay = `Lat: ${parseFloat(parts[0]).toFixed(6)}, Lng: ${parseFloat(parts[1]).toFixed(6)}`;
          }
        }

        const isActive = s.account_status !== 'inactive' && s.is_active !== false;
        const isCompliant = s.cmo_compliance_status === 'compliant';
        const totalHours = Number(s.total_hours_rendered || 0).toFixed(1);
        const totalDeployments = s.total_deployments_count || 0;

        studentModalBody.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(226, 232, 240, 0.8); padding-bottom: 12px;">
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--cwts-primary-dark); margin: 0 0 4px 0;">
                  ${escapeHtml(p.full_name || s.full_name || 'Student Volunteer')}
                </h3>
                <span class="user-code-tag">${escapeHtml(p.student_number || s.student_number || 'N/A')}</span>
                <span style="margin: 0 6px; color: var(--text-muted);">•</span>
                <span style="font-size: 0.8125rem; color: var(--text-muted);">${escapeHtml(s.email || '')}</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <span class="badge ${isActive ? 'badge-complete' : 'badge-rejected'}">${isActive ? 'Active' : 'Inactive'}</span>
                <span class="badge badge-complete">${escapeHtml(p.nstp_component || s.nstp_component || 'CWTS')}</span>
              </div>
            </div>

            <div class="meta-list">
              <div class="meta-item">
                <span class="meta-label">Course & Year Level</span>
                <span class="meta-value">${escapeHtml(p.course || s.course || '---')} - ${escapeHtml(p.year_level || s.year_level || '1st Year')} (Section ${escapeHtml(p.section || s.section || '1')})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Contact Number</span>
                <span class="meta-value">${escapeHtml(p.contact_number || s.contact_number || 'Not provided')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Complete Address</span>
                <span class="meta-value">${escapeHtml(p.complete_address || s.complete_address || '---')}, ${escapeHtml(p.barangay || s.barangay || '')}, ${escapeHtml(p.municipality || s.municipality || '')}, ${escapeHtml(p.province || s.province || 'Laguna')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">GPS Coordinates</span>
                <span class="meta-value" style="font-family: monospace; color: #047857; font-weight: 600;">${escapeHtml(coordsDisplay)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Emergency Contact</span>
                <span class="meta-value">${escapeHtml(p.emergency_contact_name || s.emergency_contact_name || 'N/A')} (${escapeHtml(p.emergency_contact_number || s.emergency_contact_number || 'N/A')}) • ${escapeHtml(p.emergency_contact_relationship || s.emergency_contact_relationship || '')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">CMO Compliance</span>
                <span class="meta-value">
                  <span class="badge ${isCompliant ? 'badge-complete' : 'badge-warning'}">${escapeHtml(s.cmo_compliance_status || 'Incomplete')}</span>
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Fieldwork Summary</span>
                <span class="meta-value" style="font-weight: 600; color: var(--cwts-primary-dark);">${totalHours} Total Hours Rendered • ${totalDeployments} Deployment(s)</span>
              </div>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Skills & Competencies:</span>
              <div class="skills-tags-wrap" style="margin-top: 8px;">
                ${skills.length > 0 ? skills.map(sk => `<span class="skill-tag" style="cursor: default;">${escapeHtml(sk)}</span>`).join('') : '<span class="user-sub-meta">No specific skills encoded</span>'}
              </div>
            </div>

            <div style="border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="user-sub-meta">Account Moderation:</span>
              </div>
              <button type="button" class="btn ${isActive ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="window.toggleStudentStatus('${escapeHtml(String(s.user_id))}', ${isActive})">
                ${isActive ? 'Deactivate Student Account' : 'Activate Student Account'}
              </button>
            </div>
          </div>
        `;
      } else {
        studentModalBody.innerHTML = '<p style="color: #DC2626; padding: 20px;">Unable to load student profile details.</p>';
      }
    } catch (err) {
      console.error('Error fetching student profile details:', err);
      studentModalBody.innerHTML = '<p style="color: #DC2626; padding: 20px;">Connection error while retrieving student data.</p>';
    }
  };

  window.closeStudentModal = function () {
    if (studentDetailsModal) studentDetailsModal.classList.remove('active');
  };

  /**
   * Toggle Student Account Status
   */
  window.toggleStudentStatus = async function (userId, currentIsActive) {
    const actionName = currentIsActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionName} this student account?`)) return;

    try {
      const res = await fetch(`/api/nstp/students/${encodeURIComponent(userId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_status: currentIsActive ? 'inactive' : 'active',
          is_active: !currentIsActive
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(`Student account successfully ${currentIsActive ? 'deactivated' : 'activated'}.`, 'success');
        closeStudentModal();
        await loadStudents();
      } else {
        showMessage(data.message || 'Unable to update student status.', 'error');
      }
    } catch (err) {
      console.error('Error updating student status:', err);
      showMessage('Network error while updating student status.', 'error');
    }
  };

  /**
   * Toggle Community Official Account Status
   */
  window.toggleOfficialStatus = async function (userId, currentIsActive) {
    const actionName = currentIsActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionName} this community official account?`)) return;

    try {
      const res = await fetch(`/api/nstp/community-officials/${encodeURIComponent(userId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_status: currentIsActive ? 'inactive' : 'active',
          is_active: !currentIsActive
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(`Account has been ${currentIsActive ? 'deactivated' : 'activated'}.`, 'success');
        await loadOfficials();
      } else {
        showMessage(data.message || 'Unable to update account status.', 'error');
      }
    } catch (err) {
      console.error('Error toggling official status:', err);
      showMessage('Network error while updating status.', 'error');
    }
  };

  /**
   * Modal Handlers & Leaflet Map for Community Location
   */
  let officialMap = null;
  let officialMarker = null;

  function safeText(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fixLeafletDefaultIcons() {
    if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
    }
  }

  function initOfficialMap() {
    const mapEl = document.getElementById('officialMap');
    if (!mapEl || typeof L === 'undefined') return;

    fixLeafletDefaultIcons();

    if (officialMap) {
      officialMap.invalidateSize(true);
      return;
    }

    // Default center: Laguna, Philippines (Santa Cruz center: 14.2789, 121.4172)
    const defaultCoords = [14.2789, 121.4172];

    // 1. ESRI World Street Map (High detail, clear street and barangay names, no 403 blocking)
    const esriStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Street Map'
    });

    // 2. ESRI World Imagery (Satellite)
    const esriSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Satellite'
    });

    // 3. ESRI Topographic Map
    const esriTopoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Topo Map'
    });

    officialMap = L.map('officialMap', {
      center: defaultCoords,
      zoom: 14,
      layers: [esriStreetLayer],
      zoomControl: true,
      scrollWheelZoom: true
    });

    L.control.layers({
      'Detailed Street Map (Esri)': esriStreetLayer,
      'Satellite View (Esri)': esriSatLayer,
      'Topographic Map (Esri)': esriTopoLayer
    }, null, { position: 'topright' }).addTo(officialMap);

    officialMarker = L.marker(defaultCoords, {
      draggable: true,
      autoPan: true
    }).addTo(officialMap);

    officialMarker.bindPopup('<strong>Pin Location</strong><br><small style="color:#64748B;">Drag pin or click map to select barangay</small>');

    officialMarker.on('dragend', function () {
      const pos = officialMarker.getLatLng();
      setOfficialMapLocation(pos.lat, pos.lng, true);
    });

    officialMap.on('click', function (e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      officialMarker.setLatLng([lat, lng]);
      setOfficialMapLocation(lat, lng, true);
    });

    // ResizeObserver ensures map tiles are immediately requested when modal opens or resizes
    if (window.ResizeObserver && mapEl) {
      const ro = new ResizeObserver(() => {
        if (officialMap) {
          officialMap.invalidateSize(true);
        }
      });
      ro.observe(mapEl);
    }

    const searchInput = document.getElementById('officialLocationSearch');
    const searchBtn = document.getElementById('btnOfficialSearchMap');
    const locateBtn = document.getElementById('btnOfficialLocateMe');

    if (searchBtn) {
      searchBtn.addEventListener('click', searchOfficialLocation);
    }
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchOfficialLocation();
        }
      });
    }
    if (locateBtn) {
      locateBtn.addEventListener('click', getOfficialCurrentLocation);
    }
  }

  function setOfficialMapLocation(lat, lng, doReverseGeocode = true) {
    const latField = document.getElementById('newOfficialLatitude');
    const lngField = document.getElementById('newOfficialLongitude');
    const coordsText = document.getElementById('officialCoordsText');
    const coordsStatus = document.getElementById('officialCoordsStatus');

    if (latField) latField.value = lat.toFixed(6);
    if (lngField) lngField.value = lng.toFixed(6);

    if (coordsText) {
      coordsText.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    if (coordsStatus) {
      coordsStatus.textContent = 'Exact Coordinates Pinned';
      coordsStatus.style.background = '#DCFCE7';
      coordsStatus.style.color = '#15803D';
    }

    if (officialMarker) {
      officialMarker.setLatLng([lat, lng]);
    }
    if (officialMap) {
      officialMap.panTo([lat, lng]);
      officialMap.invalidateSize(true);
    }

    if (doReverseGeocode) {
      reverseGeocodeOfficial(lat, lng);
    }
  }

  async function reverseGeocodeOfficial(lat, lng) {
    const coordsStatus = document.getElementById('officialCoordsStatus');
    if (coordsStatus) {
      coordsStatus.textContent = 'Identifying Location...';
      coordsStatus.style.background = '#EFF6FF';
      coordsStatus.style.color = '#1D4ED8';
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();

      if (data && data.address) {
        applyOfficialNominatimAddress(data);
        if (coordsStatus) {
          coordsStatus.textContent = 'Exact Coordinates Pinned';
          coordsStatus.style.background = '#DCFCE7';
          coordsStatus.style.color = '#15803D';
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      if (coordsStatus) {
        coordsStatus.textContent = 'Coordinates Saved';
        coordsStatus.style.background = '#FEF3C7';
        coordsStatus.style.color = '#92400E';
      }
    }
  }

  function applyOfficialNominatimAddress(data) {
    const addr = data.address || {};

    const rawBarangay = addr.village || 
                        addr.suburb || 
                        addr.neighbourhood || 
                        addr.quarter || 
                        addr.city_district || 
                        addr.residential ||
                        addr.hamlet || '';

    let municipality = addr.city || 
                       addr.town || 
                       addr.municipality || 
                       addr.county || '';

    let province = addr.province || 
                   addr.state || 
                   addr.region || 'Laguna';

    // Normalize NCR / Metro Manila
    if (province.includes('National Capital') || province.includes('NCR') || province.toLowerCase().includes('manila')) {
      province = 'Metro Manila';
    }

    // Format Barangay string without duplicate "Barangay" prefix
    let cleanBarangay = rawBarangay.replace(/^Barangay\s+/i, '').replace(/^Brgy\.?\s+/i, '').trim();
    if (!cleanBarangay && addr.road) cleanBarangay = addr.road;

    // Clean up municipality/city name
    if (municipality && !municipality.toLowerCase().includes('city') && (province === 'Metro Manila' || municipality === 'Pasig' || municipality === 'Taguig' || municipality === 'Makati' || municipality === 'Mandaluyong' || municipality === 'Caloocan' || municipality === 'Marikina' || municipality === 'Valenzuela' || municipality === 'Muntinlupa' || municipality === 'Paranaque' || municipality === 'Las Pinas' || municipality === 'San Juan' || municipality === 'Navotas' || municipality === 'Malabon')) {
      municipality = `${municipality} City`;
    }

    let communityName = '';
    if (cleanBarangay) {
      communityName = `Barangay ${cleanBarangay}`;
      if (municipality) {
        communityName += ` ${municipality}`;
      }
    } else if (municipality) {
      communityName = `Barangay ${municipality}`;
    } else {
      communityName = data.display_name ? data.display_name.split(',')[0].trim() : 'Barangay Community';
    }

    const commInput = document.getElementById('newOfficialCommunity');
    const brgyInput = document.getElementById('newOfficialBarangay');
    const munInput = document.getElementById('newOfficialMunicipality');
    const provInput = document.getElementById('newOfficialProvince');
    const searchInput = document.getElementById('officialLocationSearch');

    if (commInput) commInput.value = communityName;
    if (brgyInput) brgyInput.value = cleanBarangay || 'Poblacion';
    if (munInput) munInput.value = municipality;
    if (provInput) provInput.value = province;
    if (searchInput && data.display_name) searchInput.value = data.display_name;

    if (officialMarker) {
      const popupHtml = `<div style="font-family:sans-serif; font-size:12px; line-height:1.4;">
        <strong style="color:#0F172A;">${safeText(communityName)}</strong><br>
        <span style="color:#475569;">${safeText(cleanBarangay ? 'Barangay ' + cleanBarangay + ', ' : '')}${safeText(municipality ? municipality + ', ' : '')}${safeText(province)}</span>
      </div>`;
      officialMarker.bindPopup(popupHtml).openPopup();
    }
  }

  async function searchOfficialLocation() {
    const searchInput = document.getElementById('officialLocationSearch');
    const query = searchInput ? searchInput.value.trim() : '';
    if (!query) return;

    const searchBtn = document.getElementById('btnOfficialSearchMap');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = 'Searching...';
    }

    try {
      let q = query;
      if (!q.toLowerCase().includes('philippines')) {
        q += ', Philippines';
      }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=ph`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();

      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (officialMap) {
          officialMap.setView([lat, lng], 16);
          officialMap.invalidateSize(true);
        }
        setOfficialMapLocation(lat, lng, false);
        applyOfficialNominatimAddress(item);
      } else {
        showMessage('Location not found. Try searching by barangay and municipality (e.g. San Antonio, Pasig City or Santa Cruz, Laguna).', 'error');
      }
    } catch (err) {
      console.error('Map search error:', err);
      showMessage('Map search service unavailable. You can click directly on the map to pin.', 'error');
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
      }
    }
  }

  function getOfficialCurrentLocation() {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.', 'error');
      return;
    }

    const locateBtn = document.getElementById('btnOfficialLocateMe');
    if (locateBtn) {
      locateBtn.disabled = true;
      locateBtn.textContent = 'Locating...';
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (officialMap) {
          officialMap.setView([lat, lng], 16);
          officialMap.invalidateSize(true);
        }
        setOfficialMapLocation(lat, lng, true);
        if (locateBtn) {
          locateBtn.disabled = false;
          locateBtn.textContent = 'Locate';
        }
      },
      (err) => {
        showMessage('Unable to retrieve current location: ' + err.message, 'error');
        if (locateBtn) {
          locateBtn.disabled = false;
          locateBtn.textContent = 'Locate';
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function setupPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const eyeShow = this.querySelector('.eye-show');
        const eyeHide = this.querySelector('.eye-hide');

        if (input.type === 'password') {
          input.type = 'text';
          if (eyeShow) eyeShow.style.display = 'none';
          if (eyeHide) eyeHide.style.display = 'inline-block';
          this.setAttribute('aria-label', 'Hide password');
        } else {
          input.type = 'password';
          if (eyeShow) eyeShow.style.display = 'inline-block';
          if (eyeHide) eyeHide.style.display = 'none';
          this.setAttribute('aria-label', 'Show password');
        }
      });
    });
  }

  function resetPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) input.type = 'password';
      const eyeShow = btn.querySelector('.eye-show');
      const eyeHide = btn.querySelector('.eye-hide');
      if (eyeShow) eyeShow.style.display = 'inline-block';
      if (eyeHide) eyeHide.style.display = 'none';
      btn.setAttribute('aria-label', 'Show password');
    });
  }

  function setupModals() {
    setupPasswordToggles();

    if (openCreateOfficialModalBtn) {
      openCreateOfficialModalBtn.addEventListener('click', () => {
        if (createOfficialForm) createOfficialForm.reset();
        resetPasswordToggles();

        const latField = document.getElementById('newOfficialLatitude');
        const lngField = document.getElementById('newOfficialLongitude');
        const coordsText = document.getElementById('officialCoordsText');
        const coordsStatus = document.getElementById('officialCoordsStatus');

        if (latField) latField.value = '';
        if (lngField) lngField.value = '';
        if (coordsText) coordsText.textContent = 'Click or search on map to pin location';
        if (coordsStatus) {
          coordsStatus.textContent = 'Pending Pin';
          coordsStatus.style.background = '#FEF3C7';
          coordsStatus.style.color = '#92400E';
        }

        if (createOfficialModal) createOfficialModal.classList.add('active');

        // Immediately initialize or re-render map with multiple invalidation timings
        initOfficialMap();
        setTimeout(() => {
          if (officialMap) officialMap.invalidateSize(true);
        }, 60);
        setTimeout(() => {
          if (officialMap) officialMap.invalidateSize(true);
        }, 200);
        setTimeout(() => {
          if (officialMap) officialMap.invalidateSize(true);
        }, 450);
      });
    }

    if (createOfficialForm) {
      createOfficialForm.addEventListener('submit', handleCreateOfficialSubmit);
    }

    if (editOfficialForm) {
      editOfficialForm.addEventListener('submit', handleEditOfficialSubmit);
    }
  }

  window.closeCreateOfficialModal = function () {
    if (createOfficialModal) createOfficialModal.classList.remove('active');
    resetPasswordToggles();
  };

  window.closeEditOfficialModal = function () {
    if (editOfficialModal) editOfficialModal.classList.remove('active');
    resetPasswordToggles();
  };

  async function handleCreateOfficialSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('newOfficialEmail').value.trim();
    const password = document.getElementById('newOfficialPassword').value;
    const contact = document.getElementById('newOfficialContact').value.trim();
    const community = document.getElementById('newOfficialCommunity').value.trim();
    const barangay = document.getElementById('newOfficialBarangay').value.trim();
    const municipality = document.getElementById('newOfficialMunicipality').value.trim();
    const province = document.getElementById('newOfficialProvince').value.trim();
    const latitude = document.getElementById('newOfficialLatitude').value;
    const longitude = document.getElementById('newOfficialLongitude').value;

    if (!email || !password || !community || !barangay || !municipality || !province) {
      showMessage('Please fill in all mandatory fields (*).', 'error');
      return;
    }

    if (!latitude || !longitude) {
      showMessage('Please select/pin the community location on the map to capture exact coordinates for computation.', 'error');
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
          email: email,
          password: password,
          contact_number: contact,
          community_name: community,
          barangay: barangay,
          municipality: municipality,
          province: province,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          location: `${latitude},${longitude}`
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

  window.openEditOfficialModal = function (userId) {
    const official = allOfficials.find(o => String(o.user_id || o.id) === String(userId));
    if (!official) return;

    resetPasswordToggles();

    document.getElementById('editOfficialUserId').value = official.user_id || official.id;
    document.getElementById('editOfficialName').value = official.full_name || '';
    document.getElementById('editOfficialEmail').value = official.email || '';
    document.getElementById('editOfficialPassword').value = '';
    document.getElementById('editOfficialContact').value = official.contact_number && official.contact_number !== 'N/A' ? official.contact_number : '';
    document.getElementById('editOfficialPosition').value = official.position || '';
    document.getElementById('editOfficialCommunity').value = official.community_name || '';
    document.getElementById('editOfficialBarangay').value = official.barangay && official.barangay !== '---' ? official.barangay : '';
    document.getElementById('editOfficialMunicipality').value = official.municipality && official.municipality !== '---' ? official.municipality : '';
    document.getElementById('editOfficialProvince').value = official.province || 'Laguna';

    if (editOfficialModal) editOfficialModal.classList.add('active');
  };

  async function handleEditOfficialSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('editOfficialUserId').value;
    const fullName = document.getElementById('editOfficialName').value.trim();
    const email = document.getElementById('editOfficialEmail').value.trim();
    const password = document.getElementById('editOfficialPassword').value;
    const contact = document.getElementById('editOfficialContact').value.trim();
    const position = document.getElementById('editOfficialPosition').value.trim();
    const community = document.getElementById('editOfficialCommunity').value.trim();
    const barangay = document.getElementById('editOfficialBarangay').value.trim();
    const municipality = document.getElementById('editOfficialMunicipality').value.trim();
    const province = document.getElementById('editOfficialProvince').value.trim();

    if (!userId || !fullName || !email || !position || !community || !barangay || !municipality || !province) {
      showMessage('Please fill in all mandatory fields (*).', 'error');
      return;
    }

    const saveBtn = document.getElementById('btnSaveEditOfficial');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Changes...';

    try {
      const payload = {
        full_name: fullName,
        email: email,
        contact_number: contact,
        position: position,
        community_name: community,
        barangay: barangay,
        municipality: municipality,
        province: province
      };

      if (password && password.length >= 6) {
        payload.password = password;
      }

      const res = await fetch(`/api/nstp/community-officials/${encodeURIComponent(userId)}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage('Community Official details updated successfully!', 'success');
        closeEditOfficialModal();
        await loadOfficials();
      } else {
        showMessage(data.message || 'Failed to update account details.', 'error');
      }
    } catch (err) {
      console.error('Update official error:', err);
      showMessage('Network error. Unable to update account details.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }

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
