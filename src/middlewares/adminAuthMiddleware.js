/**
 * NSTPConnect - System Administrator Access Middleware
 * Implements Zero-Login Access for local server/authorized administrator
 * and Stealth 404 Restriction for unauthorized users/external visitors.
 */

require('dotenv').config();

const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY || 'LSPU_ADMIN_PORTAL_KEY_2026';

/**
 * Determines whether the HTTP request originates from localhost or carries the secret admin key
 * @param {object} req - Express request
 * @returns {boolean}
 */
function isLocalOrAuthorized(req) {
  // Check if request is forwarded from an external client via proxy
  const forwardedFor = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  const forwardedHost = req.headers && req.headers['x-forwarded-host'];

  // Check Secret Key query or header (for authorized remote access)
  const queryKey = req.query && (req.query.key || req.query.admin_key);
  const headerKey = req.headers && (req.headers['x-admin-key'] || req.headers['authorization']);
  const hasValidSecret = 
    (queryKey && queryKey === ADMIN_PORTAL_KEY) || 
    (headerKey && (headerKey === ADMIN_PORTAL_KEY || headerKey === `Bearer ${ADMIN_PORTAL_KEY}`));

  // Check if session already holds an active verified admin
  const hasActiveAdminSession = req.session && req.session.user && req.session.user.role === 'admin';

  if (forwardedFor) {
    const clientIp = String(forwardedFor).split(',')[0].trim();
    const isClientLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
    if (!isClientLocal) {
      // External IP request: Strictly require secret key or active admin session
      return hasValidSecret || hasActiveAdminSession;
    }
  }

  if (forwardedHost) {
    const isFwdLocalHost = forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.0.0.1');
    if (!isFwdLocalHost) {
      return hasValidSecret || hasActiveAdminSession;
    }
  }

  // Check direct socket IP origin
  const rawIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  const isLocalIp = 
    rawIp === '127.0.0.1' || 
    rawIp === '::1' || 
    rawIp === '::ffff:127.0.0.1' || 
    rawIp.includes('127.0.0.1');

  // Check Host header
  const host = (req.headers && req.headers.host) || '';
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');

  return (isLocalIp && isLocalHost) || hasValidSecret || hasActiveAdminSession;
}

/**
 * Middleware: Enforces zero-login admin session for local/authorized requests
 * and stealth 404 for unauthorized visitors.
 */
function requireAdminAccess(req, res, next) {
  if (!isLocalOrAuthorized(req)) {
    // Stealth mode: Return 404 so unauthorized visitors believe this route does not exist
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><title>404 Not Found</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h1>404 Not Found</h1>
        <p>The requested URL was not found on this server.</p>
        <hr style="max-width: 500px; margin: 20px auto; border: 0; border-top: 1px solid #ccc;">
        <address style="color: #666;">Apache/2.4.52 (Ubuntu) Server at localhost Port 80</address>
      </body>
      </html>
    `);
  }

  // Auto-provision admin session without login form
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.session.user = {
      user_id: 'sysadmin-lspu-001',
      email: 'sysadmin@lspu.edu.ph',
      full_name: 'LSPU System Administrator',
      role: 'admin',
      account_status: 'active',
      is_auto_authorized: true
    };
  }

  req.user = req.session.user;
  next();
}

module.exports = {
  isLocalOrAuthorized,
  requireAdminAccess
};
