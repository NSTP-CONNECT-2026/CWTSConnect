const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Initial load
dotenv.config();

/**
 * Checks if Cloudinary is configured with valid credentials in process.env
 * Dynamically re-parses .env so any changes made to .env take effect immediately
 * without requiring a manual server restart.
 */
function isCloudinaryConfigured() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
    }
  } catch (err) {
    // Fall back to existing process.env
  }

  let cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  let apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();

  // If any individual key is missing, attempt to extract from CLOUDINARY_URL
  if ((!cloudName || !apiKey || !apiSecret) && cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      apiKey = apiKey || decodeURIComponent(parsed.username);
      apiSecret = apiSecret || decodeURIComponent(parsed.password);
      cloudName = cloudName || decodeURIComponent(parsed.hostname);
    } catch (e) {
      // Ignore URL parse error
    }
  }

  const configured = Boolean(cloudName && apiKey && apiSecret);

  if (configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
  }

  return configured;
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  get isConfigured() {
    return isCloudinaryConfigured();
  }
};
