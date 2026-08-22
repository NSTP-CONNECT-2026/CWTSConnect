const express = require('express');
const { login, logout } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/login - Shared login for both Students and NSTP Officials
router.post('/login', login);

// POST /api/auth/logout - Shared logout
router.post('/logout', logout);

module.exports = router;