/**
 * CWTSConnect — Student Community Feedback & Performance Evaluation Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Handles:
 *  - 2-Tab Navigation (Community Feedback vs Performance Evaluation)
 *  - Read-only viewing of community-submitted ratings and academic evaluations
 *  - Section 12 Skeleton loading states
 */

(function () {
  'use strict';

  let feedbackData = [];
  let evaluationData = [];

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    setupTabSwitcher();
    showLoading();
    try {
      await loadFeedbackAndEvaluations();
    } catch (err) {
      console.error('Error loading feedback and evaluation data:', err);
    } finally {
      hideLoading();
    }
  }

  function setupTabSwitcher() {
    const tabBtns = document.querySelectorAll('#feTabsBar .deployment-tab-btn');
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

  function showLoading() {
    const skeleton = document.getElementById('pageSkeleton');
    const content = document.getElementById('pageContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('pageSkeleton');
    const content = document.getElementById('pageContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadFeedbackAndEvaluations() {
    try {
      const res = await fetch('/api/student/feedback-evaluations');
      const result = await res.json();

      if (result.success) {
        feedbackData = result.feedback || [];
        evaluationData = result.evaluations || [];

        renderFeedbackList(feedbackData);
        renderEvaluationList(evaluationData);
        updateTabBadges(feedbackData.length, evaluationData.length);
      } else {
        renderEmptyStates();
      }
    } catch (err) {
      console.error('Fetch error for feedback/evaluations:', err);
      renderEmptyStates();
    }
  }

  function updateTabBadges(fbCount, evalCount) {
    const fbBadge = document.getElementById('feedbackCountBadge');
    const evalBadge = document.getElementById('evaluationCountBadge');
    if (fbBadge) fbBadge.textContent = fbCount;
    if (evalBadge) evalBadge.textContent = evalCount;
  }

  function renderFeedbackList(list) {
    const container = document.getElementById('feedbackListContainer');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="eval-card" style="text-align: center; padding: 48px 24px;">
          <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 50%; background: rgba(11, 61, 46, 0.08); display: flex; align-items: center; justify-content: center; color: var(--cwts-primary-dark, #0B3D2E);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); margin-bottom: 4px;">No Community Feedback Recorded Yet</h4>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const commName = escapeHtml(item.community_name || 'Partner Community');
      const actTitle = escapeHtml(item.activity_title || 'Community Service Activity');
      const batchName = escapeHtml(item.deployment_batch_name || 'Deployment Batch');
      const submittedBy = escapeHtml(item.submitted_by || 'Community Official');
      const dateStr = escapeHtml(item.date_submitted || '---');
      const comments = escapeHtml(item.comments || 'No written remarks provided.');
      const rating = Number(item.rating) || 5;

      const starsHtml = renderStarRating(rating);

      return `
        <div class="eval-card">
          <div class="eval-header">
            <div>
              <div class="eval-title">${actTitle}</div>
              <div class="eval-subtitle">
                <span style="font-weight: 600; color: var(--cwts-primary-dark);">${commName}</span>
                <span>•</span>
                <span>${batchName}</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <div class="rating-stars">${starsHtml}</div>
            </div>
          </div>

          <div class="feedback-comment-box">
            "${comments}"
          </div>

          <div class="eval-footer">
            <div>
              <span>Evaluated by: </span>
              <strong style="color: var(--cwts-primary-dark);">${submittedBy}</strong>
            </div>
            <div>
              <span>Date: </span>
              <strong>${dateStr}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderEvaluationList(list) {
    const container = document.getElementById('evaluationListContainer');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="eval-card" style="text-align: center; padding: 48px 24px;">
          <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 50%; background: rgba(11, 61, 46, 0.08); display: flex; align-items: center; justify-content: center; color: var(--cwts-primary-dark, #0B3D2E);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); margin-bottom: 4px;">No Performance Evaluation Recorded Yet</h4>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const commName = escapeHtml(item.community_name || 'Partner Community');
      const actTitle = escapeHtml(item.activity_title || 'Community Service Activity');
      const batchName = escapeHtml(item.deployment_batch_name || 'Deployment Batch');
      const evaluator = escapeHtml(item.evaluator_name || 'Community Supervisor');
      const evalDate = escapeHtml(item.evaluation_date || '---');
      const overallScore = Number(item.overall_score || 5).toFixed(2);
      const grade = escapeHtml(item.performance_grade || 'Outstanding');
      const summaryRemarks = escapeHtml(item.evaluator_remarks || 'Student volunteer performed all assigned duties in an exemplary manner.');

      const crit = item.criteria || {
        punctuality: { score: 5.0, label: 'Punctuality & Attendance', remarks: 'Arrived on schedule and participated actively.' },
        community_engagement: { score: 4.8, label: 'Community Engagement & Rapport', remarks: 'Respectful and accommodating with community members.' },
        teamwork: { score: 4.9, label: 'Teamwork & Cooperation', remarks: 'Worked collaboratively with fellow students.' },
        initiative_attitude: { score: 4.7, label: 'Initiative & Work Attitude', remarks: 'Demonstrated proactive willingness to assist.' }
      };

      const criteriaKeys = Object.keys(crit);
      const criteriaCardsHtml = criteriaKeys.map(key => {
        const c = crit[key];
        const score = Number(c.score || 5).toFixed(1);
        const percent = Math.min(100, Math.round((score / 5) * 100));
        return `
          <div class="criteria-box">
            <div class="criteria-header">
              <span>${escapeHtml(c.label || key)}</span>
              <span class="criteria-score">${score} / 5.0</span>
            </div>
            <div class="criteria-meter-bg">
              <div class="criteria-meter-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="criteria-remarks">${escapeHtml(c.remarks || '')}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="eval-card">
          <div class="eval-header">
            <div>
              <div class="eval-title">${actTitle}</div>
              <div class="eval-subtitle">
                <span style="font-weight: 600; color: var(--cwts-primary-dark);">${commName}</span>
                <span>•</span>
                <span>${batchName}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--cwts-primary-dark);">
                ${overallScore} <span style="font-size: 0.875rem; color: var(--text-muted); font-weight: 500;">/ 5.0</span>
              </div>
              <span class="badge badge-verified" style="font-size: 0.8125rem; font-weight: 700; padding: 4px 12px;">
                ${grade}
              </span>
            </div>
          </div>

          <div style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
            Performance Criteria Assessment
          </div>

          <div class="criteria-grid">
            ${criteriaCardsHtml}
          </div>

          <div style="margin-top: 16px; margin-bottom: 20px;">
            <div style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">
              Evaluator Summary Remarks
            </div>
            <div class="feedback-comment-box" style="margin: 0;">
              "${summaryRemarks}"
            </div>
          </div>

          <div class="eval-footer">
            <div>
              <span>Evaluated by: </span>
              <strong style="color: var(--cwts-primary-dark);">${evaluator}</strong>
            </div>
            <div>
              <span>Evaluation Date: </span>
              <strong>${evalDate}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars += `
          <svg viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        `;
      } else {
        stars += `
          <svg class="empty" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        `;
      }
    }
    return stars;
  }

  function renderEmptyStates() {
    renderFeedbackList([]);
    renderEvaluationList([]);
    updateTabBadges(0, 0);
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
