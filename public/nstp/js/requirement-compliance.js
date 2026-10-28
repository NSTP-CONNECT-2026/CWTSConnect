/**
 * CWTSConnect — NSTP Coordinator Requirement Compliance Controller
 * Manages:
 *  - Fetching compliance summary and student records
 *  - Real-time filtering by search, course, and compliance status
 *  - Rendering 5 Columns: NAME & EMAIL, PROGRAM, PROGRESS, STATUS, ACTIONS
 *  - Section 12 Skeleton loading
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global Data
  let allComplianceRecords = [];

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

  // DOM Elements
  const complianceSkeleton = document.getElementById('complianceSkeleton');
  const complianceContent = document.getElementById('complianceContent');
  const complianceTableCard = document.getElementById('complianceTableCard');
  const complianceTable = document.getElementById('complianceTable');
  const complianceTableBody = document.getElementById('complianceTableBody');
  const complianceEmptyState = document.getElementById('complianceEmptyState');

  // Filter Elements
  const searchInput = document.getElementById('complianceSearchInput');
  const courseFilter = document.getElementById('complianceCourseFilter');
  const yearFilter = document.getElementById('complianceYearFilter');
  const sectionFilter = document.getElementById('complianceSectionFilter');
  const statusFilter = document.getElementById('complianceStatusFilter');
  const clearFiltersBtn = document.getElementById('clearComplianceFiltersBtn');

  // Summary Elements
  const statTotalStudents = document.getElementById('statTotalStudents');
  const statCompliantStudents = document.getElementById('statCompliantStudents');
  const statPendingReviews = document.getElementById('statPendingReviews');
  const statNonCompliant = document.getElementById('statNonCompliant');

  // Initialize Page
  init();

  async function init() {
    setupFilters();
    showLoading();
    await Promise.all([loadComplianceSummary(), loadRequirementsList()]);
    hideLoading();
  }

  async function loadComplianceSummary() {
    try {
      const res = await fetch('/api/nstp/compliance-summary', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (statTotalStudents) statTotalStudents.textContent = d.total_students ?? d.totalStudentsWithSubmissions ?? 0;
        if (statCompliantStudents) statCompliantStudents.textContent = d.compliant_students ?? d.compliantStudents ?? 0;
        if (statPendingReviews) statPendingReviews.textContent = d.pending_review ?? d.pendingReview ?? 0;
        if (statNonCompliant) statNonCompliant.textContent = d.non_compliant_students ?? d.incompleteSubmissions ?? 0;
      }
    } catch (err) {
      console.error('Error loading compliance summary:', err);
    }
  }

  async function loadRequirementsList() {
    try {
      const res = await fetch('/api/nstp/requirements', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      allComplianceRecords = (result.success && Array.isArray(result.data)) ? result.data : [];

      updateKPIStats(allComplianceRecords);
      updateCourseFilterOptions(allComplianceRecords);
      renderTable(allComplianceRecords);
    } catch (err) {
      console.error('Error loading requirements list:', err);
      updateKPIStats([]);
      renderTable([]);
    }
  }

  function updateKPIStats(records) {
    if (!records || !Array.isArray(records)) return;
    const total = records.length;
    const compliant = records.filter(item => {
      const compStatus = (item.compliance_status || item.cmo_compliance_status || '').toLowerCase();
      const approvedCount = item.approved_count || 0;
      const totalDocs = item.total_required || 4;
      return compStatus === 'compliant' || approvedCount >= totalDocs;
    }).length;

    const pending = records.filter(item => {
      const compStatus = (item.compliance_status || item.cmo_compliance_status || '').toLowerCase();
      const approvedCount = item.approved_count || 0;
      const totalDocs = item.total_required || 4;
      const subCount = item.submitted_documents_count || 0;
      return compStatus === 'pending_review' || (subCount >= totalDocs && approvedCount < totalDocs);
    }).length;

    const incomplete = total - compliant - pending;

    if (statTotalStudents) statTotalStudents.textContent = total;
    if (statCompliantStudents) statCompliantStudents.textContent = compliant;
    if (statPendingReviews) statPendingReviews.textContent = pending;
    if (statNonCompliant) statNonCompliant.textContent = incomplete;
  }

  function updateCourseFilterOptions() {
    if (!courseFilter) return;
    const currentVal = courseFilter.value;

    courseFilter.innerHTML = '<option value="all">All Academic Courses</option>' +
      UNDERGRADUATE_COURSES.map(c => `<option value="${escapeHtml(c.abbr)}" title="${escapeHtml(c.name)}">${escapeHtml(c.abbr)}</option>`).join('');

    if (currentVal && (currentVal === 'all' || UNDERGRADUATE_COURSES.some(c => c.abbr === currentVal))) {
      courseFilter.value = currentVal;
    } else {
      courseFilter.value = 'all';
    }
  }

  function setupFilters() {
    // Collapsible Filter Panel Toggle
    const toggleComplianceFiltersBtn = document.getElementById('toggleComplianceFiltersBtn');
    const complianceFilterPanel = document.getElementById('complianceFilterPanel');

    if (toggleComplianceFiltersBtn && complianceFilterPanel) {
      toggleComplianceFiltersBtn.addEventListener('click', function () {
        const isOpen = complianceFilterPanel.classList.toggle('open');
        toggleComplianceFiltersBtn.classList.toggle('active', isOpen);
        toggleComplianceFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (courseFilter) courseFilter.addEventListener('change', applyFilters);
    if (yearFilter) yearFilter.addEventListener('change', applyFilters);
    if (sectionFilter) sectionFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (courseFilter) courseFilter.value = 'all';
        if (yearFilter) yearFilter.value = 'all';
        if (sectionFilter) sectionFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        applyFilters();
      });
    }
  }

  function updateComplianceFilterActiveDot() {
    const dot = document.getElementById('complianceFilterActiveDot');
    if (!dot) return;
    const courseVal = courseFilter ? courseFilter.value : 'all';
    const yearVal = yearFilter ? yearFilter.value : 'all';
    const sectionVal = sectionFilter ? sectionFilter.value : 'all';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const hasActiveFilters = courseVal !== 'all' || yearVal !== 'all' || sectionVal !== 'all' || statusVal !== 'all';
    dot.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }

  function applyFilters() {
    updateComplianceFilterActiveDot();

    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const course = courseFilter ? courseFilter.value : 'all';
    const year = yearFilter ? yearFilter.value : 'all';
    const section = sectionFilter ? sectionFilter.value : 'all';
    const status = statusFilter ? statusFilter.value : 'all';

    const filtered = allComplianceRecords.filter(item => {
      const p = item.profile || item.student_profiles || {};
      const name = (p.full_name || item.full_name || '').toLowerCase();
      const num = (p.student_number || item.student_number || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const cName = (p.course || '').toLowerCase();
      const sec = (p.section || '').toLowerCase();
      const yr = (p.year_level || '').toLowerCase();

      const searchMatch = !q || name.includes(q) || num.includes(q) || email.includes(q) || cName.includes(q) || sec.includes(q) || yr.includes(q);
      const courseMatch = matchCourse(p.course, course);
      const yearMatch = matchYear(p.year_level, year);
      const sectionMatch = matchSection(p.section, section);

      const compStatus = (item.compliance_status || item.cmo_compliance_status || '').toLowerCase();
      const approvedCount = item.approved_count ?? 0;
      const totalDocs = item.total_required || 4;
      const subCount = item.submitted_documents_count ?? 0;

      const isCompliant = compStatus === 'compliant' || approvedCount >= totalDocs;
      const isPending = compStatus === 'pending_review' || (subCount >= totalDocs && approvedCount < totalDocs);
      const isIncomplete = !isCompliant && !isPending;

      let statusMatch = true;
      if (status === 'compliant') {
        statusMatch = isCompliant;
      } else if (status === 'pending') {
        statusMatch = isPending;
      } else if (status === 'incomplete') {
        statusMatch = isIncomplete;
      }

      return searchMatch && courseMatch && yearMatch && sectionMatch && statusMatch;
    });

    renderTable(filtered);
  }

  function renderTable(records) {
    if (!complianceTableBody) return;

    if (!records || records.length === 0) {
      complianceTableBody.innerHTML = '';
      if (complianceTable) complianceTable.style.display = 'none';
      if (complianceEmptyState) complianceEmptyState.classList.remove('hidden');
      return;
    }

    if (complianceTable) complianceTable.style.display = 'table';
    if (complianceEmptyState) complianceEmptyState.classList.add('hidden');

    complianceTableBody.innerHTML = records.map(item => {
      const p = item.profile || item.student_profiles || {};
      const name = escapeHtml(p.full_name || item.full_name || 'Student Volunteer');
      const email = escapeHtml(item.email || 'N/A');

      // Program (Course, Year, Section)
      const rawCourse = p.course || 'Not Specified';
      const courseAbbr = escapeHtml(getCourseAbbreviation(rawCourse));
      const courseFull = escapeHtml(rawCourse);
      const year = p.year_level ? escapeHtml(p.year_level) : '';
      const section = p.section ? escapeHtml(p.section) : '';
      const yearSecParts = [];
      if (year) yearSecParts.push(year);
      if (section) {
        const secText = section.toLowerCase().startsWith('section') ? section : `Section ${section.replace(/^sec\.?\s*/i, '')}`;
        yearSecParts.push(secText);
      }
      const yearSection = yearSecParts.join(' • ') || 'Not Specified';

      const studentId = item.student_id || item.user_id || item.id;

      // Progress
      const approvedCount = item.approved_count || 0;
      const totalDocs = item.total_required || 4;
      const percent = Math.min(100, Math.round((approvedCount / totalDocs) * 100));
      const fillClass = percent >= 100 ? 'high' : (percent >= 50 ? 'mid' : 'low');

      // Overall Status Badge
      const compStatus = (item.compliance_status || item.cmo_compliance_status || '').toLowerCase();
      const isCompliant = approvedCount >= totalDocs || compStatus === 'compliant';
      const isPending = compStatus === 'pending_review' || (item.submitted_documents_count >= totalDocs && approvedCount < totalDocs);

      let overallBadge = '';
      if (isCompliant) {
        overallBadge = '<span class="badge badge-complete">Fully Compliant</span>';
      } else if (isPending) {
        overallBadge = '<span class="badge badge-pending">Review Pending</span>';
      } else {
        let pendingNote = '';
        if (item.pending_count > 0) {
          pendingNote = `<div style="font-size: 0.6875rem; color: #D97706; margin-top: 3px; font-weight: 600;">(${item.pending_count} for review)</div>`;
        }
        overallBadge = `<div><span class="badge badge-rejected">Incomplete</span>${pendingNote}</div>`;
      }

      return `
        <tr>
          <td>
            <div class="user-name-title" style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${name}</div>
            <div class="user-sub-meta" style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">${email}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.8125rem;" title="${courseFull}">${courseAbbr}</div>
            <div class="user-sub-meta" style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">${yearSection}</div>
          </td>
          <td style="min-width: 150px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; margin-bottom: 3px;">
              <span>${approvedCount} of ${totalDocs} Approved</span>
              <span>${percent}%</span>
            </div>
            <div class="compliance-progress-bar-wrap">
              <div class="compliance-progress-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
          </td>
          <td>
            ${overallBadge}
          </td>
          <td style="text-align: center;">
            <a href="review-requirements.html?studentId=${encodeURIComponent(studentId)}" class="action-btn-sm action-btn-view" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; padding: 6px 14px; border-radius: var(--radius-sm, 6px); font-size: 0.75rem; font-weight: 600;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <span>Review</span>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  function showLoading() {
    if (complianceSkeleton) complianceSkeleton.style.display = 'block';
    if (complianceContent) complianceContent.classList.add('hidden');
  }

  function hideLoading() {
    if (complianceSkeleton) complianceSkeleton.style.display = 'none';
    if (complianceContent) complianceContent.classList.remove('hidden');
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