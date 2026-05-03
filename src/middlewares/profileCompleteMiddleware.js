/**
 * Middleware to check if user profile is complete
 * Blocks access if profile_status is incomplete
 */

const supabase = require('../config/supabaseClient');

async function requireCompleteProfile(req, res, next) {
  try {
    const userId = req.user.user_id;

    // Get user profile status
    const { data: user, error } = await supabase
      .from('users')
      .select('profile_status')
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check profile status'
      });
    }

    if (!user || user.profile_status !== 'complete') {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile information before submitting CMO requirements.',
        redirect: '/student/complete-profile.html'
      });
    }

    next();
  } catch (error) {
    console.error('Profile complete middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking profile status'
    });
  }
}

module.exports = {
  requireCompleteProfile
};