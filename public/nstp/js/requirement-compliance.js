/**
 * CWTSConnect — NSTP Coordinator Requirement Compliance Controller
 * Manages:
 *  - Fetching compliance summary and student records
 *  - Real-time filtering by search, course, and compliance status
 *  - Rendering Neumorphic progress bars and document status pills
 *  - Section 12 Skeleton loading
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global Data
  let allComplianceRecords = [];

  // DOM Elements
  const complianceSkeleton = document.getElementById('complianceSkeleton');
  const complianceContent = document.getElementById('complianceContent');
  const complianceTableCard = document.getElementById('complianceTableCard');
  const complianceTable = document.getElementById('complianceTable');
  const complianceTableBody = document.getElementById('complianceTableBody');
  const complianceEmptyState = document.getElementById('complianceEmptyState');

  // Filter Elements
  const searchInput = document.getElementById('complianceSearchInput');
  const statusFilter = document.getElementById('complianceStatusFilter');
  const courseFilter = document.getElementById('complianceCourseFilter');
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
        if (statTotalStudents) statTotalStudents.textContent = d.total_students || 0;
        if (statCompliantStudents) statCompliantStudents.textContent = d.compliant_students || 0;
        if (statPendingReviews) statPendingReviews.textContent = d.pending_review || d.pending_documents || 0;
        if (statNonCompliant) statNonCompliant.textContent = d.non_compliant_students || d.incomplete_students || 0;
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

      renderTable(allComplianceRecords);
    } catch (err) {
      console.error('Error loading requirements list:', err);
      renderTable([]);
    }
  }

  function setupFilters() {
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (courseFilter) courseFilter.addEventListener('change', applyFilters);
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        if (courseFilter) courseFilter.value = 'all';
        applyFilters();
      });
    }
  }

  function applyFilters() {
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const status = statusFilter ? statusFilter.value : 'all';
    const course = courseFilter ? courseFilter.value : 'all';

    const filtered = allComplianceRecords.filter(item => {
      const p = item.profile || {};
      const name = (p.full_name || item.full_name || '').toLowerCase();
      const num = (p.student_number || item.student_number || '').toLowerCase();
      const email = (item.email || '').toLowerCase();

      const searchMatch = !q || name.includes(q) || num.includes(q) || email.includes(q);
      const courseMatch = course === 'all' || (p.course || '').toLowerCase() === course.toLowerCase();
      
      const compStatus = (item.compliance_status || '').toLowerCase();
      let statusMatch = true;
      if (status === 'compliant') statusMatch = compStatus === 'compliant';
      else if (status === 'pending') statusMatch = compStatus === 'pending_review' || (item.pending_count > 0);
      else if (status === 'incomplete') statusMatch = compStatus === 'incomplete' || compStatus === 'non_compliant';

      return searchMatch && courseMatch && statusMatch;
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
      const p = item.profile || {};
      const name = escapeHtml(p.full_name || item.full_name || 'Student Enrollee');
      const studentNum = escapeHtml(p.student_number || item.student_number || 'N/A');
      const email = escapeHtml(item.email || 'N/A');
      const course = escapeHtml(p.course || 'CWTS');
      const yearSection = `${escapeHtml(p.year_level || '1st Year')} • Sec ${escapeHtml(p.section || '1')}`;
      const studentId = item.student_id || item.user_id || item.id;

      // Approved / Total requirements
      const approvedCount = item.approved_count || 0;
      const totalDocs = 4;
      const percent = Math.min(100, Math.round((approvedCount / totalDocs) * 100));
      const fillClass = percent >= 100 ? 'high' : (percent >= 50 ? 'mid' : 'low');

      // Requirement Status Badges
      const reqs = item.requirements || {};
      const medStatus = getDocPill('Medical Clearance', reqs.medical_clearance || reqs['Medical Clearance']);
      const consentStatus = getDocPill('Parent Consent', reqs.parent_consent || reqs['Parent Consent']);
      const waiverStatus = getDocPill('Waiver', reqs.waiver || reqs['Waiver']);
      const idStatus = getDocPill('Valid ID', reqs.valid_id || reqs['Valid ID']);

      // Overall Badge
      const isCompliant = approvedCount === 4 || item.compliance_status === 'compliant';
      const hasPending = item.pending_count > 0 || item.compliance_status === 'pending_review';

      let overallBadge = '';
      if (isCompliant) {
        overallBadge = '<span class="badge badge-complete">Fully Compliant</span>';
      } else if (hasPending) {
        overallBadge = '<span class="badge badge-pending">Review Pending</span>';
      } else {
        overallBadge = '<span class="badge badge-rejected">Incomplete</span>';
      }

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta"><span class="user-code-tag">${studentNum}</span> • ${email}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${course}</div>
            <div class="user-sub-meta">${yearSection}</div>
          </td>
          <td style="min-width: 140px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; margin-bottom: 2px;">
              <span>${approvedCount} of ${totalDocs} Approved</span>
              <span>${percent}%</span>
            </div>
            <div class="compliance-progress-bar-wrap">
              <div class="compliance-progress-fill ${fillClass}" style="width: ${percent}%;"></div>
            </div>
          </td>
          <td>
            <div class="doc-status-pills">
              ${medStatus}
              ${consentStatus}
              ${waiverStatus}
              ${idStatus}
            </div>
          </td>
          <td>
            ${overallBadge}
          </td>
          <td>
            <a href="review-requirements.html?studentId=${encodeURIComponent(studentId)}" class="action-btn-sm action-btn-view">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <span>Review Details</span>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getDocPill(docName, docObj) {
    if (!docObj) {
      return `<span class="doc-mini-pill missing" title="${docName}: Missing">${docName.split(' ')[0]}: -</span>`;
    }

    const st = (docObj.status || docObj.verification_status || '').toLowerCase();
    if (st === 'approved') {
      return `<span class="doc-mini-pill approved" title="${docName}: Approved">✓ ${docName.split(' ')[0]}</span>`;
    } else if (st === 'pending') {
      return `<span class="doc-mini-pill pending" title="${docName}: Pending Review">⏳ ${docName.split(' ')[0]}</span>`;
    } else if (st === 'rejected') {
      return `<span class="doc-mini-pill rejected" title="${docName}: Rejected">✕ ${docName.split(' ')[0]}</span>`;
    } else {
      return `<span class="doc-mini-pill missing" title="${docName}: Not submitted">${docName.split(' ')[0]}: -</span>`;
    }
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