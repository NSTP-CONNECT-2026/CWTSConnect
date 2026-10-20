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

    // Enrich with community official profile metadata including pinned map coordinates
    const { getOfficialProfile } = require('../services/communityOfficialStore');
    const meta = getOfficialProfile(user.user_id, user.email) || {};

    // Return user data (excluding sensitive information)
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        profile_status: user.profile_status,
        full_name: meta.full_name || meta.community_name || '',
        position: meta.position || 'Community Official',
        contact_number: meta.contact_number || '',
        community_name: meta.community_name || '',
        barangay: meta.barangay || '',
        municipality: meta.municipality || '',
        province: meta.province || 'Laguna',
        latitude: meta.latitude || null,
        longitude: meta.longitude || null,
        location: meta.location || (meta.latitude && meta.longitude ? `${meta.latitude},${meta.longitude}` : ''),
        coordinates: meta.coordinates || (meta.latitude && meta.longitude ? { lat: meta.latitude, lng: meta.longitude } : null)
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