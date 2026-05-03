const supabase = require('../config/supabaseClient');
const path = require('path');

/**
 * Uploads a file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID for folder structure
 * @param {string} requirementType - Type of requirement
 * @returns {Promise<object>} Upload result with file path and URL
 */
async function uploadCmoRequirementFile(fileBuffer, fileName, userId, requirementType) {
  try {
    // Generate unique file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -1);
    const fileExtension = path.extname(fileName);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${requirementType}_${timestamp}_${sanitizedFileName}`;
    
    // Define file path in storage
    const filePath = `${userId}/${requirementType}/${uniqueFileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('student-cmo-requirements')
      .upload(filePath, fileBuffer, {
        contentType: getContentType(fileExtension),
        upsert: true // Allow overwriting existing files
      });

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('student-cmo-requirements')
      .getPublicUrl(filePath);

    return {
      filePath: data.path,
      fileUrl: urlData.publicUrl,
      fileName: uniqueFileName
    };
  } catch (error) {
    throw new Error(`File upload service error: ${error.message}`);
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<boolean>} Success status
 */
async function deleteCmoRequirementFile(filePath) {
  try {
    const { error } = await supabase.storage
      .from('student-cmo-requirements')
      .remove([filePath]);

    if (error) {
      console.error('File deletion error:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('File deletion service error:', error.message);
    return false;
  }
}

/**
 * Validates file type and size
 * @param {object} file - Multer file object
 * @returns {object} Validation result
 */
function validateFile(file) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 5MB.'
    };
  }

  return { isValid: true };
}

/**
 * Gets content type for file extension
 * @param {string} extension - File extension
 * @returns {string} Content type
 */
function getContentType(extension) {
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  uploadCmoRequirementFile,
  deleteCmoRequirementFile,
  validateFile
};