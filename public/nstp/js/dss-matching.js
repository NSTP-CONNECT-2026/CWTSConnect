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

  // DOM Elements
  const dssSkeleton = document.getElementById('dssSkeleton');
  const dssContent = document.getElementById('dssContent');
  const approvedRequestsGrid = document.getElementById('approvedRequestsGrid');
  const eligibilityTableBody = document.getElementById('eligibilityTableBody');
  const quantificationTableBody = document.getElementById('quantificationTableBody');
  const normalizationTableBody = document.getElementById('normalizationTableBody');
  const sawComputationTableBody = document.getElementById('sawComputationTableBody');
  const rankingTableBody = document.getElementById('rankingTableBody');

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
      const [studentsRes, reqsRes] = await Promise.all([
        fetch('/api/nstp/students', { method: 'GET', credentials: 'include' }),
        fetch('/api/nstp/requirements', { method: 'GET', credentials: 'include' })
      ]);

      const sData = await studentsRes.json();
      const rData = await reqsRes.json();

      const studentsList = (sData.success && Array.isArray(sData.data)) ? sData.data : [];
      const reqsList = (rData.success && Array.isArray(rData.data)) ? rData.data : [];

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
   */
  function processEligibilityScreening(rawStudents) {
    eligibleStudents = [];
    screenedStudents = [];

    rawStudents.forEach(s => {
      const p = s.student_profiles || s.profile || {};
      const c = s.compliance || {};
      const approvedCount = c.approved_count || (c.compliance_status === 'compliant' ? 4 : 0);
      const isCompliant = approvedCount === 4 || c.compliance_status === 'compliant';
      const hasProfile = Boolean(s.student_profiles || s.profile_completed);
      const isAvailable = !s.is_deployed && !s.deployed;

      const isEligible = isCompliant && hasProfile && isAvailable;

      const candidateObj = {
        student: s,
        profile: p,
        isCompliant,
        approvedDocsCount: approvedCount,
        hasProfile,
        isAvailable,
        isEligible
      };

      screenedStudents.push(candidateObj);
      if (isEligible) {
        eligibleStudents.push(candidateObj);
      }
    });

    renderEligibilityTable(screenedStudents);

    // Compute DSS Mathematical Matrices
    computeDssMatrices(eligibleStudents, selectedRequest);
  }

  function renderEligibilityTable(screenedList) {
    if (!eligibilityTableBody) return;

    if (!screenedList || screenedList.length === 0) {
      eligibilityTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 48px 24px;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(47, 125, 91, 0.08); display: flex; align-items: center; justify-content: center; color: var(--cwts-accent-green);">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">No Student Candidates Available</div>
              <div style="font-size: 0.8125rem; color: var(--text-muted); max-width: 420px; line-height: 1.5;">
                There are no enrolled students currently found for eligibility screening. Ensure students are enrolled and have registered accounts.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    eligibilityTableBody.innerHTML = screenedList.map(item => {
      const p = item.profile;
      const s = item.student;
      const name = escapeHtml(p.full_name || s.full_name || 'Student Candidate');
      const num = escapeHtml(p.student_number || s.student_number || 'N/A');
      const course = escapeHtml(p.course || 'BSIT');
      const yearSec = `${escapeHtml(p.year_level || '1st Year')} • Sec ${escapeHtml(p.section || '1')}`;
      const approved = item.approvedDocsCount;

      let complianceHtml = '';
      if (approved === 4) {
        complianceHtml = `<span class="doc-mini-pill approved">Complete (4/4 Approved)</span>`;
      } else {
        complianceHtml = `<span class="doc-mini-pill rejected">Incomplete (${approved}/4 Approved)</span>`;
      }

      let gatekeeperBadge = '';
      if (item.isEligible) {
        gatekeeperBadge = `<span class="eligibility-badge-eligible">Eligible for DSS Matching</span>`;
      } else if (!item.isCompliant) {
        gatekeeperBadge = `<span class="eligibility-badge-ineligible">Ineligible: Incomplete CMO Requirements</span>`;
      } else if (!item.hasProfile) {
        gatekeeperBadge = `<span class="eligibility-badge-ineligible">Ineligible: Pending Profile Setup</span>`;
      } else {
        gatekeeperBadge = `<span class="eligibility-badge-ineligible">Ineligible: Already Deployed</span>`;
      }

      return `
        <tr>
          <td>
            <div class="user-name-title">${name}</div>
            <div class="user-sub-meta"><span class="user-code-tag">${num}</span> • ${escapeHtml(s.email || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${course}</div>
            <div class="user-sub-meta">${yearSec}</div>
          </td>
          <td>
            ${complianceHtml}
          </td>
          <td>
            ${gatekeeperBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * SCREENS 23, 24, 25: MATHEMATICAL COMPUTATIONS (Quantification, Normalization & SAW)
   */
  function computeDssMatrices(eligibleList, request) {
    if (!request || eligibleList.length === 0) {
      renderEmptyCalculations();
      return;
    }

    const reqMuni = (request.municipality || '').toLowerCase().trim();
    const reqProv = (request.province || '').toLowerCase().trim();
    let neededSkills = [];
    if (Array.isArray(request.skills_required)) neededSkills = request.skills_required;
    else if (typeof request.skills_required === 'string' && request.skills_required) neededSkills = request.skills_required.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // Weights: Location = 0.30, Skills = 0.70
    const W_LOC = 0.30;
    const W_SKILL = 0.70;

    const quantRows = [];
    const normRows = [];
    const sawRows = [];
    const rankedRows = [];

    eligibleList.forEach((item, index) => {
      const p = item.profile;
      const s = item.student;
      const name = escapeHtml(p.full_name || s.full_name || 'Candidate');
      const studentId = s.user_id || s.id;

      // Extract skills
      let studentSkills = [];
      if (Array.isArray(p.skills)) studentSkills = p.skills;
      else if (typeof p.skills === 'string' && p.skills) studentSkills = p.skills.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

      // 1. Location Distance / Proximity Calculation
      const stuMuni = (p.municipality || '').toLowerCase().trim();
      const stuProv = (p.province || '').toLowerCase().trim();

      let distanceKm = 2.0;
      let rawLocScore = 1.00; // Normalized Location Score N_loc

      if (stuMuni === reqMuni && stuProv === reqProv) {
        distanceKm = 1.8;
        rawLocScore = 1.00; // Same municipality
      } else if (stuProv === reqProv) {
        distanceKm = 4.5;
        rawLocScore = 0.60; // Same province
      } else {
        distanceKm = 12.0;
        rawLocScore = 0.30; // Different province
      }

      // 2. Skills Match Calculation
      let matchedCount = 0;
      if (neededSkills.length > 0) {
        neededSkills.forEach(reqSkill => {
          if (studentSkills.some(stSkill => stSkill.includes(reqSkill) || reqSkill.includes(stSkill))) {
            matchedCount++;
          }
        });
      } else {
        matchedCount = Math.min(3, studentSkills.length);
      }

      const totalNeeded = Math.max(1, neededSkills.length || 3);
      const skillRatio = Math.min(1.0, matchedCount / totalNeeded);
      const rawSkillScore = skillRatio > 0 ? (skillRatio >= 0.75 ? 1.00 : (skillRatio >= 0.5 ? 0.75 : 0.50)) : (studentSkills.length > 0 ? 0.30 : 0.10);

      // 3. Simple Additive Weighting (SAW) Formula:
      // Suitability Score = (N_loc * 0.30) + (N_skill * 0.70)
      const weightedLoc = rawLocScore * W_LOC;
      const weightedSkill = rawSkillScore * W_SKILL;
      const finalSuitabilityScore = (weightedLoc + weightedSkill) * 100; // in percentage

      const calcObj = {
        studentId,
        studentName: name,
        studentNumber: p.student_number || s.student_number || 'N/A',
        course: p.course || 'BSIT',
        address: `${p.barangay || ''}, ${p.municipality || ''}`,
        distanceKm,
        matchedCount,
        totalNeeded,
        skillRatio,
        nLoc: rawLocScore,
        nSkill: rawSkillScore,
        weightedLoc,
        weightedSkill,
        suitabilityScore: Math.round(finalSuitabilityScore * 10) / 10 // e.g. 82.5%
      };

      quantRows.push(calcObj);
      normRows.push(calcObj);
      sawRows.push(calcObj);
      rankedRows.push(calcObj);
    });

    // Sort Ranked Rows by Suitability Score Descending
    rankedRows.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
    rankedRecommendations = rankedRows;

    // Render Calculation Tables
    renderQuantificationTable(quantRows);
    renderNormalizationTable(normRows);
    renderSawComputationTable(sawRows);
    renderRankingTable(rankedRecommendations);
  }

  function renderQuantificationTable(rows) {
    if (!quantificationTableBody) return;
    quantificationTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="user-name-title">${r.studentName}</div>
          <div class="user-sub-meta">${r.course} • <span class="user-code-tag">${r.studentNumber}</span></div>
        </td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(r.address)}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--cwts-primary-dark);">${r.distanceKm.toFixed(1)} km</div>
          <div class="user-sub-meta">Proximity Vector</div>
        </td>
        <td>
          <div style="font-weight: 600;">${r.matchedCount} of ${r.totalNeeded} Skills</div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--cwts-accent-green);">${r.skillRatio.toFixed(2)}</div>
        </td>
      </tr>
    `).join('');
  }

  function renderNormalizationTable(rows) {
    if (!normalizationTableBody) return;
    normalizationTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="user-name-title">${r.studentName}</div>
          <div class="user-sub-meta">${r.course}</div>
        </td>
        <td>${r.distanceKm.toFixed(1)} km</td>
        <td>
          <div style="font-size: 1rem; font-weight: 800; color: var(--cwts-primary-dark);">${r.nLoc.toFixed(2)}</div>
        </td>
        <td>${r.matchedCount} / ${r.totalNeeded}</td>
        <td>
          <div style="font-size: 1rem; font-weight: 800; color: var(--cwts-accent-green);">${r.nSkill.toFixed(2)}</div>
        </td>
      </tr>
    `).join('');
  }

  function renderSawComputationTable(rows) {
    if (!sawComputationTableBody) return;
    sawComputationTableBody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <div class="user-name-title">${r.studentName}</div>
          <div class="user-sub-meta">${r.course}</div>
        </td>
        <td>
          <div>${r.nLoc.toFixed(2)} × 0.30 = <strong>${r.weightedLoc.toFixed(3)}</strong></div>
        </td>
        <td>
          <div>${r.nSkill.toFixed(2)} × 0.70 = <strong>${r.weightedSkill.toFixed(3)}</strong></div>
        </td>
        <td>
          <div style="font-family: monospace; font-size: 0.8125rem;">${r.weightedLoc.toFixed(3)} + ${r.weightedSkill.toFixed(3)} = ${(r.weightedLoc + r.weightedSkill).toFixed(3)}</div>
        </td>
        <td>
          <div class="suitability-score-number">${r.suitabilityScore.toFixed(1)}%</div>
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
          <td>
            <input type="checkbox" class="student-select-checkbox" data-student-id="${escapeHtml(String(r.studentId))}" ${isChecked ? 'checked' : ''} onchange="window.handleStudentCheckboxChange(this)" />
          </td>
          <td>
            <div class="rank-badge ${rankClass}">#${rankNum}</div>
          </td>
          <td>
            <div class="user-name-title">${r.studentName}</div>
            <div class="user-sub-meta"><span class="user-code-tag">${r.studentNumber}</span> • ${r.course}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${r.nLoc.toFixed(2)}</div>
            <div class="user-sub-meta">w = 0.30</div>
          </td>
          <td>
            <div style="font-weight: 600;">${r.nSkill.toFixed(2)}</div>
            <div class="user-sub-meta">w = 0.70</div>
          </td>
          <td>
            <div class="suitability-score-cell">
              <span class="suitability-score-number">${r.suitabilityScore.toFixed(1)}%</span>
              <span class="badge badge-approved" style="font-size: 0.65rem;">Suitability Score</span>
            </div>
          </td>
          <td>
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
        const topCount = Math.min(15, rankedRecommendations.length);
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
      selectedStudentSummaryLabel.textContent = `${count} Students Selected`;
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

  window.viewStudentQuickProfile = function (studentId) {
    window.open(`student-records.html?studentId=${encodeURIComponent(studentId)}`, '_blank');
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

});