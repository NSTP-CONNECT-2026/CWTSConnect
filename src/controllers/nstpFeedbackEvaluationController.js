/**
 * NSTPConnect - NSTP Coordinator Feedback & Performance Evaluation Monitoring Controller
 * Handles coordinator monitoring of:
 *  - Community feedback & ratings submitted by partner communities
 *  - Academic performance evaluations scored by community supervisors
 */

const feedbackEvaluationService = require('../services/feedbackEvaluationService');

/**
 * GET /api/nstp/feedback-evaluations/records
 * Returns all feedback and performance evaluations across all deployments
 */
async function getNstpFeedbackAndEvaluations(req, res) {
  try {
    const data = await feedbackEvaluationService.getAllCoordinatorFeedbackAndEvaluations();

    return res.json({
      success: true,
      deployments: data.deployments,
      feedback: data.feedback,
      evaluations: data.evaluations
    });
  } catch (error) {
    console.error('Error fetching coordinator feedback and evaluations:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getNstpFeedbackAndEvaluations
};
