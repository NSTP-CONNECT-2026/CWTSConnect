const supabase = require('../config/supabaseClient');

/**
 * GET /api/student/me
 * Returns the currently logged-in student's account data.
 * Never returns the password_hash.
 */
async function getMe(req, res) {
  try {
    console.log('GET /api/student/me called');
    console.log('Session user:', req.session?.user);
    
    const sessionUser = req.session.user;

    if (!sessionUser) {
      console.log('No session user found');
      return res.status(401).json({ success: false, message: 'No session found.' });
    }

    // Fetch fresh data from Supabase to reflect latest profile_status and cmo_compliance_status
    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, role, account_status, profile_status, cmo_compliance_status, created_at')
      .eq('user_id', sessionUser.user_id)
      .single();

    if (error || !data) {
      console.log('Database error:', error);
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    console.log('User data found:', data);
    return res.status(200).json({ success: true, user: data });
  } catch (error) {
    console.log('Server error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

module.exports = { getMe };
