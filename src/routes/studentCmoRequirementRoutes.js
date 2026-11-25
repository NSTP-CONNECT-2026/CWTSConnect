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

// Configure multer for file uploads (supports all image types and PDF up to 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (supports clear phone camera pictures)
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/heic',
      'image/heif'
    ];
    if (allowedTypes.includes(mime) || mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a clear photo/image (JPG, PNG, WEBP) or PDF document.'), false);
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