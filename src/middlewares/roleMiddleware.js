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
      return res.redirect('/student/login.html');
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

module.exports = { roleMiddleware };
