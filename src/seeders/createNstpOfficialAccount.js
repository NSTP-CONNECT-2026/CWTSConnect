const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');

/**
 * Create predefined NSTP Official account
 * Email: nstpconnect@gmail.com
 * Password: NstpConnect2026!
 * Role: nstp_official
 */
async function createNstpOfficialAccount() {
  try {
    const email = 'nstpconnect@gmail.com';
    const password = 'NstpConnect2026!';
    const role = 'nstp_official';

    console.log('🔍 Checking if NSTP Official account already exists...');

    // Check if account already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id, email, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('✅ NSTP Official account already exists:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   User ID:', existingUser.user_id);
      return {
        success: true,
        message: 'NSTP Official account already exists.',
        user: existingUser
      };
    }

    console.log('🔐 Hashing password...');
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('📝 Creating NSTP Official account...');
    // Create the account
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: email,
          password_hash: hashedPassword,
          role: role,
          account_status: 'active',
          profile_status: 'complete',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('user_id, email, role, account_status, profile_status')
      .single();

    if (insertError) {
      console.error('❌ Failed to create NSTP Official account:', insertError);
      return {
        success: false,
        message: 'Failed to create NSTP Official account.',
        error: insertError
      };
    }

    console.log('🎉 NSTP Official account created successfully!');
    console.log('   Email:', newUser.email);
    console.log('   Role:', newUser.role);
    console.log('   User ID:', newUser.user_id);
    console.log('   Account Status:', newUser.account_status);
    console.log('   Profile Status:', newUser.profile_status);

    return {
      success: true,
      message: 'NSTP Official account created successfully.',
      user: newUser
    };

  } catch (error) {
    console.error('❌ Error in createNstpOfficialAccount:', error);
    return {
      success: false,
      message: 'An error occurred while creating NSTP Official account.',
      error: error
    };
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting NSTP Official Account Seeder...');
  createNstpOfficialAccount()
    .then((result) => {
      if (result.success) {
        console.log('✅ Seeder completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Seeder failed:', result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Seeder error:', error);
      process.exit(1);
    });
}

module.exports = {
  createNstpOfficialAccount
};