const feedbackEvaluationService = require('../services/feedbackEvaluationService');

/**
 * GET /api/student/feedback-evaluations
 * Returns community feedback and performance evaluations recorded for the logged-in student.
 * Read-only for students.
 */
async function getStudentFeedbackAndEvaluations(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized. No session found.' });
    }

    const studentUserId = sessionUser.user_id;
    const data = await feedbackEvaluationService.getStudentFeedbackAndEvaluations(studentUserId);

    return res.status(200).json({
      success: true,
      feedback: data.feedback,
      evaluations: data.evaluations
    });
  } catch (error) {
    console.error('Error fetching student feedback and evaluations:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving feedback and evaluations.' });
  }
}

module.exports = {
  getStudentFeedbackAndEvaluations
};
