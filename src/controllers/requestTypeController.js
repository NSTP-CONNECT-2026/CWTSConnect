/**
 * CWTSConnect — Request Type Controller
 * Handles HTTP requests for managing school-offered community services / request types.
 */

const requestTypeService = require('../services/requestTypeService');

/**
 * GET /api/request-types
 * Accessible by both Coordinator and Community Officials
 */
async function getRequestTypes(req, res) {
  try {
    const activeOnly = req.query.active === 'true';
    const data = await requestTypeService.getAllRequestTypes({ activeOnly });
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error fetching request types:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve request types.'
    });
  }
}

/**
 * POST /api/request-types
 * Coordinator only
 */
async function createRequestType(req, res) {
  try {
    const userId = req.session && req.session.user ? req.session.user.user_id : null;
    const { name, description, required_skills, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required.'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service description is required.'
      });
    }

    const newType = await requestTypeService.createRequestType(
      { name, description, required_skills, is_active },
      userId
    );

    return res.status(201).json({
      success: true,
      data: newType,
      message: 'Request type created successfully.'
    });
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('required'))) {
      console.warn(`[requestTypeController:create] ${err.message}`);
    } else {
      console.error('Error creating request type:', err);
    }
    const status = err.message && err.message.includes('already exists') ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to create request type.'
    });
  }
}

/**
 * PUT /api/request-types/:id
 * Coordinator only
 */
async function updateRequestType(req, res) {
  try {
    const userId = req.session && req.session.user ? req.session.user.user_id : null;
    const { id } = req.params;
    const { name, description, required_skills, is_active } = req.body;

    const updated = await requestTypeService.updateRequestType(
      id,
      { name, description, required_skills, is_active },
      userId
    );

    return res.json({
      success: true,
      data: updated,
      message: 'Request type updated successfully.'
    });
  } catch (err) {
    console.error('Error updating request type:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update request type.'
    });
  }
}

/**
 * DELETE /api/request-types/:id
 * Coordinator only
 */
async function deleteRequestType(req, res) {
  try {
    const { id } = req.params;
    await requestTypeService.deleteRequestType(id);

    return res.json({
      success: true,
      message: 'Request type deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting request type:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to delete request type.'
    });
  }
}

module.exports = {
  getRequestTypes,
  createRequestType,
  updateRequestType,
  deleteRequestType
};
