const express = require('express');
const multer = require('multer');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { requireCompleteProfile } = require('../middlewares/profileCompleteMiddleware');
const {
  getCmoRequirements,
  uploadCmoRequirementFile,
  getCmoRequirementsStatusSummary
} = require('../controllers/studentCmoRequirementController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
    }
  }
});

// Apply middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('student'));

// GET /api/student/cmo-requirements
// Returns all CMO requirement records for the logged-in student
router.get('/', getCmoRequirements);

// GET /api/student/cmo-requirements/status
// Returns CMO requirements status summary
router.get('/status', getCmoRequirementsStatusSummary);

// POST /api/student/cmo-requirements/upload
// Uploads or replaces a CMO requirement file
router.post('/upload', 
  requireCompleteProfile,
  upload.single('file'),
  uploadCmoRequirementFile
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed per upload.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;