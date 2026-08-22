/**
 * NSTPConnect - Community Official Routes
 * Defines Community Official dashboard and API routes
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { getCommunityOfficialProfile } = require('../controllers/communityController');

const router = express.Router();

// Apply middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('community_official'));

/**
 * GET /api/community/me
 * Get Community Official profile information
 */
router.get('/me', getCommunityOfficialProfile);

module.exports = router;