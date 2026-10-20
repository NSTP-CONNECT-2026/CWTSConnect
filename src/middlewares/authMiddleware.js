/**
 * Middleware: Checks if the user is logged in (has an active session).
 * If not logged in, returns 401 for API routes or redirects for page routes.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    // Set req.user for easy access in controllers
    req.user = req.session.user;
    return next();
  }

  // If it's an API request, return JSON error
  const requestUrl = req.originalUrl || req.baseUrl || req.path || '';
  if (requestUrl.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'You are not logged in. Please log in to continue.' });
  }

  // For page routes, redirect to login
  return res.redirect('/login.html');
}

/**
 * Middleware: Authenticates user via Bearer token or session.
 * Sets req.user for downstream middleware and controllers.
 * Used for API routes that support both token and session auth.
 */
function authenticateToken(req, res, next) {
  // Check for Bearer token first
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token) {
    // Token-based authentication (for future JWT implementation)
    // For now, we'll use session-based auth
    return res.status(401).json({ 
      success: false, 
      message: 'Token authentication not yet implemented. Please use session-based login.' 
    });
  }

  // Fall back to session-based authentication
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // No valid authentication found
  return res.status(401).json({ 
    success: false, 
    message: 'Authentication required. Please log in.' 
  });
}

module.exports = { isAuthenticated, authenticateToken };
