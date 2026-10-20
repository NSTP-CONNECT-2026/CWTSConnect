/**
 * CWTSConnect — NSTP Decision Support System (DSS) Matching Controller
 * Implements Manuscript Specs: Screens 21 to 27
 *  - Screen 21: Approved Community Request Selection
 *  - Screen 22: Eligibility Screening & Gatekeeper Constraint Matrix
 *  - Screen 23: Input & Quantification Matrix (Coordinates, Distance, Skills Intersection)
 *  - Screen 24: Vector Normalization Matrix (N_loc & N_skill in [0, 1])
 *  - Screen 25: Simple Additive Weighting (SAW) Mathematical Computation (w_loc=0.30, w_skill=0.70)
 *  - Screen 26: Student Ranking with "Suitability Score"
 *  - Screen 27: Recommendation Review, Quota Selection & Deployment Hand-off
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Global State
  let approvedRequests = [];
  let allStudentsRaw = [];
  let selectedRequest = null;
  let screenedStudents = []; // All students with eligibility status
  let eligibleStudents = []; // Qualified candidates for SAW
  let rankedRecommendations = []; // Ranked list with Suitability Scores
  let selectedStudentIds = new Set();
  let currentStep = 1;
  let screeningFilter = 'all'; // 'all', 'eligible', 'ineligible'
  let screeningSearchTerm = '';

  // DOM Elements
  const dssSkeleton = document.getElementById('dssSkeleton');
  const dssContent = document.getElementById('dssContent');
  const approvedRequestsGrid = document.getElementById('approvedRequestsGrid');
  const eligibilityTableBody = document.getElementById('eligibilityTableBody');
  const quantificationTableBody = document.getElementById('quantificationTableBody');
  const normalizationTableBody = document.getElementById('normalizationTableBody');
  const sawComputationTableBody = document.getElementById('sawComputationTableBody');
  const rankingTableBody = document.getElementById('rankingTableBody');
  const studentDetailsModal = document.getElementById('studentDetailsModal');
  const studentModalBody = document.getElementById('studentModalBody');
  const studentModalFooter = document.getElementById('studentModalFooter');

  // Step Panels & Nav Buttons
  const stepPanels = [
    document.getElementById('dssPanel1'),
    document.getElementById('dssPanel2'),
    document.getElementById('dssPanel3'),
    document.getElementById('dssPanel4')
  ];

  const stepButtons = [
    document.getElementById('dssStep1Btn'),
    document.getElementById('dssStep2Btn'),
    document.getElementById('dssStep3Btn'),
    document.getElementById('dssStep4Btn')
  ];

  // Hero Request Banners
  const hero2 = document.getElementById('activeRequestHero2');
  const hero3 = document.getElementById('activeRequestHero3');
  const hero4 = document.getElementById('activeRequestHero4');

  // Calculation Sub-Tabs
  const calcTabQuant = document.getElementById('calcTabQuant');
  const calcTabNorm = document.getElementById('calcTabNorm');
  const calcTabSaw = document.getElementById('calcTabSaw');
  const quantTable = document.getElementById('quantificationTable');
  const normTable = document.getElementById('normalizationTable');
  const sawTable = document.getElementById('sawComputationTable');

  // Selection Controls
  const masterSelectCheckbox = document.getElementById('masterSelectCheckbox');
  const btnSelectTopQuota = document.getElementById('btnSelectTopQuota');
  const btnSelectAllRanked = document.getElementById('btnSelectAllRanked');
  const btnDeselectAllRanked = document.getElementById('btnDeselectAllRanked');
  const quotaCountLabel = document.getElementById('quotaCountLabel');
  const selectedStudentSummaryLabel = document.getElementById('selectedStudentSummaryLabel');
  const btnCreateDeployment = document.getElementById('btnCreateDeploymentFromDss');

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
    setupStepNavigation();
    setupSelectionControls();
    setupScreeningControls();
    setupStudentModal();

    showLoading();
    await Promise.all([loadApprovedRequests(), loadAllStudents()]);
    hideLoading();
  }

  /**
   * 1. LOAD APPROVED REQUESTS (Screen 21)
   */
  async function loadApprovedRequests() {
    try {
      const res = await fetch('/api/nstp/dss/approved-requests', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      approvedRequests = (result.success && Array.isArray(result.data)) ? result.data : [];

      renderRequestSelectionCards(approvedRequests);
    } catch (err) {
      console.error('Error loading approved requests:', err);
      renderRequestSelectionCards([]);
    }
  }

  /**
   * 2. LOAD ALL STUDENTS FOR ELIGIBILITY SCREENING (Screen 22)
   */
  async function loadAllStudents() {
    try {
      const res = await fetch('/api/nstp/dss/screening-students', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      if (result.success && result.data && Array.isArray(result.data.all_students)) {
        allStudentsRaw = result.data.all_students;
        return;
      }

      // Fallback to legacy endpoints if needed
      const [studentsRes, reqsRes] = await Promise.all([
        fetch('/api/nstp/students', { method: 'GET', credentials: 'include' }),
        fetch('/api/nstp/requirements', { method: 'GET', credentials: 'include' })
      ]);

      const sData = await studentsRes.json();
      const rData = await reqsRes.json();

      const studentsList = (sData.success && (Array.isArray(sData.students) ? sData.students : Array.isArray(sData.data) ? sData.data : [])) || [];
      const reqsList = (rData.success && (Array.isArray(rData.data) ? rData.data : Array.isArray(rData.requirements) ? rData.requirements : [])) || [];

      const reqsMap = {};
      reqsList.forEach(r => {
        const sId = r.student_id || r.user_id || r.id;
        reqsMap[sId] = r;
      });

      allStudentsRaw = studentsList.map(s => {
        const sId = s.user_id || s.id;
        const complianceObj = reqsMap[sId] || {};
        return {
          ...s,
          compliance: complianceObj
        };
      });

    } catch (err) {
      console.error('Error loading students raw data:', err);
    }
  }

  /**
   * RENDER SCREEN 21: REQUEST SELECTION CARDS
   */
  function renderRequestSelectionCards(requests) {
    if (!approvedRequestsGrid) return;

    if (!requests || requests.length === 0) {
      approvedRequestsGrid.innerHTML = `
        <div class="empty-table-state" style="grid-column: 1 / -1; padding: 48px;">
          <div class="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="empty-state-title">No Approved Community Requests</div>
          <div class="empty-state-desc">There are no approved community requests ready for DSS matching. Review filed requests in Community Requests.</div>
          <a href="community-requests.html" class="btn btn-primary btn-sm" style="margin-top: 12px;">Go to Community Requests</a>
        </div>
      `;
      return;
    }

    approvedRequestsGrid.innerHTML = requests.map(r => {
      const title = escapeHtml(r.activity_title || 'Community Project');
      const community = escapeHtml(r.community_name || 'Community Partner');
      const type = escapeHtml(r.activity_type || 'General CWTS');
      const location = `${escapeHtml(r.barangay || '---')}, ${escapeHtml(r.municipality || '---')}, ${escapeHtml(r.province || '')}`;
      const quota = r.students_needed || r.required_students || 15;
      const hours = r.estimated_hours || 30;
      const reqId = r.request_id || r.id;

      let skills = [];
      if (Array.isArray(r.skills_required)) skills = r.skills_required;
      else if (typeof r.skills_required === 'string' && r.skills_required) skills = r.skills_required.split(',').map(s => s.trim()).filter(Boolean);

      const skillsHtml = skills.length > 0
        ? skills.map(sk => `<span class="skill-tag" style="cursor: default; font-size: 0.7rem; padding: 2px 8px;">${escapeHtml(sk)}</span>`).join('')
        : '<span class="user-sub-meta">Any willing volunteers</span>';

      return `
        <div class="request-select-card" id="reqCard_${escapeHtml(String(reqId))}" onclick="window.selectCommunityRequest('${escapeHtml(String(reqId))}')">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--cwts-primary-dark);">${title}</h3>
                <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); margin-top: 2px;">
                  ${community} • <span class="user-code-tag">${type}</span>
                </div>
              </div>
              <span class="badge badge-approved">Approved for DSS</span>
            </div>

            <div class="meta-list" style="margin: 12px 0;">
              <div class="meta-item"><span class="meta-label">Location:</span><span class="meta-value">${location}</span></div>
            </div>

            <div>
              <span class="meta-label" style="font-size: 0.75rem; font-weight: 700;">Desired Skills:</span>
              <div class="skills-tags-wrap" style="margin-top: 6px;">
                ${skillsHtml}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(226, 232, 240, 0.8);">
            <button type="button" class="btn btn-primary btn-sm">
              <span>Select & Start Matching →</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * SELECT COMMUNITY REQUEST & TRIGGER PIPELINE
   */
  window.selectCommunityRequest = function (requestId) {
    const req = approvedRequests.find(r => String(r.request_id || r.id) === String(requestId));
    if (!req) return;

    selectedRequest = req;

    // Highlight selected card
    document.querySelectorAll('.request-select-card').forEach(c => c.classList.remove('selected'));
    const targetCard = document.getElementById(`reqCard_${requestId}`);
    if (targetCard) targetCard.classList.add('selected');

    // Update Quota labels
    const quota = req.students_needed || req.required_students || 15;
    if (quotaCountLabel) quotaCountLabel.textContent = quota;
    if (btnSelectTopQuota) btnSelectTopQuota.textContent = `Select Top ${quota}`;

    // Render Hero Request Banners on subsequent panels
    renderRequestHeroBanners(selectedRequest);

    // Process Eligibility Screening (Screen 22)
    processEligibilityScreening(allStudentsRaw);

    // Advance to Step 2
    goToDssStep(2);
  };

  function renderRequestHeroBanners(req) {
    const title = escapeHtml(req.activity_title || 'Activity');
    const community = escapeHtml(req.community_name || 'Community Partner');
    const type = escapeHtml(req.activity_type || 'General');
    const location = `${escapeHtml(req.barangay || '---')}, ${escapeHtml(req.municipality || '---')}`;
    const quota = req.students_needed || req.required_students || 15;

    const bannerHtml = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 42px; height: 42px; border-radius: var(--radius-md); background: rgba(47, 125, 91, 0.1); color: var(--cwts-accent-green); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          </svg>
        </div>
        <div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--cwts-primary-dark);">${title}</h3>
          <div class="user-sub-meta" style="margin-top: 2px;">
            <span style="font-weight: 600; color: var(--text-main);">${community}</span> • <span class="user-code-tag">${type}</span> • <span>${location}</span>
          </div>
        </div>
      </div>
      <div>
        <span class="badge badge-approved" style="font-size: 0.8125rem;">Approved for DSS Matching</span>
      </div>
    `;

    if (hero2) hero2.innerHTML = bannerHtml;
    if (hero3) hero3.innerHTML = bannerHtml;
    if (hero4) hero4.innerHTML = bannerHtml;
  }

  /**
   * SCREEN 22: PROCESS ELIGIBILITY SCREENING & GATEKEEPER MATRIX
   * Implements SOURCE CODE.TXT:
   * Check 1: Mandatory CMO requirements completed (4/4 approved)?
   * Check 2: Profile completed and student not yet deployed?
   * Only candidates passing BOTH checks are added to Eligible_List.
   */
  function processEligibilityScreening(rawStudents) {
    eligibleStudents = [];
    screenedStudents = [];

    (rawStudents || []).forEach(s => {
      // Profile extraction
      let p = {};
      if (Array.isArray(s.student_profiles)) {
        p = s.student_profiles[0] || {};
      } else if (s.student_profiles && typeof s.student_profiles === 'object') {
        p = s.student_profiles;
      } else if (s.profile && typeof s.profile === 'object') {
        p = s.profile;
      } else {
        p = {
          full_name: s.full_name,
          student_number: s.student_number,
          course: s.course,
          year_level: s.year_level,
          section: s.section,
          barangay: s.barangay,
          municipality: s.municipality,
          province: s.province,
          location: s.location || '',
          skills: s.skills
        };
      }

      const c = s.compliance || {};
      const approvedCount = typeof s.approved_requirements_count === 'number'
        ? s.approved_requirements_count
        : (c.approved_count || (c.compliance_status === 'compliant' ? 4 : 0));

      // Check 1: Are mandatory requirements completed (4/4 approved)?
      const check1Passed = typeof s.check1_passed === 'boolean'
        ? s.check1_passed
        : (approvedCount === 4 || s.cmo_compliance_status === 'compliant' || c.compliance_status === 'compliant');
      const check1Status = check1Passed ? 'COMPLIANT' : 'INCOMPLETE';
      const check1Reason = check1Passed
        ? '4/4 Mandatory Requirements Approved'
        : `Incomplete Requirements (${approvedCount}/4 Approved)`;

      // Check 2: Is profile completed and student not deployed on the same date/day?
      const hasProfile = typeof s.has_profile === 'boolean'
        ? s.has_profile
        : Boolean(s.profile_status === 'complete' || (p.full_name && p.student_number));

      let isDeployed = false;
      let conflictingDeployment = null;

      const activeDeps = Array.isArray(s.active_deployments) ? s.active_deployments : [];
      if (activeDeps.length > 0) {
        if (selectedRequest) {
          // Check conflict with the selected request's date/schedule
          for (const dep of activeDeps) {
            if (hasDeploymentScheduleConflict(selectedRequest, dep)) {
              isDeployed = true;
              conflictingDeployment = dep;
              break;
            }
          }
        } else {
          isDeployed = typeof s.is_deployed === 'boolean' ? s.is_deployed : false;
        }
      } else if (typeof s.is_deployed === 'boolean') {
        isDeployed = s.is_deployed;
      }

      const isCompleted = typeof s.is_completed === 'boolean'
        ? s.is_completed
        : false;

      const check2Passed = hasProfile && !isDeployed && !isCompleted;

      let check2Status = 'AVAILABLE';
      let check2Reason = 'Profile Complete & Not Deployed';
      if (!hasProfile) {
        check2Status = 'INCOMPLETE_PROFILE';
        check2Reason = 'Pending Profile Setup';
      } else if (isDeployed) {
        check2Status = 'DEPLOYED';
        const depDate = conflictingDeployment ? (conflictingDeployment.deployment_start_date || conflictingDeployment.preferred_start_date) : '';
        check2Reason = depDate ? `Deployed on ${formatDateDisplay(depDate)}` : 'Deployed on Same Date';
      } else if (isCompleted) {
        check2Status = 'HOURS_COMPLETED';
        check2Reason = 'Service Hours Completed';
      }

      // Mark as ELIGIBLE or INELIGIBLE: ONLY true if BOTH Check 1 & Check 2 passed
      const isEligible = check1Passed && check2Passed;
      let eligibilityReason = '';
      if (isEligible) {
        eligibilityReason = 'Eligible for DSS Engine';
      } else if (!check1Passed) {
        eligibilityReason = `Ineligible: Incomplete Requirements (${approvedCount}/4 Approved)`;
      } else if (!hasProfile) {
        eligibilityReason = 'Ineligible: Pending Profile Setup';
      } else if (isDeployed) {
        const depDate = conflictingDeployment ? (conflictingDeployment.deployment_start_date || conflictingDeployment.preferred_start_date) : '';
        eligibilityReason = depDate ? `Ineligible: Deployed on ${formatDateDisplay(depDate)}` : 'Ineligible: Deployed on Same Date';
      } else {
        eligibilityReason = 'Ineligible: Service Hours Completed';
      }

      const candidateObj = {
        student: s,
        profile: p,
        user_id: s.user_id || s.id,
        email: s.email || '',
        full_name: p.full_name || s.full_name || 'Student Candidate',
        student_number: p.student_number || s.student_number || 'N/A',
        course: p.course || s.course || 'BSIT',
        year_level: p.year_level || s.year_level || '1st Year',
        section: p.section || s.section || '1',
        barangay: p.barangay || s.barangay || '',
        municipality: p.municipality || s.municipality || '',
        province: p.province || s.province || '',
        location: p.location || s.location || '',
        skills: p.skills || s.skills || [],

        // Gatekeeper evaluations
        approvedDocsCount: approvedCount,
        check1Passed,
        check1Status,
        check1Reason,
        hasProfile,
        isAvailable: !isDeployed && !isCompleted,
        isDeployed,
        isCompleted,
        check2Passed,
        check2Status,
        check2Reason,
        isEligible,
        eligibilityReason
      };

      screenedStudents.push(candidateObj);
      if (isEligible) {
        eligibleStudents.push(candidateObj);
      }
    });

    // Update Gatekeeper Stats Grid in Screen 22
    updateScreeningStats();

    // Render Table according to current filter & search
    filterAndRenderScreeningTable();

    // Update Footer Summary and Proceed Button state
    updateScreeningFooter();

    // Pre-calculate DSS mathematical matrices for qualified candidates
    computeDssMatrices(eligibleStudents, selectedRequest);
  }

  function updateScreeningStats() {
    const totalCount = screenedStudents.length;
    const check1Count = screenedStudents.filter(s => s.check1Passed).length;
    const check2Count = screenedStudents.filter(s => s.check2Passed).length;
    const eligibleCount = eligibleStudents.length;
    const ineligibleCount = totalCount - eligibleCount;

    const screenTotalCount = document.getElementById('screenTotalCount');
    const screenCheck1Count = document.getElementById('screenCheck1Count');
    const screenCheck2Count = document.getElementById('screenCheck2Count');
    const screenEligibleCount = document.getElementById('screenEligibleCount');
    const screenIneligibleCount = document.getElementById('screenIneligibleCount');

    const countFilterScreenAll = document.getElementById('countFilterScreenAll');
    const countFilterScreenEligible = document.getElementById('countFilterScreenEligible');
    const countFilterScreenIneligible = document.getElementById('countFilterScreenIneligible');

    if (screenTotalCount) screenTotalCount.textContent = totalCount;
    if (screenCheck1Count) screenCheck1Count.textContent = check1Count;
    if (screenCheck2Count) screenCheck2Count.textContent = check2Count;
    if (screenEligibleCount) screenEligibleCount.textContent = eligibleCount;
    if (screenIneligibleCount) screenIneligibleCount.textContent = ineligibleCount;

    if (countFilterScreenAll) countFilterScreenAll.textContent = totalCount;
    if (countFilterScreenEligible) countFilterScreenEligible.textContent = eligibleCount;
    if (countFilterScreenIneligible) countFilterScreenIneligible.textContent = ineligibleCount;
  }

  function updateScreeningFooter() {
    const screeningHandOffSummary = document.getElementById('screeningHandOffSummary');
    const btnProceedToDssCalculations = document.getElementById('btnProceedToDssCalculations');

    const totalCount = screenedStudents.length;
    const eligibleCount = eligibleStudents.length;
    const ineligibleCount = totalCount - eligibleCount;

    if (screeningHandOffSummary) {
      if (totalCount === 0) {
        screeningHandOffSummary.innerHTML = '<span style="color: var(--text-muted);">No candidates found.</span>';
      } else if (eligibleCount === 0) {
        screeningHandOffSummary.innerHTML = `<span style="color: #DC2626; font-weight: 700;">No candidates eligible for matching</span>`;
      } else {
        screeningHandOffSummary.innerHTML = `<strong>${eligibleCount} of ${totalCount} Candidates Eligible</strong>`;
      }
    }

    if (btnProceedToDssCalculations) {
      if (eligibleCount === 0) {
        btnProceedToDssCalculations.disabled = true;
        btnProceedToDssCalculations.style.opacity = '0.5';
        btnProceedToDssCalculations.style.cursor = 'not-allowed';
      } else {
        btnProceedToDssCalculations.disabled = false;
        btnProceedToDssCalculations.style.opacity = '1';
        btnProceedToDssCalculations.style.cursor = 'pointer';
      }
    }
  }

  function setupScreeningControls() {
    const searchInput = document.getElementById('searchScreeningInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        screeningSearchTerm = (this.value || '').trim().toLowerCase();
        filterAndRenderScreeningTable();
      });
    }

    const filterPills = document.querySelectorAll('#dssPanel2 .status-filter-pills .status-pill-btn');
    filterPills.forEach(pill => {
      pill.addEventListener('click', function () {
        filterPills.forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        screeningFilter = this.getAttribute('data-filter') || 'all';
        filterAndRenderScreeningTable();
      });
    });
  }

  function filterAndRenderScreeningTable() {
    let list = screenedStudents;

    // Apply Filter Pill
    if (screeningFilter === 'eligible') {
      list = list.filter(item => item.isEligible);
    } else if (screeningFilter === 'ineligible') {
      list = list.filter(item => !item.isEligible);
    }

    // Apply Search Term
    if (screeningSearchTerm) {
      list = list.filter(item => {
        const name = (item.full_name || '').toLowerCase();
        const num = (item.student_number || '').toLowerCase();
        const course = (item.course || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        return name.includes(screeningSearchTerm) ||
               num.includes(screeningSearchTerm) ||
               course.includes(screeningSearchTerm) ||
               email.includes(screeningSearchTerm);
      });
    }

    renderEligibilityTable(list);
  }

  function renderEligibilityTable(screenedList) {
    if (!eligibilityTableBody) return;

    if (!screenedList || screenedList.length === 0) {
      eligibilityTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 48px 24px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(47, 125, 91, 0.08); display: flex; align-items: center; justify-content: center; color: var(--cwts-accent-green);">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">No Candidates Found</div>
              <div style="font-size: 0.8125rem; color: var(--text-muted); max-width: 360px; line-height: 1.5;">
                No students match the current filter or search criteria.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    eligibilityTableBody.innerHTML = screenedList.map(item => {
      const name = escapeHtml(item.full_name || 'Student Candidate');
      const num = escapeHtml(item.student_number || 'N/A');
      const email = escapeHtml(item.email || '');
      const course = escapeHtml(item.course || 'BSIT');
      const yearSec = `${escapeHtml(item.year_level || '1st Year')} • Sec ${escapeHtml(item.section || '1')}`;
      const approved = item.approvedDocsCount;

      // Check 1: Mandatory CMO Requirements
      const check1Html = item.check1Passed
        ? `<span class="badge badge-approved">4/4 Approved</span>`
        : `<span class="badge badge-rejected">${approved}/4 Approved</span>`;

      // Check 2: Profile & Availability
      let check2Html = '';
      if (item.check2Passed) {
        check2Html = `<span class="badge badge-approved">Available</span>`;
      } else if (!item.hasProfile) {
        check2Html = `<span class="badge badge-pending">Incomplete Profile</span>`;
      } else if (item.isDeployed) {
        check2Html = `<span class="badge badge-rejected">Deployed</span>`;
      } else {
        check2Html = `<span class="badge badge-rejected">Completed</span>`;
      }

      // Final Eligibility Status
      const resultBadge = item.isEligible
        ? `<div style="text-align: center;"><span class="badge badge-approved" style="font-weight: 700; padding: 4px 14px;">Eligible</span></div>`
        : `<div style="text-align: center;"><span class="badge badge-rejected" style="font-weight: 700; padding: 4px 14px;">Ineligible</span></div>`;

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta"><span class="user-code-tag">${num}</span> • ${email}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${course}</div>
            <div class="user-sub-meta">${yearSec}</div>
          </td>
          <td>
            ${check1Html}
          </td>
          <td>
            ${check2Html}
          </td>
          <td>
            ${resultBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * PROCEED FROM SCREENING TO DSS ENGINE
   * Pass ONLY Eligible_List into Quantification, Normalization, SAW, and Final Ranking
   */
  window.proceedToDssCalculations = function () {
    if (!selectedRequest) {
      showMessage('Please select an approved community request first.', 'error');
      goToDssStep(1);
      return;
    }

    if (!eligibleStudents || eligibleStudents.length === 0) {
      showMessage('Cannot proceed to DSS Engine: No students passed both Check 1 and Check 2 eligibility constraints.', 'error');
      return;
    }

    // Compute DSS Mathematical Matrices using ONLY the qualified Eligible_List
    computeDssMatrices(eligibleStudents, selectedRequest);

    // Advance to Step 3
    goToDssStep(3);
  };

  /**
   * LAGUNA MUNICIPALITY GEOGRAPHIC COORDINATES REFERENCE
   * Used for geographic distance calculations between students and community deployment locations
   */
  const LAGUNA_MUNICIPALITY_COORDS = {
    'paete': { lat: 14.3644, lng: 121.4828 },
    'pakil': { lat: 14.3820, lng: 121.4794 },
    'pangil': { lat: 14.4022, lng: 121.4678 },
    'siniloan': { lat: 14.4178, lng: 121.4489 },
    'famy': { lat: 14.4367, lng: 121.4528 },
    'mabitac': { lat: 14.4286, lng: 121.4281 },
    'santa maria': { lat: 14.4697, lng: 121.4264 },
    'kalayaan': { lat: 14.3533, lng: 121.5033 },
    'lumban': { lat: 14.2986, lng: 121.4608 },
    'pagsanjan': { lat: 14.2750, lng: 121.4542 },
    'santa cruz': { lat: 14.2789, lng: 121.4172 },
    'magdalena': { lat: 14.1989, lng: 121.4294 },
    'majayjay': { lat: 14.1436, lng: 121.5142 },
    'luisiana': { lat: 14.1856, lng: 121.5167 },
    'cavinti': { lat: 14.2483, lng: 121.5086 },
    'liliw': { lat: 14.1350, lng: 121.4358 },
    'nagcarlan': { lat: 14.1358, lng: 121.4150 },
    'rizal': { lat: 14.1111, lng: 121.3956 },
    'san pablo': { lat: 14.0683, lng: 121.3256 },
    'calamba': { lat: 14.2117, lng: 121.1656 },
    'los baños': { lat: 14.1706, lng: 121.2433 },
    'los banos': { lat: 14.1706, lng: 121.2433 },
    'bay': { lat: 14.1814, lng: 121.2869 },
    'victoria': { lat: 14.2289, lng: 121.3289 },
    'pila': { lat: 14.2344, lng: 121.3647 },
    'alaminos': { lat: 14.0625, lng: 121.2464 },
    'cabuyao': { lat: 14.2783, lng: 121.1250 },
    'santa rosa': { lat: 14.3167, lng: 121.1167 },
    'biñan': { lat: 14.3333, lng: 121.0833 },
    'binan': { lat: 14.3333, lng: 121.0833 },
    'san pedro': { lat: 14.3583, lng: 121.0500 }
  };

  /**
   * Resolves GPS Coordinates from location string or municipality name
   */
  function resolveLocationCoords(locStr, municipality, province) {
    if (locStr && typeof locStr === 'string' && locStr.includes(',')) {
      const parts = locStr.split(',');
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng, coordsStr: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`, isGps: true };
      }
    }

    const muniKey = (municipality || '').toLowerCase().trim();
    if (muniKey && LAGUNA_MUNICIPALITY_COORDS[muniKey]) {
      const c = LAGUNA_MUNICIPALITY_COORDS[muniKey];
      return { lat: c.lat, lng: c.lng, coordsStr: `${c.lat.toFixed(4)}°, ${c.lng.toFixed(4)}°`, isGps: false };
    }

    return { lat: 14.3644, lng: 121.4828, coordsStr: '14.3644°, 121.4828°', isGps: false };
  }

  /**
   * Calculates Haversine Geographic Distance in kilometers
   */
  function calculateGeographicDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.max(0.10, Math.round(dist * 100) / 100);
  }

  /**
   * ====================================================================
   * DSS ENGINE: COMPUTATION OF MATHEMATICAL MATRICES
   * Implements SOURCE CODE.TXT:
   *  - PART 2: Criteria Quantification Process (Raw Decision Matrix)
   *  - PART 3: Vector / Criteria Normalization Process (0-to-1 Scale)
   *  - PART 4: Simple Additive Weighting (SAW) Computation & Ranking
   * ====================================================================
   */
  function computeDssMatrices(eligibleList, request) {
    if (!request || !eligibleList || eligibleList.length === 0) {
      renderEmptyCalculations();
      return;
    }

    // 1. Retrieve Request Criteria (PART 2)
    const reqMuni = (request.municipality || '').toLowerCase().trim();
    const reqProv = (request.province || '').toLowerCase().trim();
    const reqCoords = resolveLocationCoords(request.location || request.coordinates, reqMuni, reqProv);

    // Extract Required Skills
    let neededSkills = [];
    if (Array.isArray(request.skills_required) && request.skills_required.length > 0) {
      neededSkills = request.skills_required;
    } else if (Array.isArray(request.needed_skills) && request.needed_skills.length > 0) {
      neededSkills = request.needed_skills;
    } else if (typeof request.skills_required === 'string' && request.skills_required) {
      neededSkills = request.skills_required.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof request.needed_skills === 'string' && request.needed_skills) {
      neededSkills = request.needed_skills.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      neededSkills = ['Community Service', 'Teamwork', 'Communication'];
    }

    const totalRequiredSkills = Math.max(1, neededSkills.length);

    // Assigned Weights from Manuscript: Location = 0.30, Skills = 0.70
    const W_LOC = 0.30;
    const W_SKILL = 0.70;

    // ------------------------------------------------------------------
    // PART 2: CRITERIA QUANTIFICATION PROCESS
    // Build Raw Decision Matrix: [ Student_ID, Raw_Distance (Cost), Raw_Skill_Ratio (Benefit) ]
    // ------------------------------------------------------------------
    const rawDecisionMatrix = eligibleList.map(item => {
      const p = item.profile || {};
      const s = item.student || {};
      const studentId = s.user_id || s.id;
      const studentName = escapeHtml(p.full_name || s.full_name || 'Candidate');
      const studentNumber = escapeHtml(p.student_number || s.student_number || 'N/A');
      const course = escapeHtml(p.course || s.course || 'BSIT');
      const yearSec = `${escapeHtml(p.year_level || s.year_level || '1st Year')} • Sec ${escapeHtml(p.section || s.section || '1')}`;
      const address = `${escapeHtml(p.barangay || s.barangay || '')}, ${escapeHtml(p.municipality || s.municipality || '')}`;

      // A. Location Compatibility Evaluation (Cost Criterion)
      const stuCoords = resolveLocationCoords(p.location || s.location, p.municipality || s.municipality, p.province || s.province);
      const rawDistance = calculateGeographicDistance(stuCoords.lat, stuCoords.lng, reqCoords.lat, reqCoords.lng);

      // B. Skills Compatibility Evaluation (Benefit Criterion)
      let studentSkills = [];
      if (Array.isArray(p.skills)) studentSkills = p.skills;
      else if (Array.isArray(s.skills)) studentSkills = s.skills;
      else if (typeof p.skills === 'string' && p.skills) studentSkills = p.skills.split(',').map(x => x.trim()).filter(Boolean);
      else if (typeof s.skills === 'string' && s.skills) studentSkills = s.skills.split(',').map(x => x.trim()).filter(Boolean);

      let matchedSkillsCount = 0;
      const matchedSkillsList = [];
      const missingSkillsList = [];

      neededSkills.forEach(reqSkill => {
        const reqLower = reqSkill.toLowerCase().trim();
        const hasMatch = studentSkills.some(stSkill => {
          const stLower = stSkill.toLowerCase().trim();
          return stLower === reqLower || stLower.includes(reqLower) || reqLower.includes(stLower);
        });

        if (hasMatch) {
          matchedSkillsCount++;
          matchedSkillsList.push(reqSkill);
        } else {
          missingSkillsList.push(reqSkill);
        }
      });

      // Raw_Skill_Ratio = Matched_Skills_Count / Total_Required_Skills (Benefit Criterion)
      const rawSkillRatio = Math.round((matchedSkillsCount / totalRequiredSkills) * 1000) / 1000;

      return {
        studentId,
        studentName,
        studentNumber,
        course,
        yearSec,
        address,
        coordsStr: stuCoords.coordsStr,
        isGps: stuCoords.isGps,
        rawDistance,
        studentSkills,
        matchedSkillsCount,
        totalRequiredSkills,
        rawSkillRatio,
        matchedSkillsList,
        missingSkillsList
      };
    });

    // ------------------------------------------------------------------
    // PART 3: VECTOR / CRITERIA NORMALIZATION PROCESS
    // Min_Distance = MIN(Raw_Distance of all eligible candidates)
    // Normalized_Location_Score = Min_Distance / Student_Raw_Distance (Cost)
    // Normalized_Skill_Score = Raw_Skill_Ratio (Benefit direct 0-to-1)
    // ------------------------------------------------------------------
    const minDistance = Math.min(...rawDecisionMatrix.map(r => r.rawDistance));

    const normalizedDecisionMatrix = rawDecisionMatrix.map(row => {
      const nLoc = Math.round((minDistance / row.rawDistance) * 1000) / 1000;
      const nSkill = row.rawSkillRatio;

      return {
        ...row,
        minDistance,
        nLoc,
        nSkill
      };
    });

    // ------------------------------------------------------------------
    // PART 4: SIMPLE ADDITIVE WEIGHTING (SAW) COMPUTATION & RANKING
    // Final_Score = (Normalized_Location_Score * 0.30) + (Normalized_Skill_Score * 0.70)
    // Suitability_Score = Final_Score * 100%
    // ------------------------------------------------------------------
    const sawComputationList = normalizedDecisionMatrix.map(row => {
      const weightedLoc = Math.round(row.nLoc * W_LOC * 1000) / 1000;
      const weightedSkill = Math.round(row.nSkill * W_SKILL * 1000) / 1000;
      const finalScore = Math.round((weightedLoc + weightedSkill) * 1000) / 1000;
      const suitabilityScore = Math.round(finalScore * 1000) / 10; // in percent (e.g. 84.5%)

      return {
        ...row,
        weightedLoc,
        weightedSkill,
        finalScore,
        suitabilityScore
      };
    });

    // Arrange / Sort Eligible Students in DESCENDING order
    sawComputationList.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    rankedRecommendations = sawComputationList;

    // Update Phase 3 Footer Summary
    const dssPhase3Summary = document.getElementById('dssPhase3Summary');
    if (dssPhase3Summary) {
      const count = eligibleList.length;
      dssPhase3Summary.innerHTML = `<strong>${count} ${count === 1 ? 'Candidate' : 'Candidates'} Evaluated</strong> • Min Distance: ${minDistance.toFixed(2)} km`;
    }

    // Render Calculation Tables
    renderQuantificationTable(sawComputationList, minDistance);
    renderNormalizationTable(sawComputationList, minDistance);
    renderSawComputationTable(sawComputationList);
    renderRankingTable(rankedRecommendations);
  }

  /**
   * RENDER TABLE 1: CRITERIA QUANTIFICATION (Raw Decision Matrix)
   * Minimalist presentation of physical distance and skill match ratio
   */
  function renderQuantificationTable(rows, minDistance) {
    if (!quantificationTableBody) return;

    quantificationTableBody.innerHTML = rows.map(r => {
      let skillsSummaryHtml = '';
      if (r.matchedSkillsCount === 0) {
        skillsSummaryHtml = `
          <div style="font-weight: 500; color: var(--text-muted); font-size: 0.8125rem;">0 of ${r.totalRequiredSkills} matched</div>
        `;
      } else {
        const skillsText = escapeHtml(r.matchedSkillsList.join(', '));
        skillsSummaryHtml = `
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.8125rem;">${r.matchedSkillsCount} of ${r.totalRequiredSkills} matched</div>
          <div class="user-sub-meta" style="color: var(--cwts-accent-green); font-size: 0.75rem; margin-top: 2px;">${skillsText}</div>
        `;
      }

      return `
        <tr>
          <td>
            <div class="user-name-title">${r.studentName}</div>
            <div class="user-sub-meta">${r.course} • <span class="user-code-tag">${r.studentNumber}</span></div>
          </td>
          <td>
            <div style="font-weight: 500; color: var(--text-main); font-size: 0.875rem;">${escapeHtml(r.address)}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.9375rem; color: var(--text-main);">${r.rawDistance.toFixed(2)} km</div>
          </td>
          <td>
            ${skillsSummaryHtml}
          </td>
          <td style="text-align: right;">
            <div style="font-size: 1rem; font-weight: 700; color: var(--cwts-accent-green);">${r.rawSkillRatio.toFixed(2)}</div>
            <div class="user-sub-meta">${Math.round(r.rawSkillRatio * 100)}% match</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * RENDER TABLE 2: VECTOR / CRITERIA NORMALIZATION
   * Shows Location Normalization (Min / Raw) and Skills Normalization (0-to-1)
   */
  function renderNormalizationTable(rows, minDistance) {
    if (!normalizationTableBody) return;

    normalizationTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="user-name-title">${r.studentName}</div>
          <div class="user-sub-meta">${r.course} • <span class="user-code-tag">${r.studentNumber}</span></div>
        </td>
        <td>
          <div style="font-weight: 500; color: var(--text-main); font-size: 0.875rem;">${r.rawDistance.toFixed(2)} km</div>
        </td>
        <td>
          <div style="font-size: 0.9375rem; font-weight: 700; color: var(--cwts-primary-dark);">${r.nLoc.toFixed(3)}</div>
          <div class="user-sub-meta">${minDistance.toFixed(2)} / ${r.rawDistance.toFixed(2)}</div>
        </td>
        <td>
          <div style="font-weight: 500; color: var(--text-main); font-size: 0.875rem;">${r.matchedSkillsCount} of ${r.totalRequiredSkills}</div>
          <div class="user-sub-meta">Ratio: ${r.rawSkillRatio.toFixed(2)}</div>
        </td>
        <td style="text-align: right;">
          <div style="font-size: 0.9375rem; font-weight: 700; color: var(--cwts-accent-green);">${r.nSkill.toFixed(3)}</div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * RENDER TABLE 3: SIMPLE ADDITIVE WEIGHTING (SAW) COMPUTATION
   * Clean breakdown: Location (30%) + Skills (70%) = Suitability Score
   */
  function renderSawComputationTable(rows) {
    if (!sawComputationTableBody) return;

    sawComputationTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="user-name-title">${r.studentName}</div>
          <div class="user-sub-meta">${r.course} • <span class="user-code-tag">${r.studentNumber}</span></div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${r.weightedLoc.toFixed(3)}</div>
          <div class="user-sub-meta">${r.nLoc.toFixed(3)} × 0.30</div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${r.weightedSkill.toFixed(3)}</div>
          <div class="user-sub-meta">${r.nSkill.toFixed(3)} × 0.70</div>
        </td>
        <td>
          <div style="font-family: monospace; font-size: 0.8125rem; color: var(--text-main);">
            ${r.weightedLoc.toFixed(3)} + ${r.weightedSkill.toFixed(3)} = <strong>${r.finalScore.toFixed(3)}</strong>
          </div>
        </td>
        <td style="text-align: right;">
          <span class="badge badge-approved" style="font-size: 0.875rem; font-weight: 700; padding: 4px 10px;">${r.suitabilityScore.toFixed(1)}%</span>
        </td>
      </tr>
    `).join('');
  }

  function renderRankingTable(rankedList) {
    if (!rankingTableBody) return;

    if (!rankedList || rankedList.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 48px 24px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(217, 119, 6, 0.1); display: flex; align-items: center; justify-content: center; color: #D97706;">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">No Eligible Students to Rank</div>
              <div style="font-size: 0.8125rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">
                No students met all CMO compliance requirements and profile completion constraints for this activity.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Default select top candidates (e.g. top 15)
    selectedStudentIds.clear();
    const defaultCount = Math.min(15, rankedList.length);
    rankedList.slice(0, defaultCount).forEach(r => selectedStudentIds.add(r.studentId));

    rankingTableBody.innerHTML = rankedList.map((r, idx) => {
      const rankNum = idx + 1;
      const isChecked = selectedStudentIds.has(r.studentId);
      let rankClass = '';
      if (rankNum === 1) rankClass = 'top-1';
      else if (rankNum === 2) rankClass = 'top-2';
      else if (rankNum === 3) rankClass = 'top-3';

      return `
        <tr>
          <td style="text-align: center;">
            <input type="checkbox" class="student-select-checkbox" data-student-id="${escapeHtml(String(r.studentId))}" ${isChecked ? 'checked' : ''} onchange="window.handleStudentCheckboxChange(this)" />
          </td>
          <td style="text-align: center;">
            <div class="rank-badge ${rankClass}">#${rankNum}</div>
          </td>
          <td>
            <div class="user-name-title">${r.studentName}</div>
            <div class="user-sub-meta">${r.course} • <span class="user-code-tag">${r.studentNumber}</span></div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${r.nLoc.toFixed(2)}</div>
            <div class="user-sub-meta">w = 0.30</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;">${r.nSkill.toFixed(2)}</div>
            <div class="user-sub-meta">w = 0.70</div>
          </td>
          <td style="text-align: center;">
            <div style="font-size: 1.125rem; font-weight: 800; color: var(--cwts-primary-dark); white-space: nowrap;">
              ${r.suitabilityScore.toFixed(1)}%
            </div>
          </td>
          <td style="text-align: center;">
            <button type="button" class="action-btn-sm action-btn-view" onclick="window.viewStudentQuickProfile('${escapeHtml(String(r.studentId))}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              <span>Profile</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    updateSelectionSummary();
  }

  function renderEmptyCalculations() {
    const emptyRowHtml = (cols, title, desc) => `
      <tr>
        <td colspan="${cols}" style="text-align: center; padding: 48px 24px;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${title}</div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">${desc}</div>
          </div>
        </td>
      </tr>
    `;

    if (quantificationTableBody) {
      quantificationTableBody.innerHTML = emptyRowHtml(5, 'No Eligible Candidates to Quantify', 'No candidates met all gatekeeper eligibility constraints (CMO requirements and profile setup).');
    }
    if (normalizationTableBody) {
      normalizationTableBody.innerHTML = emptyRowHtml(5, 'No Eligible Candidates to Normalize', 'No candidate scores available for vector normalization.');
    }
    if (sawComputationTableBody) {
      sawComputationTableBody.innerHTML = emptyRowHtml(5, 'No SAW Calculations Available', 'Cannot perform Simple Additive Weighting without qualified candidates.');
    }
    if (rankingTableBody) {
      rankingTableBody.innerHTML = emptyRowHtml(7, 'No Ranked Candidates', 'No eligible candidates are ready for quota allocation.');
    }
  }

  /**
   * STEPPER NAVIGATION CONTROLS
   */
  function setupStepNavigation() {
    stepButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetStep = parseInt(this.getAttribute('data-step'), 10);
        if (targetStep) goToDssStep(targetStep);
      });
    });
  }

  window.goToDssStep = function (step) {
    if (step < 1 || step > 4) return;

    if (step > 1 && !selectedRequest) {
      showMessage('Please select an approved community request first.', 'error');
      return;
    }

    if (step >= 3 && (!eligibleStudents || eligibleStudents.length === 0)) {
      showMessage('Cannot proceed to DSS Engine: No students passed both Check 1 and Check 2 eligibility constraints.', 'error');
      return;
    }

    currentStep = step;

    // Toggle Panels
    stepPanels.forEach((panel, idx) => {
      if (panel) {
        panel.classList.toggle('active', idx + 1 === currentStep);
      }
    });

    // Toggle Stepper Buttons
    stepButtons.forEach((btn, idx) => {
      if (btn) {
        const btnStep = idx + 1;
        btn.classList.toggle('active', btnStep === currentStep);
        btn.classList.toggle('completed', btnStep < currentStep);
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * CALCULATION SUB-TABS SWITCHER (Screen 23 vs 24 vs 25)
   */
  window.switchCalcTab = function (tabType) {
    calcTabQuant.classList.toggle('active', tabType === 'quant');
    calcTabNorm.classList.toggle('active', tabType === 'norm');
    calcTabSaw.classList.toggle('active', tabType === 'saw');

    quantTable.classList.toggle('hidden', tabType !== 'quant');
    normTable.classList.toggle('hidden', tabType !== 'norm');
    sawTable.classList.toggle('hidden', tabType !== 'saw');
  };

  /**
   * SELECTION CONTROLS (Screen 27)
   */
  function setupSelectionControls() {
    if (btnSelectTopQuota) {
      btnSelectTopQuota.addEventListener('click', () => {
        const quota = selectedRequest ? (selectedRequest.students_needed || selectedRequest.required_students || 15) : 15;
        const topCount = Math.min(quota, rankedRecommendations.length);
        selectedStudentIds.clear();
        rankedRecommendations.slice(0, topCount).forEach(r => selectedStudentIds.add(r.studentId));
        refreshCheckboxes();
      });
    }

    if (btnSelectAllRanked) {
      btnSelectAllRanked.addEventListener('click', () => {
        selectedStudentIds.clear();
        rankedRecommendations.forEach(r => selectedStudentIds.add(r.studentId));
        refreshCheckboxes();
      });
    }

    if (btnDeselectAllRanked) {
      btnDeselectAllRanked.addEventListener('click', () => {
        selectedStudentIds.clear();
        refreshCheckboxes();
      });
    }

    if (masterSelectCheckbox) {
      masterSelectCheckbox.addEventListener('change', function () {
        if (this.checked) {
          rankedRecommendations.forEach(r => selectedStudentIds.add(r.studentId));
        } else {
          selectedStudentIds.clear();
        }
        refreshCheckboxes();
      });
    }

    if (btnCreateDeployment) {
      btnCreateDeployment.addEventListener('click', handleProceedToDeployment);
    }
  }

  window.handleStudentCheckboxChange = function (cb) {
    const sId = cb.getAttribute('data-student-id');
    if (cb.checked) {
      selectedStudentIds.add(sId);
    } else {
      selectedStudentIds.delete(sId);
    }
    updateSelectionSummary();
  };

  function refreshCheckboxes() {
    document.querySelectorAll('.student-select-checkbox').forEach(cb => {
      const sId = cb.getAttribute('data-student-id');
      cb.checked = selectedStudentIds.has(sId);
    });
    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const count = selectedStudentIds.size;

    if (selectedStudentSummaryLabel) {
      selectedStudentSummaryLabel.textContent = `${count} ${count === 1 ? 'Student' : 'Students'} Selected`;
    }

    if (masterSelectCheckbox && rankedRecommendations.length > 0) {
      masterSelectCheckbox.checked = count === rankedRecommendations.length;
      masterSelectCheckbox.indeterminate = count > 0 && count < rankedRecommendations.length;
    }
  }

  /**
   * PROCEED TO DEPLOYMENT CREATION (Screen 27 Hand-off)
   */
  function handleProceedToDeployment() {
    if (!selectedRequest) {
      showMessage('No community request selected.', 'error');
      return;
    }

    if (selectedStudentIds.size === 0) {
      showMessage('Please select at least one recommended student before proceeding to deployment.', 'error');
      return;
    }

    const reqId = selectedRequest.request_id || selectedRequest.id;
    const ids = Array.from(selectedStudentIds).join(',');

    showMessage('DSS matching approved! Redirecting to Deployment Management...', 'success');

    setTimeout(() => {
      window.location.href = `deployment-management.html?requestId=${encodeURIComponent(reqId)}&students=${encodeURIComponent(ids)}`;
    }, 1200);
  }

  // --------------------------------------------------------------------------
  // STUDENT PROFILE MODAL & DSS EVALUATION INSPECTOR
  // --------------------------------------------------------------------------
  function setupStudentModal() {
    if (!studentDetailsModal) return;

    studentDetailsModal.addEventListener('click', (e) => {
      if (e.target === studentDetailsModal) {
        window.closeStudentModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && studentDetailsModal.classList.contains('active')) {
        window.closeStudentModal();
      }
    });
  }

  window.closeStudentModal = function () {
    if (studentDetailsModal) {
      studentDetailsModal.classList.remove('active');
    }
  };

  window.toggleStudentSelectionFromModal = function (studentId) {
    const sId = String(studentId);
    if (selectedStudentIds.has(sId)) {
      selectedStudentIds.delete(sId);
    } else {
      selectedStudentIds.add(sId);
    }

    const cb = document.querySelector(`.student-select-checkbox[data-student-id="${sId}"]`);
    if (cb) cb.checked = selectedStudentIds.has(sId);
    updateSelectionSummary();
    window.closeStudentModal();
  };

  window.viewStudentQuickProfile = async function (studentId) {
    if (!studentDetailsModal || !studentModalBody) return;

    studentDetailsModal.classList.add('active');

    // Find candidate in DSS computed list
    const candidate = (rankedRecommendations || []).find(r => String(r.studentId) === String(studentId));
    const rankIndex = (rankedRecommendations || []).findIndex(r => String(r.studentId) === String(studentId));
    const rankNum = rankIndex >= 0 ? rankIndex + 1 : null;

    // Show initial preview / loading
    studentModalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 12px 0;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0, 0, 0, 0.05); animation: pulse 1.5s infinite;"></div>
          <div style="flex: 1;">
            <div style="height: 18px; width: 40%; background: rgba(0, 0, 0, 0.06); border-radius: 4px; margin-bottom: 8px;"></div>
            <div style="height: 12px; width: 60%; background: rgba(0, 0, 0, 0.04); border-radius: 4px;"></div>
          </div>
        </div>
        <div style="height: 120px; background: rgba(0, 0, 0, 0.04); border-radius: 8px;"></div>
      </div>
    `;

    try {
      let profileData = null;
      try {
        const res = await fetch(`/api/nstp/dss/student/${encodeURIComponent(studentId)}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            profileData = json.data;
          }
        }
      } catch (fetchErr) {
        console.warn('Profile fetch note:', fetchErr);
      }

      // Merge remote student data with in-memory DSS metrics
      const studentName = (profileData && profileData.full_name) || (candidate && candidate.studentName) || 'Student Candidate';
      const studentNum = (profileData && profileData.student_number) || (candidate && candidate.studentNumber) || 'N/A';
      const course = (profileData && profileData.course) || (candidate && candidate.course) || 'CWTS';
      const section = (profileData && profileData.section) || (candidate && candidate.yearSec) || '1';
      const email = (profileData && profileData.email) || (candidate && candidate.email) || 'Not provided';
      const contact = (profileData && profileData.contact_number) || (candidate && candidate.contactNumber) || 'Not provided';
      const address = (profileData && (profileData.complete_address || `${profileData.barangay || ''}, ${profileData.municipality || ''}`)) || (candidate && candidate.address) || 'Not specified';

      let skills = [];
      if (profileData && Array.isArray(profileData.skills)) skills = profileData.skills;
      else if (candidate && Array.isArray(candidate.studentSkills)) skills = candidate.studentSkills;
      else if (candidate && Array.isArray(candidate.skills)) skills = candidate.skills;

      const suitability = candidate ? `${candidate.suitabilityScore.toFixed(1)}%` : 'N/A';
      let rankClass = '';
      if (rankNum === 1) rankClass = 'top-1';
      else if (rankNum === 2) rankClass = 'top-2';
      else if (rankNum === 3) rankClass = 'top-3';

      const rankBadgeHtml = rankNum ? `<span class="rank-badge ${rankClass}" style="display: inline-flex; width: 26px; height: 26px; font-size: 0.78rem;">#${rankNum}</span>` : '';

      const matchedSkillsList = (candidate && candidate.matchedSkillsList) || [];
      const missingSkillsList = (candidate && candidate.missingSkillsList) || [];
      const rawDist = candidate ? candidate.rawDistance.toFixed(2) : null;
      const nLoc = candidate ? candidate.nLoc.toFixed(2) : null;
      const nSkill = candidate ? candidate.nSkill.toFixed(2) : null;
      const weightedLoc = candidate ? candidate.weightedLoc.toFixed(3) : null;
      const weightedSkill = candidate ? candidate.weightedSkill.toFixed(3) : null;

      const isAllocated = selectedStudentIds.has(String(studentId));

      studentModalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 18px;">
          
          <!-- Candidate Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid rgba(226, 232, 240, 0.9);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #047857, #065F46); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem; box-shadow: 0 4px 10px rgba(4, 120, 87, 0.25);">
                ${escapeHtml(studentName.charAt(0))}
              </div>
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--cwts-primary-dark); margin: 0 0 4px 0;">${escapeHtml(studentName)}</h3>
                <div style="font-size: 0.8125rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span>${escapeHtml(course)}</span>
                  <span>•</span>
                  <span class="user-code-tag">${escapeHtml(studentNum)}</span>
                  <span>•</span>
                  <span>Section ${escapeHtml(section)}</span>
                </div>
              </div>
            </div>
            
            <div style="text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                ${rankBadgeHtml}
                <span class="badge badge-approved" style="font-size: 0.95rem; font-weight: 800; padding: 4px 12px;">
                  ${suitability} Match
                </span>
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">SAW Overall Suitability</div>
            </div>
          </div>

          <!-- Matching Criteria Breakdown Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
            
            <!-- Location Evaluation Card -->
            <div style="background: rgba(248, 250, 252, 0.95); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: var(--radius-md); padding: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--cwts-primary-dark); letter-spacing: 0.03em;">
                  Location Score (30%)
                </span>
                ${nLoc ? `<span style="font-size: 0.75rem; font-weight: 700; color: #047857; background: rgba(4, 120, 87, 0.08); padding: 2px 8px; border-radius: 4px;">Score: ${nLoc}</span>` : ''}
              </div>
              <div style="font-size: 0.8125rem; color: var(--text-main); margin-bottom: 6px; line-height: 1.45;">
                ${escapeHtml(address)}
              </div>
              ${rawDist ? `
                <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                  <span style="font-weight: 600; color: var(--text-main);">Distance:</span>
                  <span>${rawDist} km to activity site</span>
                </div>
              ` : ''}
              ${weightedLoc ? `
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                  Weighted: ${nLoc} x 0.30 = <strong>${weightedLoc}</strong>
                </div>
              ` : ''}
            </div>

            <!-- Skills Compatibility Card -->
            <div style="background: rgba(248, 250, 252, 0.95); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: var(--radius-md); padding: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--cwts-primary-dark); letter-spacing: 0.03em;">
                  Skills Score (70%)
                </span>
                ${nSkill ? `<span style="font-size: 0.75rem; font-weight: 700; color: #047857; background: rgba(4, 120, 87, 0.08); padding: 2px 8px; border-radius: 4px;">Score: ${nSkill}</span>` : ''}
              </div>
              <div style="font-size: 0.8125rem; color: var(--text-main); margin-bottom: 8px;">
                ${candidate ? `<strong>${candidate.matchedSkillsCount}</strong> of <strong>${candidate.totalRequiredSkills}</strong> required skills matched` : 'Skills matched'}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${matchedSkillsList.map(s => `<span class="skill-tag" style="background: #E8F5E9; color: #1B5E20; border-color: #C8E6C9; font-size: 0.75rem; padding: 2px 8px;">${escapeHtml(s)}</span>`).join('')}
                ${missingSkillsList.map(s => `<span class="skill-tag" style="background: rgba(241, 245, 249, 0.8); color: var(--text-muted); font-size: 0.75rem; padding: 2px 8px;">${escapeHtml(s)}</span>`).join('')}
                ${matchedSkillsList.length === 0 && missingSkillsList.length === 0 && skills.length > 0 ? skills.map(s => `<span class="skill-tag" style="font-size: 0.75rem; padding: 2px 8px;">${escapeHtml(s)}</span>`).join('') : ''}
              </div>
              ${weightedSkill ? `
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px;">
                  Weighted: ${nSkill} x 0.70 = <strong>${weightedSkill}</strong>
                </div>
              ` : ''}
            </div>

          </div>

          <!-- Academic & Eligibility Checklist -->
          <div class="meta-list">
            <div class="meta-item">
              <span class="meta-label">Email Address</span>
              <span class="meta-value">${escapeHtml(email)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Contact Number</span>
              <span class="meta-value">${escapeHtml(contact)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">CMO Compliance</span>
              <span class="meta-value" style="color: #047857; font-weight: 700;">4/4 Documents Approved (Eligible)</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Deployment Status</span>
              <span class="meta-value" style="color: #047857; font-weight: 700;">Available for Assignment</span>
            </div>
          </div>

        </div>
      `;

      // Update footer with allocation toggle button
      if (studentModalFooter) {
        studentModalFooter.innerHTML = `
          <button type="button" class="btn btn-secondary" onclick="window.closeStudentModal()">Close</button>
          <button type="button" class="btn ${isAllocated ? 'btn-secondary' : 'btn-primary'}" onclick="window.toggleStudentSelectionFromModal('${escapeHtml(String(studentId))}')">
            ${isAllocated ? 'Remove from Allocation' : 'Include in Allocation'}
          </button>
        `;
      }

    } catch (err) {
      console.error('Error rendering student details:', err);
      studentModalBody.innerHTML = `
        <div style="text-align: center; padding: 28px; color: #DC2626;">
          <p style="font-weight: 600; margin-bottom: 6px;">Unable to load candidate profile.</p>
          <p style="font-size: 0.8125rem; color: var(--text-muted);">${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  };

  function showLoading() {
    if (dssSkeleton) dssSkeleton.style.display = 'block';
    if (dssContent) dssContent.classList.add('hidden');
  }

  function hideLoading() {
    if (dssSkeleton) dssSkeleton.style.display = 'none';
    if (dssContent) dssContent.classList.remove('hidden');
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

  function normalizeDate(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.split('T')[0].trim();
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return null;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return 'Scheduled Date';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  function hasDeploymentScheduleConflict(targetRequest, deployment) {
    if (!targetRequest || !deployment) return false;

    const targetStartDate = normalizeDate(targetRequest.preferred_start_date || targetRequest.deployment_start_date);
    const targetEndDate = normalizeDate(targetRequest.preferred_end_date || targetRequest.deployment_end_date) || targetStartDate;
    const targetSchedule = String(targetRequest.preferred_schedule || targetRequest.schedule || '').toLowerCase();

    const depStartDate = normalizeDate(
      deployment.deployment_start_date ||
      deployment.preferred_start_date ||
      (deployment.community_requests && deployment.community_requests.preferred_start_date)
    );
    const depEndDate = normalizeDate(
      deployment.deployment_end_date ||
      deployment.preferred_end_date ||
      (deployment.community_requests && deployment.community_requests.preferred_end_date)
    ) || depStartDate;
    const depSchedule = String(
      deployment.notes ||
      deployment.preferred_schedule ||
      (deployment.community_requests && deployment.community_requests.preferred_schedule) ||
      deployment.schedule || ''
    ).toLowerCase();

    if (!targetStartDate || !depStartDate) {
      if (deployment.request_id && targetRequest.request_id && deployment.request_id === targetRequest.request_id) {
        return true;
      }
      return false;
    }

    if (deployment.request_id && targetRequest.request_id && deployment.request_id === targetRequest.request_id) {
      return true;
    }

    // Exact single date match
    if (targetStartDate === depStartDate) {
      return true;
    }

    // Date range overlap
    const overlap = (targetStartDate <= depEndDate) && (depStartDate <= targetEndDate);
    if (!overlap) {
      return false;
    }

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetHasDay = daysOfWeek.find(day => targetSchedule.includes(day));
    const depHasDay = daysOfWeek.find(day => depSchedule.includes(day));
    if (targetHasDay && depHasDay) {
      return targetHasDay === depHasDay;
    }

    return true;
  }

});