/**
 * NSTPConnect - DSS Matching Controller
 * Handles DSS matching HTTP requests and responses
 */

const dssMatchingService = require('../services/dssMatchingService');

/**
 * Gets DSS dashboard summary statistics
 * GET /api/nstp/dss/summary
 */
async function getDashboardSummary(req, res) {
  try {
    const summary = await dssMatchingService.getDashboardSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('DSS Dashboard Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets all approved community requests
 * GET /api/nstp/dss/approved-requests
 */
async function getApprovedRequests(req, res) {
  try {
    const requests = await dssMatchingService.getApprovedRequests();
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get Approved Requests Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets all eligible students
 * GET /api/nstp/dss/eligible-students
 */
async function getEligibleStudents(req, res) {
  try {
    const students = await dssMatchingService.getEligibleStudents();
    
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get Eligible Students Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Generates match recommendations for a specific request
 * POST /api/nstp/dss/generate/:requestId
 */
async function generateMatchRecommendations(req, res) {
  try {
    const { requestId } = req.params;
    const generatedBy = req.session.user.user_id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const recommendations = await dssMatchingService.generateMatchRecommendations(
      requestId, 
      generatedBy
    );
    
    res.json({
      success: true,
      message: `Generated ${recommendations.length} student recommendations`,
      data: {
        request_id: requestId,
        total_recommendations: recommendations.length,
        recommendations: recommendations
      }
    });
  } catch (error) {
    console.error('Generate Match Recommendations Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to generate matches: ' + error.message
    });
  }
}

/**
 * Gets saved match results for a request
 * GET /api/nstp/dss/results/:requestId
 */
async function getMatchResults(req, res) {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const results = await dssMatchingService.getMatchResults(requestId);
    
    res.json({
      success: true,
      data: {
        request_id: requestId,
        total_results: results.length,
        results: results
      }
    });
  } catch (error) {
    console.error('Get Match Results Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets student profile for quick view
 * GET /api/nstp/dss/student/:studentId
 */
async function getStudentQuickView(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const student = await dssMatchingService.getStudentQuickView(studentId);
    
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get Student Quick View Error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to load student profile: ' + error.message
    });
  }
}

module.exports = {
  getDashboardSummary,
  getApprovedRequests,
  getEligibleStudents,
  generateMatchRecommendations,
  getMatchResults,
  getStudentQuickView
};