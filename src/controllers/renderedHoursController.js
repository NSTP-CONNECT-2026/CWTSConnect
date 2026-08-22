/**
 * NSTPConnect - Rendered Hours Controller
 * Handles rendered service hours HTTP requests
 */

const renderedHoursService = require('../services/renderedHoursService');

/**
 * Gets rendered hours summary for deployment
 * GET /api/nstp/rendered-hours/:deploymentId/summary
 */
async function getRenderedHoursSummary(req, res) {
  try {
    const { deploymentId } = req.params;
    const summaries = await renderedHoursService.getRenderedHoursSummary(deploymentId);
    
    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    console.error('Get Rendered Hours Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets student's hours summary
 * GET /api/student/rendered-hours/:deploymentId
 */
async function getStudentHoursSummary(req, res) {
  try {
    const { deploymentId } = req.params;
    const studentId = req.session.user.user_id;

    const summary = await renderedHoursService.getStudentHoursSummary(deploymentId, studentId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get Student Hours Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Refreshes student's hours summary
 * POST /api/nstp/rendered-hours/:deploymentId/student/:studentId/refresh
 */
async function refreshStudentHoursSummary(req, res) {
  try {
    const { deploymentId, studentId } = req.params;

    await renderedHoursService.refreshStudentHoursSummary(deploymentId, studentId);
    
    res.json({
      success: true,
      message: 'Hours summary refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh Hours Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets deployment hours statistics
 * GET /api/nstp/rendered-hours/:deploymentId/statistics
 */
async function getDeploymentHoursStatistics(req, res) {
  try {
    const { deploymentId } = req.params;
    const stats = await renderedHoursService.getDeploymentHoursStatistics(deploymentId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Hours Statistics Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets students needing verification
 * GET /api/nstp/rendered-hours/:deploymentId/pending-verification
 */
async function getStudentsNeedingVerification(req, res) {
  try {
    const { deploymentId } = req.params;
    const students = await renderedHoursService.getStudentsNeedingVerification(deploymentId);
    
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get Students Needing Verification Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Exports hours summary to CSV
 * GET /api/nstp/rendered-hours/:deploymentId/export
 */
async function exportHoursSummaryCSV(req, res) {
  try {
    const { deploymentId } = req.params;
    const csvContent = await renderedHoursService.exportHoursSummaryCSV(deploymentId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hours-summary-${deploymentId}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export Hours Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getRenderedHoursSummary,
  getStudentHoursSummary,
  refreshStudentHoursSummary,
  getDeploymentHoursStatistics,
  getStudentsNeedingVerification,
  exportHoursSummaryCSV,
  // Aliases for route compatibility
  getMyHours: getStudentHoursSummary,
  getStudentHours: async (req, res) => {
    try {
      const { studentId } = req.params;
      const summary = await renderedHoursService.getStudentHoursSummaryById(studentId);
      res.json({ success: true, ...summary });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  getDeploymentHours: getRenderedHoursSummary,
  getDeploymentStatistics: getDeploymentHoursStatistics,
  exportStudentHours: async (req, res) => {
    try {
      const { studentId } = req.params;
      const csvContent = await renderedHoursService.exportStudentHoursCSV(studentId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="student-hours-${studentId}.csv"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  exportDeploymentHours: exportHoursSummaryCSV
};