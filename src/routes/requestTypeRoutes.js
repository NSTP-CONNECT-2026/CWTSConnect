/**
 * CWTSConnect — Request Type Routes
 * Routes for retrieving and managing community services / request types.
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getRequestTypes,
  createRequestType,
  updateRequestType,
  deleteRequestType
} = require('../controllers/requestTypeController');

const router = express.Router();

/**
 * GET /api/request-types
 * Retrieve all offered services (Publicly accessible catalog)
 */
router.get('/', getRequestTypes);

/**
 * Coordinator-only routes: Add, Edit, Delete
 */
router.post('/', isAuthenticated, roleMiddleware('nstp_official'), createRequestType);
router.put('/:id', isAuthenticated, roleMiddleware('nstp_official'), updateRequestType);
router.delete('/:id', isAuthenticated, roleMiddleware('nstp_official'), deleteRequestType);

module.exports = router;
