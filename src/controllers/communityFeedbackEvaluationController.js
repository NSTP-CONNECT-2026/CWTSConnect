/**
 * NSTPConnect - Community Official Feedback & Performance Evaluation Controller
 * Handles HTTP requests for:
 *  - Getting deployments and assigned student volunteers with evaluation status
 *  - Submitting activity-level community feedback / commendations
 *  - Submitting academic performance evaluations on 4 standardized criteria
 *  - Retrieving history and metrics
 */

const feedbackEvaluationService = require('../services/feedbackEvaluationService');

/**
 * GET /api/community/feedback-evaluations/deployments
 * Returns deployments, students, and evaluation status for the community official
 */
async function getCommunityDeploymentsForEvaluation(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = await feedbackEvaluationService.getCommunityDeploymentsAndStudents(userId);

    return res.json({
      success: true,
      deployments: data.deployments,
      students: data.students,
      stats: data.stats
    });
  } catch (error) {
    console.error('Error fetching community deployments for evaluation:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/community/feedback-evaluations/records
 * Returns all submitted feedback and performance evaluations for the community official
 */
async function getCommunityFeedbackAndEvaluations(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [feedback, evaluations] = await Promise.all([
      feedbackEvaluationService.getFeedbackRecords(userId),
      feedbackEvaluationService.getEvaluationRecords(userId)
    ]);

    return res.json({
      success: true,
      feedback,
      evaluations
    });
  } catch (error) {
    console.error('Error fetching community feedback and evaluations:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/community/feedback-evaluations/feedback
 * Records a new community feedback / commendation / suggestion
 */
async function submitCommunityFeedback(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    const sessionUser = req.session?.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.body.is_batch) {
      const records = await feedbackEvaluationService.saveBatchCommunityFeedback(userId, sessionUser, req.body);
      return res.json({
        success: true,
        message: 'Batch community feedback applied successfully to all students.',
        data: records
      });
    }

    const record = await feedbackEvaluationService.saveCommunityFeedback(userId, sessionUser, req.body);

    return res.json({
      success: true,
      message: 'Community feedback recorded successfully.',
      data: record
    });
  } catch (error) {
    console.error('Error submitting community feedback:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/community/feedback-evaluations/evaluation
 * Records or updates a student performance evaluation on 4 standardized criteria
 */
async function submitStudentEvaluation(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    const sessionUser = req.session?.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.body.is_batch) {
      const records = await feedbackEvaluationService.saveBatchStudentEvaluation(userId, sessionUser, req.body);
      return res.json({
        success: true,
        message: 'Batch performance evaluation recorded successfully.',
        data: records
      });
    }

    const record = await feedbackEvaluationService.saveStudentEvaluation(userId, sessionUser, req.body);

    return res.json({
      success: true,
      message: 'Student performance evaluation recorded successfully.',
      data: record
    });
  } catch (error) {
    console.error('Error submitting student evaluation:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getCommunityDeploymentsForEvaluation,
  getCommunityFeedbackAndEvaluations,
  submitCommunityFeedback,
  submitStudentEvaluation
};
