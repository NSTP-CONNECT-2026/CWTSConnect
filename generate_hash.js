// Generate bcrypt hash for password
const bcrypt = require('bcryptjs');

const password = 'Test123!';

// Generate hash with salt rounds = 12 (same as in the system)
bcrypt.hash(password, 12, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  
  console.log('\n===========================================');
  console.log('Password Hash Generator');
  console.log('===========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('===========================================\n');
  console.log('Copy this SQL to Supabase SQL Editor:\n');
  console.log(`-- Reset all passwords to: ${password}`);
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = NOW() WHERE email = 'nstpconnect@gmail.com';`);
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = NOW() WHERE email = 'communityofficial@gmail.com';`);
  console.log(`UPDATE users SET password_hash = '${hash}', updated_at = NOW() WHERE email = 'ginalennmae.cuaterno@lspu.edu.ph';`);
  console.log('\n===========================================\n');
  
  // Test the hash
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('Error testing hash:', err);
      return;
    }
    console.log('Hash verification test:', result ? '✅ PASS' : '❌ FAIL');
  });
});
