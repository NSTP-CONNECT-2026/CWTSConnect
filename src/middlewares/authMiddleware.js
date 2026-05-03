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
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'You are not logged in. Please log in to continue.' });
  }

  // For page routes, redirect to login
  return res.redirect('/student/login.html');
}

module.exports = { isAuthenticated };
