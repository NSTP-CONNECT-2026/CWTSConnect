const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { getMe } = require('../controllers/studentDashboardController');

// All routes here require the user to be logged in AND have the student role.
router.use(isAuthenticated);
router.use(roleMiddleware('student'));

// GET /api/student/me — Returns current student's safe account data
router.get('/me', getMe);

module.exports = router;
