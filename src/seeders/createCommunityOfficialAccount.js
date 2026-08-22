/**
 * NSTPConnect - Community Official Account Seeder
 * Creates a predefined Community Official account for testing
 */

const supabase = require('../config/supabaseClient');
const { hashPassword } = require('../services/passwordService');

/**
 * Creates the predefined Community Official account
 */
async function createCommunityOfficialAccount() {
  try {
    const email = 'communityofficial@gmail.com';
    const password = 'Community2026!';
    const role = 'community_official';

    console.log('🔍 Checking if Community Official account exists...');

    // Check if account already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id, email, role')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error('Error checking existing account: ' + checkError.message);
    }

    if (existingUser) {
      console.log('✅ Community Official account already exists:', existingUser.email);
      console.log('   User ID:', existingUser.user_id);
      console.log('   Role:', existingUser.role);
      return existingUser;
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);

    console.log('👤 Creating Community Official account...');

    // Create the Community Official account
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: hashedPassword,
        role: role,
        account_status: 'active',
        profile_status: 'complete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw new Error('Failed to create Community Official account: ' + createError.message);
    }

    console.log('✅ Community Official account created successfully!');
    console.log('   Email:', newUser.email);
    console.log('   User ID:', newUser.user_id);
    console.log('   Role:', newUser.role);
    console.log('   Account Status:', newUser.account_status);
    console.log('   Profile Status:', newUser.profile_status);

    console.log('\n🔑 Login Credentials:');
    console.log('   Email: communityofficial@gmail.com');
    console.log('   Password: Community2026!');
    console.log('   Dashboard: /community/dashboard.html');

    return newUser;

  } catch (error) {
    console.error('❌ Error creating Community Official account:', error.message);
    throw error;
  }
}

/**
 * Run the seeder if called directly
 */
if (require.main === module) {
  createCommunityOfficialAccount()
    .then(() => {
      console.log('\n🎉 Community Official seeder completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Community Official seeder failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createCommunityOfficialAccount };