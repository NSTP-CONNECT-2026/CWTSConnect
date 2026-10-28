/**
 * CWTSConnect — NSTP Coordinator Feedback & Performance Evaluation Monitoring Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Handles:
 *  - 2-Tab Navigation (Community Feedback Logs vs Performance Evaluation Records)
 *  - Batch filtering and real-time search
 *  - Section 12 Skeleton loading states
 */

(function () {
  'use strict';

  let deployments = [];
  let feedbackRecords = [];
  let evaluationRecords = [];

  let currentFbBatch = 'all';
  let currentFbSearch = '';
  let currentEvalBatch = 'all';
  let currentEvalSearch = '';

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupTabSwitcher();
    setupFilters();
    setupModalListeners();
    showLoading();
    try {
      await loadRecords();
    } catch (err) {
      console.error('Error loading coordinator feedback & evaluations:', err);
    } finally {
      hideLoading();
    }
  }

  function setupTabSwitcher() {
    const tabBtns = document.querySelectorAll('#nstpFeTabsBar .deployment-tab-btn');
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

  function setupFilters() {
    const fbDepFilter = document.getElementById('fbDeploymentFilter');
    if (fbDepFilter) {
      fbDepFilter.addEventListener('change', function () {
        currentFbBatch = this.value;
        filterAndRenderFeedback();
      });
    }

    const fbSearch = document.getElementById('fbSearchInput');
    if (fbSearch) {
      fbSearch.addEventListener('input', function () {
        currentFbSearch = this.value.trim().toLowerCase();
        filterAndRenderFeedback();
      });
    }

    const evalDepFilter = document.getElementById('evalDeploymentFilter');
    if (evalDepFilter) {
      evalDepFilter.addEventListener('change', function () {
        currentEvalBatch = this.value;
        filterAndRenderEvaluations();
      });
    }

    const evalSearch = document.getElementById('evalSearchInput');
    if (evalSearch) {
      evalSearch.addEventListener('input', function () {
        currentEvalSearch = this.value.trim().toLowerCase();
        filterAndRenderEvaluations();
      });
    }
  }

  function showLoading() {
    const skeleton = document.getElementById('nstpFeSkeleton');
    const content = document.getElementById('nstpFeContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('nstpFeSkeleton');
    const content = document.getElementById('nstpFeContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadRecords() {
    try {
      const res = await fetch('/api/nstp/feedback-evaluations/records');
      const result = await res.json();

      if (result.success) {
        deployments = result.deployments || [];
        const rawFeedback = result.feedback || [];
        const seenFb = new Set();
        feedbackRecords = rawFeedback.filter(f => {
          if (!f.student_user_id) return true;
          const k = `${f.deployment_id}_${f.student_user_id}`;
          if (seenFb.has(k)) return false;
          seenFb.add(k);
          return true;
        });

        const rawEval = result.evaluations || [];
        const seenEv = new Set();
        evaluationRecords = rawEval.filter(ev => {
          if (!ev.student_user_id || !ev.deployment_id) return true;
          const k = `${ev.deployment_id}_${ev.student_user_id}`;
          if (seenEv.has(k)) return false;
          seenEv.add(k);
          return true;
        });

        populateDeploymentFilters();
        filterAndRenderFeedback();
        filterAndRenderEvaluations();

        setElText('nstpFeedbackBadge', feedbackRecords.length);
        setElText('nstpEvaluationBadge', evaluationRecords.length);
      }
    } catch (err) {
      console.error('Fetch error for records:', err);
    }
  }

  function populateDeploymentFilters() {
    const fbSelect = document.getElementById('fbDeploymentFilter');
    const evalSelect = document.getElementById('evalDeploymentFilter');

    const optionsHtml = deployments.map(d => {
      let label = d.deployment_batch_name || 'Deployment Batch';
      if (d.activity_title && !label.includes(d.activity_title)) {
        label += ` - ${d.activity_title}`;
      }
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    if (fbSelect) {
      fbSelect.innerHTML = '<option value="all">All Deployment Batches</option>' + optionsHtml;
    }
    if (evalSelect) {
      evalSelect.innerHTML = '<option value="all">All Deployment Batches</option>' + optionsHtml;
    }
  }

  function filterAndRenderFeedback() {
    let filtered = feedbackRecords;

    if (currentFbBatch && currentFbBatch !== 'all') {
      filtered = filtered.filter(r => r.deployment_id === currentFbBatch);
    }

    if (currentFbSearch) {
      filtered = filtered.filter(r => {
        const comm = (r.community_name || '').toLowerCase();
        const act = (r.activity_title || '').toLowerCase();
        const batch = (r.deployment_batch_name || '').toLowerCase();
        const student = (r.target_student || r.student_name || '').toLowerCase();
        const comments = (r.comments || '').toLowerCase();
        const submitted = (r.submitted_by || '').toLowerCase();
        return comm.includes(currentFbSearch) ||
               act.includes(currentFbSearch) ||
               batch.includes(currentFbSearch) ||
               student.includes(currentFbSearch) ||
               comments.includes(currentFbSearch) ||
               submitted.includes(currentFbSearch);
      });
    }

    renderFeedbackTable(filtered);
  }

  function renderFeedbackTable(records) {
    const tbody = document.getElementById('nstpFeedbackBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">No community feedback logs found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const commName = escapeHtml(r.community_name || 'Partner Community');
      const submittedBy = escapeHtml(r.submitted_by || 'Community Official');
      const actTitle = escapeHtml(r.activity_title || 'Community Service Activity');
      const batchName = escapeHtml(r.deployment_batch_name || 'Deployment Batch');
      const targetStudent = escapeHtml(r.target_student || r.student_name || 'Student Volunteer');
      const rating = Number(r.rating || 5);
      const fullComments = (r.comments || '').trim() || 'No remarks provided.';
      const displayComments = truncateText(fullComments, 50);
      const dateStr = escapeHtml(r.date_submitted || '---');

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem;">${commName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${submittedBy}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${actTitle}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${batchName}</div>
          </td>
          <td>
            <div style="font-size: 0.875rem; font-weight: 600;">${targetStudent}</div>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 800; color: #D97706; font-size: 0.9375rem;">${rating} / 5 Stars</span>
          </td>
          <td style="font-size: 0.8125rem; max-width: 200px; min-width: 150px; width: 180px; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere; white-space: normal;" title="${escapeHtml(fullComments)}">
            "${displayComments}"
          </td>
          <td style="font-size: 0.8125rem; text-align: center; white-space: nowrap;">
            ${dateStr}
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterAndRenderEvaluations() {
    let filtered = evaluationRecords;

    if (currentEvalBatch && currentEvalBatch !== 'all') {
      filtered = filtered.filter(r => r.deployment_id === currentEvalBatch);
    }

    if (currentEvalSearch) {
      filtered = filtered.filter(r => {
        const name = (r.student_name || '').toLowerCase();
        const num = (r.student_number || '').toLowerCase();
        const course = (r.course || '').toLowerCase();
        const comm = (r.community_name || '').toLowerCase();
        const act = (r.activity_title || '').toLowerCase();
        const batch = (r.deployment_batch_name || '').toLowerCase();
        const remarks = (r.evaluator_remarks || '').toLowerCase();
        const grade = (r.performance_grade || '').toLowerCase();
        return name.includes(currentEvalSearch) ||
               num.includes(currentEvalSearch) ||
               course.includes(currentEvalSearch) ||
               comm.includes(currentEvalSearch) ||
               act.includes(currentEvalSearch) ||
               batch.includes(currentEvalSearch) ||
               remarks.includes(currentEvalSearch) ||
               grade.includes(currentEvalSearch);
      });
    }

    renderEvaluationTable(filtered);
  }

  function renderEvaluationTable(records) {
    const tbody = document.getElementById('nstpEvalBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">No student evaluation records found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const name = escapeHtml(r.student_name || 'Student Volunteer');
      const num = escapeHtml(r.student_number || '---');
      const course = escapeHtml(r.course || 'BSIT');
      const sec = r.section ? (String(r.section).toLowerCase().startsWith('section') ? r.section : `Section ${String(r.section).replace(/^sec\.?\s*/i, '')}`) : '';
      const yr = r.year_level ? `(${r.year_level})` : '';
      const courseStr = `${course}${sec ? ` • ${sec}` : ''}${yr ? ` • ${yr}` : ''}`.trim();

      const commName = escapeHtml(r.community_name || 'Partner Community');
      const actTitle = escapeHtml(r.activity_title || 'Community Activity');
      const batchName = escapeHtml(r.deployment_batch_name || 'Deployment Batch');
      const depSub = batchName !== 'Deployment Batch' && !actTitle.includes(batchName)
        ? `${commName} • ${batchName}`
        : commName;

      const score = Number(r.overall_score || 5).toFixed(2);
      const grade = escapeHtml(r.performance_grade || 'Outstanding');
      const gradeBadgeHtml = getGradeBadgeHtml(r.performance_grade);
      const fullRemarks = (r.evaluator_remarks || '').trim() || 'No remarks provided.';
      const displayRemarks = truncateText(fullRemarks, 50);
      const dateStr = escapeHtml(r.evaluation_date || '---');

      return `
        <tr class="clickable-eval-row" data-eval-id="${escapeHtml(r.evaluation_id)}" title="Click row to view 4-criteria rubric breakdown">
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem;">${name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${num} • ${courseStr}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${actTitle}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${depSub}</div>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 800; color: var(--cwts-primary-dark); font-size: 1rem;">${score}</span>
          </td>
          <td style="text-align: center;">
            ${gradeBadgeHtml}
          </td>
          <td style="font-size: 0.8125rem; max-width: 240px; line-height: 1.4; word-break: break-word; overflow-wrap: anywhere; white-space: normal;" title="${escapeHtml(fullRemarks)}">
            "${displayRemarks}"
          </td>
          <td style="font-size: 0.8125rem; text-align: center; white-space: nowrap;">
            ${dateStr}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.clickable-eval-row').forEach(row => {
      row.addEventListener('click', function () {
        const id = this.getAttribute('data-eval-id');
        const ev = evaluationRecords.find(e => String(e.evaluation_id) === String(id));
        if (ev) {
          openCriteriaModal(ev);
        }
      });
    });
  }

  function formatScore(val) {
    if (val === undefined || val === null || val === '') return '5.0';
    const num = Number(val);
    return isNaN(num) ? '5.0' : num.toFixed(1);
  }

  function getGradeBadgeHtml(grade) {
    const g = String(grade || 'Outstanding').trim();
    const lower = g.toLowerCase();
    if (lower === 'outstanding') {
      return `<span class="badge badge-verified">${escapeHtml(g)}</span>`;
    }
    if (lower === 'very satisfactory') {
      return `<span class="badge" style="background: rgba(30, 58, 138, 0.12); color: #1E3A8A; border: 1px solid rgba(30, 58, 138, 0.25);">${escapeHtml(g)}</span>`;
    }
    if (lower === 'satisfactory') {
      return `<span class="badge badge-pending">${escapeHtml(g)}</span>`;
    }
    return `<span class="badge badge-rejected">${escapeHtml(g || 'Needs Improvement')}</span>`;
  }

  function truncateText(str, maxLen = 50) {
    if (!str) return '';
    const trimmed = String(str).trim();
    if (trimmed.length <= maxLen) return escapeHtml(trimmed);
    return escapeHtml(trimmed.substring(0, maxLen)) + '...';
  }

  function openCriteriaModal(ev) {
    const modal = document.getElementById('criteriaDetailsModal');
    if (!modal) return;

    const name = ev.student_name || 'Student Volunteer';
    const num = ev.student_number || '---';
    const course = ev.course || 'BSIT';
    const sec = ev.section ? (String(ev.section).toLowerCase().startsWith('section') ? ev.section : `Section ${String(ev.section).replace(/^sec\.?\s*/i, '')}`) : '';
    const yr = ev.year_level ? `(${ev.year_level})` : '';
    const courseStr = `${course}${sec ? ` • ${sec}` : ''}${yr ? ` • ${yr}` : ''}`.trim();

    setElText('modalStudentNameTitle', `${name} - Evaluation`);
    setElText('modalDetailStudentName', name);
    setElText('modalDetailStudentMeta', `${num} • ${courseStr}`);

    setElText('modalDetailActivityTitle', ev.activity_title || 'Community Service Activity');
    const batchName = ev.deployment_batch_name || 'Deployment Batch';
    const commName = ev.community_name || 'Partner Community';
    setElText('modalDetailCommunityMeta', `${commName} • ${batchName}`);

    const evaluator = ev.evaluator_name || 'Community Official';
    const evalDate = ev.evaluation_date || '---';
    setElText('modalDetailEvaluatorMeta', `${evaluator} • ${evalDate}`);

    const gradeBadge = document.getElementById('modalDetailGradeBadge');
    if (gradeBadge) {
      gradeBadge.innerHTML = getGradeBadgeHtml(ev.performance_grade);
    }

    const score = Number(ev.overall_score || 5).toFixed(2);
    setElText('modalDetailOverallScore', `Score: ${score} / 5.00`);

    const crit = ev.criteria || {};
    setElText('modalCritPunctuality', `${formatScore(crit.punctuality?.score)} / 5.0`);
    setElText('modalCritEngagement', `${formatScore(crit.community_engagement?.score)} / 5.0`);
    setElText('modalCritTeamwork', `${formatScore(crit.teamwork?.score)} / 5.0`);
    setElText('modalCritInitiative', `${formatScore(crit.initiative_attitude?.score)} / 5.0`);

    const fullRemarks = (ev.evaluator_remarks || '').trim() || 'No remarks provided.';
    setElText('modalDetailRemarks', `"${fullRemarks}"`);

    modal.classList.add('active');
  }

  function closeCriteriaModal() {
    const modal = document.getElementById('criteriaDetailsModal');
    if (modal) modal.classList.remove('active');
  }

  function setupModalListeners() {
    const closeBtn = document.getElementById('closeCriteriaModalBtn');
    const footerCloseBtn = document.getElementById('closeCriteriaModalFooterBtn');
    const modal = document.getElementById('criteriaDetailsModal');

    if (closeBtn) closeBtn.addEventListener('click', closeCriteriaModal);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeCriteriaModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeCriteriaModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCriteriaModal();
    });
  }

  function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
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
