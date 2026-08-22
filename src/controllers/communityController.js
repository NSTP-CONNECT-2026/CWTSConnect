/**
 * NSTPConnect - Community Official Controller
 * Handles Community Official dashboard and profile requests
 */

/**
 * GET /api/community/me
 * Get Community Official profile information
 */
async function getCommunityOfficialProfile(req, res) {
  try {
    // User data is available from session (set by authMiddleware)
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (user.role !== 'community_official') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Community Official role required.'
      });
    }

    // Return user data (excluding sensitive information)
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        profile_status: user.profile_status
      }
    });

  } catch (error) {
    console.error('Get Community Official profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile information.'
    });
  }
}

module.exports = {
  getCommunityOfficialProfile
};