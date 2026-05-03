const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getProfile,
  createProfile,
  updateProfile
} = require('../controllers/studentProfileController');

const router = express.Router();

// ─── API Routes ───────────────────────────────────────────────────────────────
// All routes require authentication and student role
router.use(isAuthenticated);
router.use(roleMiddleware('student'));

// GET /api/student/profile - Get student profile
router.get('/profile', getProfile);

// POST /api/student/profile - Create student profile
router.post('/profile', createProfile);

// PUT /api/student/profile - Update student profile
router.put('/profile', updateProfile);

module.exports = router;