/**
 * CWTSConnect — Skills Controller
 * Endpoints for coordinator skill management.
 */

const skillService = require('../services/skillService');

/**
 * GET /api/skills
 * Retrieve all skills (Public or authenticated)
 */
async function getSkills(req, res) {
  try {
    const activeOnly = req.query.active === 'true';
    const skills = await skillService.getAllSkills({ activeOnly });
    return res.status(200).json({
      success: true,
      data: skills,
      total: skills.length
    });
  } catch (err) {
    console.error('getSkills error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve skills catalog.'
    });
  }
}

/**
 * POST /api/nstp/skills
 * Coordinator creates a new skill
 */
async function createSkill(req, res) {
  try {
    const { name, description, category } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Skill name is required.'
      });
    }

    const created = await skillService.createSkill({
      name: name.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim()
    });

    return res.status(201).json({
      success: true,
      message: `Skill "${created.name}" created successfully.`,
      data: created
    });
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('required'))) {
      console.warn(`[skillController:createSkill] ${err.message}`);
    } else {
      console.error('createSkill error:', err);
    }
    const status = err.message && err.message.includes('already exists') ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to create skill.'
    });
  }
}

/**
 * PUT /api/nstp/skills/:id
 * Coordinator updates a skill
 */
async function updateSkill(req, res) {
  try {
    const { id } = req.params;
    const { name, description, category, is_active } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Skill ID parameter is required.'
      });
    }

    const updated = await skillService.updateSkill(id, {
      name: name ? name.trim() : undefined,
      description: description ? description.trim() : undefined,
      category: category ? category.trim() : undefined,
      is_active
    });

    return res.json({
      success: true,
      message: `Skill "${updated.name}" updated successfully.`,
      data: updated
    });
  } catch (err) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('not found') || err.message.includes('required'))) {
      console.warn(`[skillController:updateSkill] ${err.message}`);
    } else {
      console.error('updateSkill error:', err);
    }
    const status = err.message && err.message.includes('already exists') ? 409 : (err.message && err.message.includes('not found') ? 404 : 400);
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update skill.'
    });
  }
}

/**
 * DELETE /api/nstp/skills/:id
 * Coordinator deletes a skill
 */
async function deleteSkill(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Skill ID parameter is required.'
      });
    }

    await skillService.deleteSkill(id);

    return res.status(200).json({
      success: true,
      message: 'Skill deleted successfully.'
    });
  } catch (err) {
    console.error('deleteSkill error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to delete skill.'
    });
  }
}

module.exports = {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill
};
