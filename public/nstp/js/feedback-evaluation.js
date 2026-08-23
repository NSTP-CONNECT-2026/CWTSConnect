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
        feedbackRecords = result.feedback || [];
        evaluationRecords = result.evaluations || [];

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
      const label = `${d.deployment_batch_name} - ${d.activity_title || d.community_name || 'Activity'}`;
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
        const student = (r.target_student || r.student_name || '').toLowerCase();
        const comments = (r.comments || '').toLowerCase();
        return comm.includes(currentFbSearch) || act.includes(currentFbSearch) || student.includes(currentFbSearch) || comments.includes(currentFbSearch);
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
      const targetStudent = escapeHtml(r.target_student || r.student_name || (r.student_user_id ? 'Individual Student' : 'All Deployed Students'));
      const rating = Number(r.rating || 5);
      const comments = escapeHtml(r.comments || 'No remarks provided.');
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
            <span style="font-weight: 800; color: #F59E0B; font-size: 0.9375rem;">${rating} / 5 Stars</span>
          </td>
          <td style="font-size: 0.875rem; max-width: 320px; line-height: 1.5;">
            "${comments}"
          </td>
          <td style="font-size: 0.8125rem;">
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
        return name.includes(currentEvalSearch) || num.includes(currentEvalSearch) || course.includes(currentEvalSearch) || comm.includes(currentEvalSearch);
      });
    }

    renderEvaluationTable(filtered);
  }

  function renderEvaluationTable(records) {
    const tbody = document.getElementById('nstpEvalBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No student evaluation records found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const name = escapeHtml(r.student_name || 'Student Volunteer');
      const num = escapeHtml(r.student_number || '---');
      const course = escapeHtml(r.course || 'BSIT');
      const sec = r.section ? `Sec ${r.section}` : '';
      const yr = r.year_level ? `(Yr ${r.year_level})` : '';
      const courseStr = `${course} ${sec} ${yr}`.trim();

      const commName = escapeHtml(r.community_name || 'Partner Community');
      const actTitle = escapeHtml(r.activity_title || 'Community Activity');
      const score = Number(r.overall_score || 5).toFixed(2);
      const grade = escapeHtml(r.performance_grade || 'Outstanding');
      const remarks = escapeHtml(r.evaluator_remarks || '');
      const dateStr = escapeHtml(r.evaluation_date || '---');

      const crit = r.criteria || {};
      const punct = crit.punctuality ? `${crit.punctuality.score || 5}.0` : '5.0';
      const eng = crit.community_engagement ? `${crit.community_engagement.score || 5}.0` : '5.0';
      const team = crit.teamwork ? `${crit.teamwork.score || 5}.0` : '5.0';
      const att = crit.initiative_attitude ? `${crit.initiative_attitude.score || 5}.0` : '5.0';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark); font-size: 0.9375rem;">${name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${num} • ${courseStr}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${actTitle}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${commName}</div>
          </td>
          <td>
            <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
              <div>Punctuality: <strong style="color: var(--cwts-primary-dark);">${punct}</strong></div>
              <div>Engagement: <strong style="color: var(--cwts-primary-dark);">${eng}</strong></div>
              <div>Teamwork: <strong style="color: var(--cwts-primary-dark);">${team}</strong></div>
              <div>Initiative: <strong style="color: var(--cwts-primary-dark);">${att}</strong></div>
            </div>
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 800; color: var(--cwts-primary-dark); font-size: 1rem;">${score}</span>
          </td>
          <td style="text-align: center;">
            <span class="badge badge-verified">${grade}</span>
          </td>
          <td style="font-size: 0.875rem; max-width: 260px; line-height: 1.5;">
            "${remarks}"
          </td>
          <td style="font-size: 0.8125rem;">
            ${dateStr}
          </td>
        </tr>
      `;
    }).join('');
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
