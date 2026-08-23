/**
 * CWTSConnect — Community Official Student Feedback & Performance Evaluation Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Handles:
 *  - Tab switching between Community Feedback and Performance Evaluation
 *  - Loading deployment batches and student rosters
 *  - Star rating picker and 4-criteria performance evaluation sliders
 *  - Submitting feedback and academic evaluations
 *  - Section 12 Skeleton loading states
 */

(function () {
  'use strict';

  let deployments = [];
  let students = [];
  let feedbackRecords = [];
  let evaluationRecords = [];

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupTabSwitcher();
    setupStarPicker();
    setupEvaluationSliders();
    setupFormSubmissions();
    showLoading();
    try {
      await Promise.all([
        loadDeploymentsAndStudents(),
        loadHistoricalRecords()
      ]);
    } catch (err) {
      console.error('Error initializing community feedback page:', err);
      showToast('Failed to initialize page data.', 'error');
    } finally {
      hideLoading();
    }
  }

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

  function setupStarPicker() {
    const picker = document.getElementById('fbStarPicker');
    const inputVal = document.getElementById('fbRatingVal');
    if (!picker || !inputVal) return;

    const stars = picker.querySelectorAll('svg');
    stars.forEach(star => {
      star.addEventListener('click', function () {
        const val = parseInt(this.getAttribute('data-val'), 10) || 5;
        inputVal.value = val;

        stars.forEach(s => {
          const sVal = parseInt(s.getAttribute('data-val'), 10);
          if (sVal <= val) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });
  }

  function setupEvaluationSliders() {
    const sliders = [
      { id: 'ratingPunctuality', valId: 'punctualityVal' },
      { id: 'ratingEngagement', valId: 'engagementVal' },
      { id: 'ratingTeamwork', valId: 'teamworkVal' },
      { id: 'ratingAttitude', valId: 'attitudeVal' }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const valEl = document.getElementById(s.valId);
      if (el && valEl) {
        el.addEventListener('input', function () {
          valEl.textContent = `${Number(this.value).toFixed(1)}`;
          recalculateOverallScore();
        });
      }
    });

    const evalDepSelect = document.getElementById('evalDeploymentSelect');
    if (evalDepSelect) {
      evalDepSelect.addEventListener('change', function () {
        populateStudentSelect('evalStudentSelect', this.value, false);
      });
    }

    const fbDepSelect = document.getElementById('fbDeploymentSelect');
    if (fbDepSelect) {
      fbDepSelect.addEventListener('change', function () {
        populateStudentSelect('fbStudentSelect', this.value, true);
      });
    }
  }

  function recalculateOverallScore() {
    const p = Number(document.getElementById('ratingPunctuality')?.value || 5);
    const ce = Number(document.getElementById('ratingEngagement')?.value || 5);
    const tw = Number(document.getElementById('ratingTeamwork')?.value || 5);
    const ia = Number(document.getElementById('ratingAttitude')?.value || 5);

    const avg = ((p + ce + tw + ia) / 4).toFixed(2);
    const previewEl = document.getElementById('evalOverallScorePreview');
    const badgeEl = document.getElementById('evalGradeBadge');

    if (previewEl) previewEl.textContent = avg;

    let grade = 'Outstanding';
    if (avg < 3.0) {
      grade = 'Needs Improvement';
    } else if (avg < 4.0) {
      grade = 'Satisfactory';
    } else if (avg < 4.75) {
      grade = 'Very Satisfactory';
    }

    if (badgeEl) badgeEl.textContent = grade;
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

  async function loadDeploymentsAndStudents() {
    try {
      const res = await fetch('/api/community/feedback-evaluations/deployments');
      const result = await res.json();

      if (result.success) {
        deployments = result.deployments || [];
        students = result.students || [];

        populateDeploymentSelects();
      }
    } catch (err) {
      console.error('Error fetching deployments:', err);
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

    const options = deployments.map(d => {
      const title = `${d.deployment_batch_name} - ${d.activity_title || 'Activity'}`;
      return `<option value="${d.deployment_id}">${escapeHtml(title)}</option>`;
    }).join('');

    if (fbSelect) {
      fbSelect.innerHTML = '<option value="">Select a deployment...</option>' + options;
    }
    if (evalSelect) {
      evalSelect.innerHTML = '<option value="">Select a deployment...</option>' + options;
    }
  }

  function populateStudentSelect(selectId, deploymentId, includeAllOption = false) {
    const select = document.getElementById(selectId);
    if (!select) return;

    if (!deploymentId) {
      select.innerHTML = includeAllOption 
        ? '<option value="">All Students in Batch</option>' 
        : '<option value="">Select a deployment first...</option>';
      return;
    }

    const filteredStudents = students.filter(s => s.deployment_id === deploymentId);
    if (filteredStudents.length === 0) {
      select.innerHTML = '<option value="">No assigned students found for this batch</option>';
      return;
    }

    const studentOptions = filteredStudents.map(s => {
      return `<option value="${s.student_user_id}">${escapeHtml(s.student_name)} (${escapeHtml(s.student_number)} - ${escapeHtml(s.course)})</option>`;
    }).join('');

    if (includeAllOption) {
      select.innerHTML = '<option value="">All Students in Batch</option>' + studentOptions;
    } else {
      select.innerHTML = '<option value="">Select a student...</option>' + studentOptions;
    }
  }

  async function loadHistoricalRecords() {
    try {
      const res = await fetch('/api/community/feedback-evaluations/records');
      const result = await res.json();

      if (result.success) {
        feedbackRecords = result.feedback || [];
        evaluationRecords = result.evaluations || [];

        renderFeedbackTable(feedbackRecords);
        renderEvaluationTable(evaluationRecords);

        setElText('commFeedbackBadge', feedbackRecords.length);
        setElText('commEvaluationBadge', evaluationRecords.length);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  }

  function renderFeedbackTable(records) {
    const tbody = document.getElementById('commFeedbackBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">No feedback records found.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const act = escapeHtml(r.activity_title || 'Community Service');
      const student = r.student_user_id ? 'Specific Student' : 'All Students in Batch';
      const rating = Number(r.rating || 5);
      const comments = escapeHtml(r.comments || '');
      const date = escapeHtml(r.date_submitted || '---');

      return `
        <tr>
          <td><strong style="color: var(--cwts-primary-dark);">${act}</strong></td>
          <td>${student}</td>
          <td><span style="font-weight: 700; color: #F59E0B;">${rating} / 5 Stars</span></td>
          <td style="font-size: 0.875rem;">"${comments}"</td>
          <td style="font-size: 0.8125rem;">${date}</td>
        </tr>
      `;
    }).join('');
  }

  function renderEvaluationTable(records) {
    const tbody = document.getElementById('commEvalBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No student evaluations recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(r => {
      const name = escapeHtml(r.student_name || 'Student Volunteer');
      const act = escapeHtml(r.activity_title || 'Community Activity');
      const score = Number(r.overall_score || 5).toFixed(2);
      const grade = escapeHtml(r.performance_grade || 'Outstanding');
      const remarks = escapeHtml(r.evaluator_remarks || '');
      const date = escapeHtml(r.evaluation_date || '---');

      return `
        <tr>
          <td><strong style="color: var(--cwts-primary-dark); font-size: 0.9375rem;">${name}</strong></td>
          <td style="font-size: 0.875rem;">${act}</td>
          <td style="text-align: center;"><strong style="color: var(--cwts-accent-green); font-size: 1rem;">${score}</strong></td>
          <td style="text-align: center;"><span class="badge badge-verified">${grade}</span></td>
          <td style="font-size: 0.875rem;">"${remarks}"</td>
          <td style="font-size: 0.8125rem;">${date}</td>
        </tr>
      `;
    }).join('');
  }

  function setupFormSubmissions() {
    const fbForm = document.getElementById('feedbackForm');
    if (fbForm) {
      fbForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const depId = document.getElementById('fbDeploymentSelect')?.value;
        const studentId = document.getElementById('fbStudentSelect')?.value || null;
        const rating = document.getElementById('fbRatingVal')?.value || 5;
        const comments = document.getElementById('fbComments')?.value || '';

        if (!depId || !comments) {
          showToast('Please select a deployment and provide comments.', 'error');
          return;
        }

        const selectedDep = deployments.find(d => d.deployment_id === depId);

        try {
          const btn = document.getElementById('submitFeedbackBtn');
          if (btn) btn.disabled = true;

          const res = await fetch('/api/community/feedback-evaluations/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deployment_id: depId,
              student_user_id: studentId,
              rating,
              comments,
              activity_title: selectedDep?.activity_title || 'Community Service Activity',
              community_name: selectedDep?.community_name || 'Community'
            })
          });

          const result = await res.json();
          if (result.success) {
            showToast('Feedback submitted successfully!', 'success');
            document.getElementById('fbComments').value = '';
            await loadHistoricalRecords();
          } else {
            showToast(result.message || 'Failed to submit feedback.', 'error');
          }
        } catch (err) {
          console.error('Error submitting feedback:', err);
          showToast('Server error submitting feedback.', 'error');
        } finally {
          const btn = document.getElementById('submitFeedbackBtn');
          if (btn) btn.disabled = false;
        }
      });
    }

    const evalForm = document.getElementById('evaluationForm');
    if (evalForm) {
      evalForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const depId = document.getElementById('evalDeploymentSelect')?.value;
        const studentId = document.getElementById('evalStudentSelect')?.value;
        const p = document.getElementById('ratingPunctuality')?.value || 5;
        const ce = document.getElementById('ratingEngagement')?.value || 5;
        const tw = document.getElementById('ratingTeamwork')?.value || 5;
        const ia = document.getElementById('ratingAttitude')?.value || 5;
        const remarks = document.getElementById('evalRemarks')?.value || '';

        if (!depId || !studentId) {
          showToast('Please select a deployment and student volunteer.', 'error');
          return;
        }

        const selectedDep = deployments.find(d => d.deployment_id === depId);
        const selectedStudent = students.find(s => s.student_user_id === studentId);

        try {
          const btn = document.getElementById('submitEvalBtn');
          if (btn) btn.disabled = true;

          const res = await fetch('/api/community/feedback-evaluations/evaluation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deployment_id: depId,
              student_user_id: studentId,
              student_name: selectedStudent?.student_name || 'Student Volunteer',
              rating_punctuality: p,
              rating_community_engagement: ce,
              rating_teamwork: tw,
              rating_initiative_attitude: ia,
              evaluator_remarks: remarks,
              activity_title: selectedDep?.activity_title || 'Community Service Activity',
              community_name: selectedDep?.community_name || 'Community'
            })
          });

          const result = await res.json();
          if (result.success) {
            showToast('Student performance evaluation recorded successfully!', 'success');
            document.getElementById('evalRemarks').value = '';
            await loadHistoricalRecords();
          } else {
            showToast(result.message || 'Failed to submit evaluation.', 'error');
          }
        } catch (err) {
          console.error('Error submitting evaluation:', err);
          showToast('Server error submitting evaluation.', 'error');
        } finally {
          const btn = document.getElementById('submitEvalBtn');
          if (btn) btn.disabled = false;
        }
      });
    }
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = msg;
    if (type === 'success') {
      toast.style.background = 'rgba(16, 185, 129, 0.15)';
      toast.style.color = '#0B3D2E';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (type === 'error') {
      toast.style.background = 'rgba(220, 38, 38, 0.15)';
      toast.style.color = '#7F1D1D';
      toast.style.border = '1px solid rgba(220, 38, 38, 0.3)';
    } else {
      toast.style.background = 'rgba(59, 130, 246, 0.15)';
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
