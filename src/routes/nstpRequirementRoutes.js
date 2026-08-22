/**
 * NSTPConnect - NSTP Requirement Routes
 * Defines NSTP Official requirement management routes
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getRequirements,
  getStudentRequirements,
  reviewRequirementById,
  getRequirementFile,
  getComplianceSummary
} = require('../controllers/nstpRequirementController');

const router = express.Router();

// Apply authentication and role middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('nstp_official'));

/**
 * GET /api/nstp/requirements
 * Get all students with CMO requirement records and compliance summary
 * Query params: status (optional), search (optional)
 */
router.get('/requirements', getRequirements);

/**
 * GET /api/nstp/requirements/:studentId
 * Get detailed requirement records of one student
 */
router.get('/requirements/:studentId', getStudentRequirements);

/**
 * PUT /api/nstp/requirements/:requirementId/review
 * Approve or reject one requirement
 * Body: { status: 'approved'|'rejected', remarks?: string }
 */
router.put('/requirements/:requirementId/review', reviewRequirementById);

/**
 * GET /api/nstp/requirements/file/:requirementId
 * Get secure preview or download URL for uploaded requirement file
 */
router.get('/requirements/file/:requirementId', getRequirementFile);

/**
 * GET /api/nstp/compliance-summary
 * Get dashboard summary counts
 */
router.get('/compliance-summary', getComplianceSummary);

/**
 * GET /api/nstp/debug/files
 * Debug endpoint to check uploaded files (temporary)
 */
router.get('/debug/files', async (req, res) => {
  try {
    const { data: files, error } = await require('../config/supabaseClient')
      .from('student_cmo_requirements')
      .select('requirement_id, user_id, requirement_type, file_name, file_path, status, uploaded_at')
      .limit(10);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, files: files || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;