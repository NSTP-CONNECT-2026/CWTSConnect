/**
 * CWTSConnect - Community Official Student Feedback & Performance Evaluation Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Handles:
 *  - 2-Tab switching between Community Feedback & Student Performance Evaluation
 *  - Loading deployment activities and assigned student volunteers
 *  - Star rating picker (1 to 5) and 4-criteria performance evaluation rubric sliders
 *  - Real-time score calculation and performance grade badge determination
 *  - Interactive Assigned Student Volunteers Evaluation Roster with status badges
 *  - Interactive Evaluation Modal (create and edit student evaluations)
 *  - Historical logs for community feedback and completed student evaluations
 *  - Section 12 Skeleton loading states and clean error handling
 *  - STRICTLY ZERO EMOJIS AND ZERO STICKERS
 */

(function () {
  'use strict';

  // Global State
  let deployments = [];
  let students = [];
  let feedbackRecords = [];
  let evaluationRecords = [];
  let activeFeedbackBatch = '';
  let activeDeploymentFilter = 'all';

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupTabSwitcher();
    setupStarPicker();
    setupEvaluationSliders();
    setupModalEventListeners();
    setupFilterEventListeners();

    showLoading();
    try {
      await Promise.all([
        loadDeploymentsAndStudents(),
        loadHistoricalRecords()
      ]);
    } catch (err) {
      console.error('Error initializing community feedback & evaluation page:', err);
      showToast('Failed to initialize page data.', 'error');
    } finally {
      hideLoading();
    }
  }

  // --------------------------------------------------------------------------
  // Tab Navigation Switcher
  // --------------------------------------------------------------------------
  function setupTabSwitcher() {
    const tabBtns = document.querySelectorAll('#commFeTabsBar .deployment-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetTab = this.getAttribute('data-tab');

        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');

        document.querySelectorAll('.deployment-tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        const targetPane = document.getElementById(`${targetTab}TabPane`);
        if (targetPane) {
          targetPane.classList.add('active');
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // Tab 1: Star Rating Picker (Modal)
  // --------------------------------------------------------------------------
  function setupStarPicker() {
    const picker = document.getElementById('modalFbStarPicker');
    if (!picker) return;

    const stars = picker.querySelectorAll('svg');
    stars.forEach(star => {
      star.addEventListener('click', function () {
        const val = parseInt(this.getAttribute('data-val'), 10) || 5;
        setModalFbStarRating(val);
      });
    });
  }

  function setModalFbStarRating(val) {
    const picker = document.getElementById('modalFbStarPicker');
    const inputVal = document.getElementById('modalFbRatingVal');
    if (!picker || !inputVal) return;

    inputVal.value = val;
    const stars = picker.querySelectorAll('svg');
    stars.forEach(s => {
      const sVal = parseInt(s.getAttribute('data-val'), 10);
      if (sVal <= val) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Tab 2 & Modal: Evaluation Sliders & Score Recalculation
  // --------------------------------------------------------------------------
  function setupEvaluationSliders() {
    const sliders = [
      { id: 'modalRatingPunctuality', valId: 'modalPunctualityVal' },
      { id: 'modalRatingEngagement', valId: 'modalEngagementVal' },
      { id: 'modalRatingTeamwork', valId: 'modalTeamworkVal' },
      { id: 'modalRatingAttitude', valId: 'modalAttitudeVal' }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const valEl = document.getElementById(s.valId);
      if (el && valEl) {
        el.addEventListener('input', function () {
          valEl.textContent = `${Number(this.value).toFixed(1)}`;
          recalculateModalOverallScore();
        });
      }
    });
  }

  function recalculateModalOverallScore() {
    const p = parseFloat(document.getElementById('modalRatingPunctuality')?.value || 5);
    const ce = parseFloat(document.getElementById('modalRatingEngagement')?.value || 5);
    const tw = parseFloat(document.getElementById('modalRatingTeamwork')?.value || 5);
    const ia = parseFloat(document.getElementById('modalRatingAttitude')?.value || 5);

    const avg = ((p + ce + tw + ia) / 4).toFixed(2);
    const previewEl = document.getElementById('modalOverallScorePreview');
    const badgeEl = document.getElementById('modalGradeBadge');

    if (previewEl) previewEl.textContent = avg;

    const numAvg = parseFloat(avg);
    let grade = 'Outstanding';
    let badgeClass = 'badge-verified';
    let badgeStyle = 'font-weight: 800;';

    if (numAvg >= 4.75) {
      grade = 'Outstanding';
      badgeClass = 'badge-verified';
      badgeStyle = 'font-weight: 800; background: rgba(16, 185, 129, 0.15); color: #065F46;';
    } else if (numAvg >= 4.00) {
      grade = 'Very Satisfactory';
      badgeClass = 'badge';
      badgeStyle = 'font-weight: 800; background: rgba(47, 125, 91, 0.15); color: #0B3D2E;';
    } else if (numAvg >= 3.00) {
      grade = 'Satisfactory';
      badgeClass = 'badge';
      badgeStyle = 'font-weight: 800; background: rgba(59, 130, 246, 0.15); color: #1E3A8A;';
    } else {
      grade = 'Needs Improvement';
      badgeClass = 'badge-rejected';
      badgeStyle = 'font-weight: 800; background: rgba(220, 38, 38, 0.15); color: #991B1B;';
    }

    if (badgeEl) {
      badgeEl.textContent = grade;
      badgeEl.className = `badge ${badgeClass}`;
      badgeEl.setAttribute('style', badgeStyle);
    }
  }

  // --------------------------------------------------------------------------
  // Modals Event Listeners & Controllers
  // --------------------------------------------------------------------------
  function setupModalEventListeners() {
    // 1. Tab 2 Performance Evaluation Modal
    const evalModal = document.getElementById('evaluationModal');
    const closeEvalBtn = document.getElementById('closeEvalModalBtn');
    const closeEvalFooterBtn = document.getElementById('closeEvalModalFooterBtn');
    const saveEvalBtn = document.getElementById('saveEvaluationBtn');

    if (closeEvalBtn) closeEvalBtn.addEventListener('click', closeEvaluationModal);
    if (closeEvalFooterBtn) closeEvalFooterBtn.addEventListener('click', closeEvaluationModal);

    if (evalModal) {
      evalModal.addEventListener('click', function (e) {
        if (e.target === evalModal) closeEvaluationModal();
      });
    }

    if (saveEvalBtn) saveEvalBtn.addEventListener('click', handleSaveEvaluation);

    // 2. Tab 1 Student Feedback Modal (Single & Batch)
    const fbModal = document.getElementById('feedbackModal');
    const closeFbBtn = document.getElementById('closeFbModalBtn');
    const closeFbFooterBtn = document.getElementById('closeFbModalFooterBtn');
    const saveFbBtn = document.getElementById('saveFeedbackModalBtn');

    if (closeFbBtn) closeFbBtn.addEventListener('click', closeFeedbackModal);
    if (closeFbFooterBtn) closeFbFooterBtn.addEventListener('click', closeFeedbackModal);

    if (fbModal) {
      fbModal.addEventListener('click', function (e) {
        if (e.target === fbModal) closeFeedbackModal();
      });
    }

    if (saveFbBtn) saveFbBtn.addEventListener('click', handleSaveFeedbackModal);

    // Escape Key Listener
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (evalModal && evalModal.classList.contains('active')) closeEvaluationModal();
        if (fbModal && fbModal.classList.contains('active')) closeFeedbackModal();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Tab 1: Feedback Modal Open / Close / Save
  // --------------------------------------------------------------------------
  function openFeedbackModal(studentUserId, deploymentId, mode) {
    const modal = document.getElementById('feedbackModal');
    if (!modal) return;

    const modalTitle = document.getElementById('modalFbTitle');
    const avatarEl = document.getElementById('modalFbAvatar');
    const nameEl = document.getElementById('modalFbTargetName');
    const metaEl = document.getElementById('modalFbTargetMeta');
    const actEl = document.getElementById('modalFbActivityMeta');
    const commentsEl = document.getElementById('modalFbComments');
    const saveBtn = document.getElementById('saveFeedbackModalBtn');

    setInputValue('modalFbMode', mode);
    setInputValue('modalFbDeploymentId', deploymentId);
    setInputValue('modalFbStudentUserId', studentUserId || '');

    const dep = deployments.find(d => d.deployment_id === deploymentId);

    if (mode === 'batch') {
      let batchStudents = students;
      let batchName = 'All Batches';
      let actTitle = 'All Community Service Activities';
      let commName = 'Partner Community';

      if (deploymentId !== 'all') {
        batchStudents = students.filter(s => s.deployment_id === deploymentId);
        batchName = dep?.deployment_batch_name || 'Selected Batch';
        actTitle = dep?.activity_title || 'Community Service Activity';
        commName = dep?.community_name || 'Partner Community';
      }

      if (modalTitle) modalTitle.textContent = deploymentId === 'all' ? 'Rate All Volunteers (All Batches)' : 'Rate All Volunteers';
      if (avatarEl) avatarEl.textContent = 'ALL';
      if (nameEl) nameEl.textContent = deploymentId === 'all' ? 'All Deployment Batches' : `Batch: ${batchName}`;
      if (metaEl) metaEl.textContent = `Applying rating and feedback to all ${batchStudents.length} volunteers.`;
      if (actEl) actEl.textContent = deploymentId === 'all' ? 'All Community Deployment Activities' : `Activity: ${actTitle}`;

      setInputValue('modalFbStudentFullName', '');
      setInputValue('modalFbActivityTitle', actTitle);
      setInputValue('modalFbCommunityName', commName);

      setModalFbStarRating(5);
      if (commentsEl) commentsEl.value = '';
      if (saveBtn) saveBtn.querySelector('span').textContent = 'Save';
    } else {
      const student = students.find(s => s.student_user_id === studentUserId && s.deployment_id === deploymentId);
      if (!student) {
        showToast('Student volunteer details not found.', 'error');
        return;
      }

      setInputValue('modalFbStudentFullName', student.student_name);
      setInputValue('modalFbActivityTitle', student.activity_title);
      setInputValue('modalFbCommunityName', student.community_name);

      if (avatarEl) avatarEl.textContent = getInitials(student.student_name);
      if (nameEl) nameEl.textContent = student.student_name || 'Student Volunteer';
      if (metaEl) {
        metaEl.textContent = `${student.course || 'BSIT'} • Section ${student.section || '1'} • ID: ${student.student_number || '---'}`;
      }
      if (actEl) {
        actEl.textContent = `Activity: ${student.activity_title || 'Community Activity'} • ${student.deployment_batch_name || 'Batch'}`;
      }

      const existingFb = feedbackRecords.find(f => f.deployment_id === deploymentId && f.student_user_id === studentUserId);

      if (mode === 'view' && existingFb) {
        if (modalTitle) modalTitle.textContent = 'Student Volunteer Feedback';
        setModalFbStarRating(parseInt(existingFb.rating, 10) || 5);
        if (commentsEl) commentsEl.value = existingFb.comments || '';
      } else {
        if (modalTitle) modalTitle.textContent = 'Evaluate Volunteer Feedback';
        setModalFbStarRating(5);
        if (commentsEl) commentsEl.value = '';
      }

      if (saveBtn) saveBtn.querySelector('span').textContent = 'Save';
    }

    modal.classList.add('active');
  }

  function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.classList.remove('active');
  }

  async function handleSaveFeedbackModal() {
    const mode = document.getElementById('modalFbMode')?.value || 'single';
    const depId = document.getElementById('modalFbDeploymentId')?.value;
    const studentUserId = document.getElementById('modalFbStudentUserId')?.value || null;
    const rating = parseInt(document.getElementById('modalFbRatingVal')?.value, 10) || 5;
    const comments = document.getElementById('modalFbComments')?.value?.trim();
    const actTitle = document.getElementById('modalFbActivityTitle')?.value;
    const commName = document.getElementById('modalFbCommunityName')?.value;

    if (!depId) {
      showToast('Missing deployment batch selection.', 'error');
      return;
    }

    if (!comments) {
      showToast('Please enter feedback comments or remarks.', 'error');
      return;
    }

    const saveBtn = document.getElementById('saveFeedbackModalBtn');

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.querySelector('span').textContent = 'Saving...';
      }

      let payload = {
        deployment_id: depId,
        rating,
        comments,
        activity_title: actTitle || 'Community Service Activity',
        community_name: commName || 'Partner Community'
      };

      if (mode === 'batch') {
        let batchStudents = students;
        if (depId !== 'all') {
          batchStudents = students.filter(s => s.deployment_id === depId);
        }
        payload.is_batch = true;
        payload.students = batchStudents.map(s => ({
          student_user_id: s.student_user_id,
          deployment_id: s.deployment_id,
          activity_title: s.activity_title,
          community_name: s.community_name
        }));
      } else {
        payload.student_user_id = studentUserId;
      }

      const res = await fetch('/api/community/feedback-evaluations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        closeFeedbackModal();
        showToast(mode === 'batch' ? 'Batch feedback applied to all volunteers successfully.' : 'Student feedback saved successfully.', 'success');

        await loadHistoricalRecords();
        renderFeedbackStudentRoster();
      } else {
        showToast(result.message || 'Failed to save feedback.', 'error');
      }
    } catch (err) {
      console.error('Error saving feedback modal:', err);
      showToast('Server error saving feedback.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.querySelector('span').textContent = 'Save';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Tab 2: Evaluation Modal Open / Close
  // --------------------------------------------------------------------------
  function openEvaluationModal(studentUserId, deploymentId, mode = 'evaluate') {
    const modal = document.getElementById('evaluationModal');
    if (!modal) return;

    const modalTitle = document.getElementById('evalModalTitle');
    const avatarEl = document.getElementById('modalAvatar');
    const nameEl = document.getElementById('modalStudentName');
    const metaEl = document.getElementById('modalStudentMeta');
    const actEl = document.getElementById('modalActivityMeta');
    const remarksEl = document.getElementById('modalEvalRemarks');
    const saveBtn = document.getElementById('saveEvaluationBtn');

    setInputValue('modalEvalMode', mode);
    setInputValue('modalDeploymentId', deploymentId);
    setInputValue('modalStudentUserId', studentUserId || '');

    const dep = deployments.find(d => d.deployment_id === deploymentId);

    if (mode === 'batch') {
      let batchStudents = students;
      let batchName = 'All Batches';
      let actTitle = 'All Community Service Activities';
      let commName = 'Partner Community';

      if (deploymentId !== 'all') {
        batchStudents = students.filter(s => s.deployment_id === deploymentId);
        batchName = dep?.deployment_batch_name || 'Selected Batch';
        actTitle = dep?.activity_title || 'Community Service Activity';
        commName = dep?.community_name || 'Partner Community';
      }

      if (modalTitle) modalTitle.textContent = deploymentId === 'all' ? 'Evaluate All Volunteers (All Batches)' : 'Evaluate All Volunteers';
      if (avatarEl) avatarEl.textContent = 'ALL';
      if (nameEl) nameEl.textContent = deploymentId === 'all' ? 'All Deployment Batches' : `Batch: ${batchName}`;
      if (metaEl) metaEl.textContent = `Applying performance evaluation rubric to all ${batchStudents.length} volunteers.`;
      if (actEl) actEl.textContent = deploymentId === 'all' ? 'All Community Deployment Activities' : `Activity: ${actTitle}`;

      setInputValue('modalStudentFullName', '');
      setInputValue('modalActivityTitle', actTitle);
      setInputValue('modalCommunityName', commName);

      setSliderVal('modalRatingPunctuality', 'modalPunctualityVal', 5.0);
      setSliderVal('modalRatingEngagement', 'modalEngagementVal', 5.0);
      setSliderVal('modalRatingTeamwork', 'modalTeamworkVal', 5.0);
      setSliderVal('modalRatingAttitude', 'modalAttitudeVal', 5.0);
      if (remarksEl) remarksEl.value = '';
      if (saveBtn) saveBtn.querySelector('span').textContent = 'Save';
    } else {
      const student = students.find(s => s.student_user_id === studentUserId && s.deployment_id === deploymentId);
      if (!student) {
        showToast('Student volunteer details not found.', 'error');
        return;
      }

      setInputValue('modalStudentFullName', student.student_name);
      setInputValue('modalActivityTitle', student.activity_title);
      setInputValue('modalCommunityName', student.community_name);

      if (avatarEl) avatarEl.textContent = getInitials(student.student_name);
      if (nameEl) nameEl.textContent = student.student_name || 'Student Volunteer';
      if (metaEl) {
        metaEl.textContent = `${student.course || 'BSIT'} • Section ${student.section || '1'} • ID: ${student.student_number || '---'}`;
      }
      if (actEl) {
        actEl.textContent = `Activity: ${student.activity_title || 'Community Activity'} • ${student.deployment_batch_name || 'Batch'}`;
      }

      if (mode === 'view' && student.is_evaluated && student.evaluation) {
        const ev = student.evaluation;
        if (modalTitle) modalTitle.textContent = 'Student Volunteer Performance Evaluation';
        setSliderVal('modalRatingPunctuality', 'modalPunctualityVal', ev.rating_punctuality || 5);
        setSliderVal('modalRatingEngagement', 'modalEngagementVal', ev.rating_community_engagement || 5);
        setSliderVal('modalRatingTeamwork', 'modalTeamworkVal', ev.rating_teamwork || 5);
        setSliderVal('modalRatingAttitude', 'modalAttitudeVal', ev.rating_initiative_attitude || 5);
        if (remarksEl) remarksEl.value = ev.evaluator_remarks || '';
      } else {
        if (modalTitle) modalTitle.textContent = 'Evaluate Volunteer Performance';
        setSliderVal('modalRatingPunctuality', 'modalPunctualityVal', 5.0);
        setSliderVal('modalRatingEngagement', 'modalEngagementVal', 5.0);
        setSliderVal('modalRatingTeamwork', 'modalTeamworkVal', 5.0);
        setSliderVal('modalRatingAttitude', 'modalAttitudeVal', 5.0);
        if (remarksEl) remarksEl.value = '';
      }

      if (saveBtn) saveBtn.querySelector('span').textContent = 'Save';
    }

    recalculateModalOverallScore();
    modal.classList.add('active');
  }

  function closeEvaluationModal() {
    const modal = document.getElementById('evaluationModal');
    if (modal) modal.classList.remove('active');
  }

  function setSliderVal(sliderId, valId, value) {
    const s = document.getElementById(sliderId);
    const v = document.getElementById(valId);
    const num = parseFloat(value) || 5;
    if (s) s.value = num;
    if (v) v.textContent = num.toFixed(1);
  }

  // --------------------------------------------------------------------------
  // Filters & Dropdowns
  // --------------------------------------------------------------------------
  function setupFilterEventListeners() {
    const fbDepSelect = document.getElementById('fbDeploymentSelect');
    if (fbDepSelect) {
      fbDepSelect.addEventListener('change', function () {
        activeFeedbackBatch = this.value;
        renderFeedbackStudentRoster();
      });
    }

    const rateAllBtn = document.getElementById('rateAllBtn');
    if (rateAllBtn) {
      rateAllBtn.addEventListener('click', function () {
        let batchStudents = students;
        if (activeFeedbackBatch !== 'all') {
          batchStudents = students.filter(s => s.deployment_id === activeFeedbackBatch);
        }
        if (batchStudents.length === 0) {
          showToast('No student volunteers found to evaluate.', 'error');
          return;
        }
        openFeedbackModal(null, activeFeedbackBatch, 'batch');
      });
    }

    const evalDepSelect = document.getElementById('evalDeploymentSelect');
    if (evalDepSelect) {
      evalDepSelect.addEventListener('change', function () {
        activeDeploymentFilter = this.value || 'all';
        updateRosterSummaryKPIs();
        renderRosterTable();
      });
    }

    const evaluateAllBtn = document.getElementById('evaluateAllBtn');
    if (evaluateAllBtn) {
      evaluateAllBtn.addEventListener('click', function () {
        let batchStudents = students;
        if (activeDeploymentFilter !== 'all') {
          batchStudents = students.filter(s => s.deployment_id === activeDeploymentFilter);
        }
        if (batchStudents.length === 0) {
          showToast('No student volunteers found to evaluate.', 'error');
          return;
        }
        openEvaluationModal(null, activeDeploymentFilter, 'batch');
      });
    }
  }

  function populateDeploymentSelects() {
    const fbSelect = document.getElementById('fbDeploymentSelect');
    const evalSelect = document.getElementById('evalDeploymentSelect');

    if (!deployments || deployments.length === 0) {
      const emptyOpt = '<option value="">No active deployments found</option>';
      if (fbSelect) fbSelect.innerHTML = emptyOpt;
      if (evalSelect) evalSelect.innerHTML = emptyOpt;
      return;
    }

    // Options for Tab 1 Feedback
    const fbOptions = deployments.map(d => {
      const label = `${d.deployment_batch_name} - ${d.activity_title || 'Activity'} (${d.assigned_students_count || 0} volunteers)`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    if (fbSelect) {
      fbSelect.innerHTML = `<option value="all">All Deployment Batches (${students.length} Volunteers)</option>` + fbOptions;
      if (!activeFeedbackBatch) {
        activeFeedbackBatch = 'all';
      }
      fbSelect.value = activeFeedbackBatch;
      renderFeedbackStudentRoster();
    }

    // Options for Tab 2 Evaluation Roster
    const evalOptions = deployments.map(d => {
      const label = `${d.deployment_batch_name} - ${d.activity_title || 'Activity'} (${d.assigned_students_count || 0} volunteers)`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    if (evalSelect) {
      evalSelect.innerHTML = `<option value="all">All Deployment Batches (${students.length} Volunteers)</option>` + evalOptions;
      evalSelect.value = activeDeploymentFilter;
    }
  }

  // --------------------------------------------------------------------------
  // Data Loading from Backend
  // --------------------------------------------------------------------------
  async function loadDeploymentsAndStudents() {
    try {
      const res = await fetch('/api/community/feedback-evaluations/deployments');
      const result = await res.json();

      if (result.success) {
        deployments = result.deployments || [];
        students = result.students || [];

        populateDeploymentSelects();
        updateRosterSummaryKPIs();
        renderRosterTable();
      } else {
        console.warn('Deployments fetch returned unsuccess:', result.message);
      }
    } catch (err) {
      console.error('Error fetching deployments and students:', err);
      showToast('Error loading deployment roster.', 'error');
    }
  }

  async function loadHistoricalRecords() {
    try {
      const res = await fetch('/api/community/feedback-evaluations/records');
      const result = await res.json();

      if (result.success) {
        const rawFeedback = result.feedback || [];
        const seenFb = new Set();
        feedbackRecords = rawFeedback.filter(f => {
          if (!f.student_user_id) return true;
          const k = `${f.deployment_id}_${f.student_user_id}`;
          if (seenFb.has(k)) return false;
          seenFb.add(k);
          return true;
        });
        evaluationRecords = result.evaluations || [];

        // Synchronize evaluations into students array
        evaluationRecords.forEach(ev => {
          const st = students.find(s => s.deployment_id === ev.deployment_id && s.student_user_id === ev.student_user_id);
          if (st) {
            st.is_evaluated = true;
            st.evaluation = ev;
          }
        });

        renderFeedbackStudentRoster();
        updateRosterSummaryKPIs();
        renderRosterTable();

        setElText('commFeedbackBadge', feedbackRecords.length);
        setElText('commEvaluationBadge', evaluationRecords.length);
      }
    } catch (err) {
      console.error('Error fetching historical records:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Tab 1: Render Student Feedback Roster
  // --------------------------------------------------------------------------
  function renderFeedbackStudentRoster() {
    const tbody = document.getElementById('studentFeedbackBody');
    if (!tbody) return;

    if (!activeFeedbackBatch) {
      activeFeedbackBatch = 'all';
    }

    let batchStudents = students;
    if (activeFeedbackBatch !== 'all') {
      batchStudents = students.filter(s => s.deployment_id === activeFeedbackBatch);
    }

    const titleEl = document.getElementById('fbRosterTitle');
    if (titleEl) {
      if (activeFeedbackBatch === 'all') {
        titleEl.textContent = 'Student Volunteers Feedback Roster (All Batches)';
      } else {
        const d = deployments.find(dep => dep.deployment_id === activeFeedbackBatch);
        titleEl.textContent = `Student Volunteers Feedback: ${d?.deployment_batch_name || 'Selected Batch'}`;
      }
    }

    // Calculate metrics for this batch
    let ratedCount = 0;
    let ratingSum = 0;
    batchStudents.forEach(s => {
      const fb = feedbackRecords.find(f => f.deployment_id === s.deployment_id && f.student_user_id === s.student_user_id);
      if (fb) {
        ratedCount++;
        ratingSum += (parseFloat(fb.rating) || 5);
      }
    });

    setElText('fbBatchTotalCount', batchStudents.length);
    setElText('fbBatchRatedCount', `${ratedCount} / ${batchStudents.length}`);
    const avg = ratedCount > 0 ? (ratingSum / ratedCount).toFixed(1) : '5.0';
    setElText('fbBatchAvgScore', `${avg} / 5.0`);

    if (batchStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No student volunteers found for the selected deployment batch.</td></tr>';
      return;
    }

    tbody.innerHTML = batchStudents.map(s => {
      const name = escapeHtml(s.student_name || 'Student Volunteer');
      const number = escapeHtml(s.student_number || '---');
      const courseSection = `${escapeHtml(s.course || 'BSIT')} • Sec ${escapeHtml(s.section || '1')}`;
      const yearText = s.year_level ? `Year ${escapeHtml(s.year_level)}` : '';
      const initials = getInitials(s.student_name);

      const fb = feedbackRecords.find(f => f.deployment_id === s.deployment_id && f.student_user_id === s.student_user_id);

      let ratingHtml = '<span style="color: var(--text-muted); font-size: 0.8125rem; font-style: italic;">Pending</span>';
      let commentsHtml = '<span style="color: var(--text-muted); font-size: 0.8125rem; font-style: italic;">Pending</span>';
      let actionBtn = `<button type="button" class="btn btn-primary btn-sm evaluate-fb-btn" data-student-id="${s.student_user_id}" data-dep-id="${s.deployment_id}" style="padding: 6px 14px; font-size: 0.75rem;">Evaluate</button>`;

      if (fb) {
        const ratingVal = parseInt(fb.rating, 10) || 5;
        ratingHtml = `<strong style="color: #D97706; font-size: 0.9375rem;">${ratingVal} / 5 Stars</strong>`;
        const fullComments = (fb.comments || '').trim() || 'No remarks provided.';
        const displayComments = truncateText(fullComments, 50);
        commentsHtml = `<span style="font-size: 0.8125rem; max-width: 200px; min-width: 150px; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere; white-space: normal;" title="${escapeHtml(fullComments)}">"${displayComments}"</span>`;
        actionBtn = `<button type="button" class="btn btn-secondary btn-sm view-fb-btn" data-student-id="${s.student_user_id}" data-dep-id="${s.deployment_id}" style="padding: 6px 14px; font-size: 0.75rem;">View</button>`;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--cwts-primary-dark); color: #FFFFFF; font-weight: 800; font-size: 0.8125rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${initials}
              </div>
              <div>
                <strong style="color: var(--cwts-primary-dark); font-size: 0.9375rem; display: block;">${name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${number}${activeFeedbackBatch === 'all' ? ` • ${escapeHtml(s.deployment_batch_name || '')}` : ''}</span>
              </div>
            </div>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block;">${courseSection}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${yearText}</span>
          </td>
          <td style="text-align: center;">${ratingHtml}</td>
          <td>${commentsHtml}</td>
          <td style="text-align: center;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Attach listeners
    tbody.querySelectorAll('.evaluate-fb-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        const depId = this.getAttribute('data-dep-id');
        openFeedbackModal(studentId, depId, 'evaluate');
      });
    });

    tbody.querySelectorAll('.view-fb-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        const depId = this.getAttribute('data-dep-id');
        openFeedbackModal(studentId, depId, 'view');
      });
    });
  }

  // --------------------------------------------------------------------------
  // Tab 2: Render Evaluation Roster & Summary KPIs
  // --------------------------------------------------------------------------
  function updateRosterSummaryKPIs() {
    let filteredStudents = students;
    if (activeDeploymentFilter !== 'all') {
      filteredStudents = students.filter(s => s.deployment_id === activeDeploymentFilter);
    }

    const total = filteredStudents.length;
    const evaluated = filteredStudents.filter(s => s.is_evaluated).length;

    let avgScore = '5.00';
    if (evaluated > 0) {
      const sum = filteredStudents
        .filter(s => s.is_evaluated && s.evaluation?.overall_score)
        .reduce((acc, s) => acc + parseFloat(s.evaluation.overall_score), 0);
      avgScore = (sum / evaluated).toFixed(2);
    }

    setElText('evalBatchTotalCount', total);
    setElText('evalBatchEvaluatedCount', `${evaluated} / ${total}`);
    setElText('evalBatchAvgScore', `${avgScore} / 5.00`);

    const titleEl = document.getElementById('rosterTitle');
    if (titleEl) {
      if (activeDeploymentFilter === 'all') {
        titleEl.textContent = 'Student Volunteers Performance Evaluation Roster (All Batches)';
      } else {
        const d = deployments.find(dep => dep.deployment_id === activeDeploymentFilter);
        titleEl.textContent = `Student Volunteers Performance Evaluation: ${d?.deployment_batch_name || 'Selected Batch'}`;
      }
    }
  }

  function renderRosterTable() {
    const tbody = document.getElementById('studentRosterBody');
    if (!tbody) return;

    let filtered = students;
    if (activeDeploymentFilter !== 'all') {
      filtered = students.filter(s => s.deployment_id === activeDeploymentFilter);
    }

    if (!filtered || filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No student volunteers found for the selected deployment batch.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const name = escapeHtml(s.student_name || 'Student Volunteer');
      const number = escapeHtml(s.student_number || '---');
      const courseSection = `${escapeHtml(s.course || 'BSIT')} • Sec ${escapeHtml(s.section || '1')}`;
      const yearText = s.year_level ? `Year ${escapeHtml(s.year_level)}` : '';
      const initials = getInitials(s.student_name);
      const isEval = Boolean(s.is_evaluated && s.evaluation);

      let scoreDisplay = '<span style="color: var(--text-muted); font-size: 0.8125rem; font-style: italic;">Pending</span>';
      let commentsDisplay = '<span style="color: var(--text-muted); font-size: 0.8125rem; font-style: italic;">Pending</span>';
      let actionBtn = `<button type="button" class="btn btn-primary btn-sm evaluate-eval-btn" data-student-id="${s.student_user_id}" data-dep-id="${s.deployment_id}" style="padding: 6px 14px; font-size: 0.75rem;">Evaluate</button>`;

      if (isEval) {
        const ev = s.evaluation;
        const score = parseFloat(ev.overall_score || 5).toFixed(2);
        const grade = ev.performance_grade || 'Outstanding';
        scoreDisplay = `<strong style="color: var(--cwts-primary-dark); font-size: 0.9375rem;">${score} / 5.00</strong><div style="margin-top: 4px;">${getGradeBadgeHtml(grade)}</div>`;

        const fullRemarks = (ev.evaluator_remarks || '').trim() || 'No remarks provided.';
        const displayRemarks = truncateText(fullRemarks, 50);
        commentsDisplay = `<span style="font-size: 0.8125rem; max-width: 200px; min-width: 150px; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere; white-space: normal;" title="${escapeHtml(fullRemarks)}">"${displayRemarks}"</span>`;

        actionBtn = `<button type="button" class="btn btn-secondary btn-sm view-eval-btn" data-student-id="${s.student_user_id}" data-dep-id="${s.deployment_id}" style="padding: 6px 14px; font-size: 0.75rem;">View</button>`;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--cwts-primary-dark); color: #FFFFFF; font-weight: 800; font-size: 0.8125rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${initials}
              </div>
              <div>
                <strong style="color: var(--cwts-primary-dark); font-size: 0.9375rem; display: block;">${name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${number}${activeDeploymentFilter === 'all' ? ` • ${escapeHtml(s.deployment_batch_name || '')}` : ''}</span>
              </div>
            </div>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block;">${courseSection}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${yearText}</span>
          </td>
          <td style="text-align: center;">${scoreDisplay}</td>
          <td>${commentsDisplay}</td>
          <td style="text-align: center;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to Evaluate / View buttons
    tbody.querySelectorAll('.evaluate-eval-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        const depId = this.getAttribute('data-dep-id');
        openEvaluationModal(studentId, depId, 'evaluate');
      });
    });

    tbody.querySelectorAll('.view-eval-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const studentId = this.getAttribute('data-student-id');
        const depId = this.getAttribute('data-dep-id');
        openEvaluationModal(studentId, depId, 'view');
      });
    });
  }

  // Form 2: Performance Evaluation Modal Save Action
  async function handleSaveEvaluation() {
    const mode = document.getElementById('modalEvalMode')?.value || 'single';
    const depId = document.getElementById('modalDeploymentId')?.value;
    const studentUserId = document.getElementById('modalStudentUserId')?.value || null;
    const studentName = document.getElementById('modalStudentFullName')?.value;
    const activityTitle = document.getElementById('modalActivityTitle')?.value;
    const communityName = document.getElementById('modalCommunityName')?.value;

    const p = parseFloat(document.getElementById('modalRatingPunctuality')?.value || 5);
    const ce = parseFloat(document.getElementById('modalRatingEngagement')?.value || 5);
    const tw = parseFloat(document.getElementById('modalRatingTeamwork')?.value || 5);
    const ia = parseFloat(document.getElementById('modalRatingAttitude')?.value || 5);
    const remarks = document.getElementById('modalEvalRemarks')?.value?.trim();

    if (!depId) {
      showToast('Missing deployment batch selection.', 'error');
      return;
    }

    if (!remarks) {
      showToast('Please enter evaluator remarks or qualitative feedback.', 'error');
      return;
    }

    const saveBtn = document.getElementById('saveEvaluationBtn');

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.querySelector('span').textContent = 'Saving...';
      }

      let payload = {
        deployment_id: depId,
        rating_punctuality: p,
        rating_community_engagement: ce,
        rating_teamwork: tw,
        rating_initiative_attitude: ia,
        evaluator_remarks: remarks,
        activity_title: activityTitle || 'Community Service Activity',
        community_name: communityName || 'Partner Community'
      };

      if (mode === 'batch') {
        let batchStudents = students;
        if (depId !== 'all') {
          batchStudents = students.filter(s => s.deployment_id === depId);
        }
        payload.is_batch = true;
        payload.students = batchStudents.map(s => ({
          student_user_id: s.student_user_id,
          deployment_id: s.deployment_id,
          student_name: s.student_name,
          activity_title: s.activity_title,
          community_name: s.community_name
        }));
      } else {
        payload.student_user_id = studentUserId;
        payload.student_name = studentName;
      }

      const res = await fetch('/api/community/feedback-evaluations/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        closeEvaluationModal();
        showToast(mode === 'batch' ? 'Batch performance evaluation applied to all volunteers successfully.' : 'Student performance evaluation saved successfully.', 'success');

        // Refresh state
        await Promise.all([
          loadDeploymentsAndStudents(),
          loadHistoricalRecords()
        ]);
      } else {
        showToast(result.message || 'Failed to save evaluation.', 'error');
      }
    } catch (err) {
      console.error('Error saving student evaluation:', err);
      showToast('Server error saving evaluation.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.querySelector('span').textContent = 'Save';
      }
    }
  }

  // --------------------------------------------------------------------------
  // UI Helpers & Formatting
  // --------------------------------------------------------------------------
  function getGradeBadgeHtml(grade) {
    if (grade === 'Outstanding') {
      return '<span class="badge badge-verified" style="font-weight: 800; background: rgba(16, 185, 129, 0.15); color: #065F46;">Outstanding</span>';
    }
    if (grade === 'Very Satisfactory') {
      return '<span class="badge" style="font-weight: 800; background: rgba(47, 125, 91, 0.15); color: #0B3D2E;">Very Satisfactory</span>';
    }
    if (grade === 'Satisfactory') {
      return '<span class="badge" style="font-weight: 800; background: rgba(59, 130, 246, 0.15); color: #1E3A8A;">Satisfactory</span>';
    }
    return '<span class="badge badge-rejected" style="font-weight: 800; background: rgba(220, 38, 38, 0.15); color: #991B1B;">Needs Improvement</span>';
  }

  function getInitials(name) {
    if (!name) return 'SV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function showLoading() {
    const skeleton = document.getElementById('commFeSkeleton');
    const content = document.getElementById('commFeContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('commFeSkeleton');
    const content = document.getElementById('commFeContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = msg;
    if (type === 'success') {
      toast.style.background = 'rgba(16, 185, 129, 0.12)';
      toast.style.color = '#0B3D2E';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (type === 'error') {
      toast.style.background = 'rgba(239, 68, 68, 0.12)';
      toast.style.color = '#991B1B';
      toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
    } else {
      toast.style.background = 'rgba(59, 130, 246, 0.12)';
      toast.style.color = '#1E3A8A';
      toast.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    }

    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
  }

  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function truncateText(str, maxLen = 50) {
    if (!str) return '';
    const trimmed = String(str).trim();
    if (trimmed.length <= maxLen) return escapeHtml(trimmed);
    return escapeHtml(trimmed.substring(0, maxLen)) + '...';
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

})();
