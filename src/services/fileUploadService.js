const { Readable } = require('stream');
const supabase = require('../config/supabaseClient');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const path = require('path');

/**
 * Uploads a file to Cloudinary (or Supabase Storage fallback)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID for folder structure
 * @param {string} requirementType - Type of requirement
 * @returns {Promise<object>} Upload result with file path and URL
 */
async function uploadCmoRequirementFile(fileBuffer, fileName, userId, requirementType) {
  // If Cloudinary is configured in .env, upload directly to Cloudinary
  if (isCloudinaryConfigured()) {
    try {
      console.log(`[Storage] Uploading "${fileName}" to Cloudinary for user ${userId} (${requirementType})...`);
      const result = await uploadToCloudinary(fileBuffer, fileName, userId, requirementType);
      console.log(`[Storage] Successfully uploaded to Cloudinary: ${result.fileUrl}`);
      return result;
    } catch (cloudinaryError) {
      console.error('[Storage Error] Cloudinary upload attempt failed:', cloudinaryError.message);
      
      // If credentials in .env are invalid (e.g. cloud_name mismatch), throw clear error so user can fix their .env
      const isAuthError = cloudinaryError.message.includes('cloud_name mismatch') ||
                          cloudinaryError.message.includes('Invalid cloud_name') ||
                          cloudinaryError.message.includes('Must supply api_key') ||
                          cloudinaryError.message.includes('Invalid API key') ||
                          cloudinaryError.message.includes('401');

      if (isAuthError) {
        throw new Error(`Cloudinary Configuration Error (${cloudinaryError.message}). Please check your CLOUDINARY_CLOUD_NAME in .env - it must match the exact Cloud Name shown in your Cloudinary Dashboard.`);
      }

      console.warn('[Storage Fallback] Temporary network issue. Falling back to Supabase Storage...');
      return uploadToSupabaseStorage(fileBuffer, fileName, userId, requirementType);
    }
  }

  // Graceful fallback to Supabase Storage if Cloudinary credentials are not yet added to .env
  console.warn('[Storage Notice] Cloudinary credentials not detected in .env. Falling back to Supabase Storage.');
  return uploadToSupabaseStorage(fileBuffer, fileName, userId, requirementType);
}

/**
 * Uploads file buffer directly to Cloudinary using upload_stream
 */
function uploadToCloudinary(fileBuffer, fileName, userId, requirementType) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Date.now();
      const sanitizedBase = path.parse(fileName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const publicId = `${requirementType}_${timestamp}_${sanitizedBase}`;
      const folder = `nstp-connect/cmo-requirements/${userId}/${requirementType}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', error);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }

          resolve({
            filePath: result.public_id,
            fileUrl: result.secure_url || result.url,
            fileName: fileName,
            provider: 'cloudinary'
          });
        }
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    } catch (err) {
      console.error('Cloudinary stream setup error:', err);
      reject(new Error(`Cloudinary upload failed: ${err.message}`));
    }
  });
}

/**
 * Uploads file buffer to Supabase Storage bucket
 */
async function uploadToSupabaseStorage(fileBuffer, fileName, userId, requirementType) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -1);
    const fileExtension = path.extname(fileName);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${requirementType}_${timestamp}_${sanitizedFileName}`;
    const filePath = `${userId}/${requirementType}/${uniqueFileName}`;
    
    const { data, error } = await supabase.storage
      .from('student-cmo-requirements')
      .upload(filePath, fileBuffer, {
        contentType: getContentType(fileExtension),
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('student-cmo-requirements')
      .getPublicUrl(filePath);

    return {
      filePath: data.path,
      fileUrl: urlData.publicUrl,
      fileName: uniqueFileName,
      provider: 'supabase'
    };
  } catch (error) {
    throw new Error(`File upload service error: ${error.message}`);
  }
}

/**
 * Deletes a file from Cloudinary or Supabase Storage
 * @param {string} filePath - Path or Cloudinary public_id
 * @returns {Promise<boolean>} Success status
 */
async function deleteCmoRequirementFile(filePath) {
  if (!filePath) return true;

  try {
    // If it's a Cloudinary public_id (starts with nstp-connect/ or Cloudinary is active)
    if (filePath.startsWith('nstp-connect/') || isCloudinaryConfigured()) {
      try {
        await cloudinary.uploader.destroy(filePath, { resource_type: 'image' });
        await cloudinary.uploader.destroy(filePath, { resource_type: 'raw' });
        return true;
      } catch (err) {
        console.warn('Cloudinary asset deletion warning:', err.message);
      }
    }

    // Also attempt deletion from Supabase Storage in case it's a Supabase storage path
    const { error } = await supabase.storage
      .from('student-cmo-requirements')
      .remove([filePath]);

    if (error) {
      console.warn('Supabase storage file deletion warning:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('File deletion service warning:', error.message);
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