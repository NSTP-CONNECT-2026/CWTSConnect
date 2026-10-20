/**
 * CWTSConnect — Skills Routes
 * Routes for retrieving and managing the skills catalog.
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill
} = require('../controllers/skillController');

const router = express.Router();

/**
 * GET /api/skills
 * Retrieve all skills (Publicly accessible catalog)
 */
router.get('/', getSkills);

/**
 * Coordinator-only routes: Add, Edit, Delete Skill
 */
router.post('/', isAuthenticated, roleMiddleware('nstp_official'), createSkill);
router.put('/:id', isAuthenticated, roleMiddleware('nstp_official'), updateSkill);
router.delete('/:id', isAuthenticated, roleMiddleware('nstp_official'), deleteSkill);

module.exports = router;
