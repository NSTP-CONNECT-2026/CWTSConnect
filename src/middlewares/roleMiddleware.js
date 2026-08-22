/**
 * Middleware factory: Restricts access to users with a specific role.
 * Must be used after isAuthenticated middleware.
 *
 * Usage: roleMiddleware('student')
 * @param {string} requiredRole - The role required to access the route.
 */
function roleMiddleware(requiredRole) {
  return function (req, res, next) {
    const user = req.session && req.session.user;

    if (!user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
      }
      return res.redirect('/login.html');
    }

    if (user.role !== requiredRole) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This area is only for ${requiredRole} accounts.`
        });
      }
      return res.status(403).send('Access denied. You do not have permission to view this page.');
    }

    next();
  };
}

/**
 * Middleware factory: Restricts access to users with one of the specified roles.
 * Must be used after authenticateToken middleware.
 *
 * Usage: requireRole(['student', 'nstp_official'])
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route.
 */
function requireRole(allowedRoles) {
  return function (req, res, next) {
    const user = req.user; // Set by authenticateToken middleware

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated.' 
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

module.exports = { roleMiddleware, requireRole };
