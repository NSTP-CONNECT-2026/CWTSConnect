/**
 * NSTPConnect - Setup Verification Script
 * Run this to verify your setup before testing
 */

require('dotenv').config();
const supabase = require('./src/config/supabaseClient');

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('\n🔍 Checking Required Tables...');
  
  const tables = [
    'users',
    'student_profiles',
    'community_requests',
    'dss_match_results',
    'deployments',
    'deployment_students',
    'attendance_records',
    'rendered_hours_summary',
    'make_up_requests',
    'notifications',
    'notification_preferences',
    'student_cmo_requirements'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' not found or not accessible`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}':`, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function checkViews() {
  console.log('\n🔍 Checking Required Views...');
  
  const views = [
    'eligible_students',
    'approved_community_requests'
  ];
  
  let allViewsExist = true;
  
  for (const view of views) {
    try {
      const { error } = await supabase
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ View '${view}' not found or not accessible`);
        allViewsExist = false;
      } else {
        console.log(`✅ View '${view}' exists`);
      }
    } catch (error) {
      console.log(`❌ Error checking view '${view}':`, error.message);
      allViewsExist = false;
    }
  }
  
  return allViewsExist;
}

async function checkStorageBuckets() {
  console.log('\n🔍 Checking Storage Buckets...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Cannot access storage:', error.message);
      return false;
    }
    
    const requiredBuckets = ['cmo-requirements'];
    let allBucketsExist = true;
    
    for (const bucketName of requiredBuckets) {
      const bucket = data.find(b => b.name === bucketName);
      if (bucket) {
        console.log(`✅ Bucket '${bucketName}' exists`);
      } else {
        console.log(`❌ Bucket '${bucketName}' not found`);
        allBucketsExist = false;
      }
    }
    
    return allBucketsExist;
  } catch (error) {
    console.log('❌ Storage check error:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SESSION_SECRET'
  ];
  
  let allVarsExist = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allVarsExist = false;
    }
  }
  
  return allVarsExist;
}

async function getSummaryStats() {
  console.log('\n📊 Database Summary Statistics...');
  
  try {
    // Count users by role
    const { data: users } = await supabase
      .from('users')
      .select('role');
    
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nUsers by Role:');
    console.log(`  - NSTP Officials: ${roleCounts.nstp_official || 0}`);
    console.log(`  - Community Officials: ${roleCounts.community_official || 0}`);
    console.log(`  - Students: ${roleCounts.student || 0}`);
    
    // Count student profiles
    const { count: profileCount } = await supabase
      .from('student_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nStudent Profiles: ${profileCount || 0}`);
    
    // Count community requests
    const { count: requestCount } = await supabase
      .from('community_requests')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Community Requests: ${requestCount || 0}`);
    
    // Count deployments
    const { count: deploymentCount } = await supabase
      .from('deployments')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Deployments: ${deploymentCount || 0}`);
    
    // Count attendance records
    const { count: attendanceCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Attendance Records: ${attendanceCount || 0}`);
    
  } catch (error) {
    console.log('❌ Error getting summary stats:', error.message);
  }
}

async function runAllChecks() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   NSTPConnect Setup Verification');
  console.log('═══════════════════════════════════════════════════');
  
  const envCheck = await checkEnvironmentVariables();
  const dbCheck = await testDatabaseConnection();
  
  if (!dbCheck) {
    console.log('\n❌ Cannot proceed - Database connection failed');
    console.log('Please check your .env file and Supabase credentials');
    return;
  }
  
  const tablesCheck = await checkTables();
  const viewsCheck = await checkViews();
  const storageCheck = await checkStorageBuckets();
  
  await getSummaryStats();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Verification Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Environment Variables: ${envCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Connection: ${dbCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Required Tables: ${tablesCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Required Views: ${viewsCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Storage Buckets: ${storageCheck ? '✅ PASS' : '❌ FAIL'}`);
  
  if (envCheck && dbCheck && tablesCheck && viewsCheck && storageCheck) {
    console.log('\n🎉 All checks passed! Your setup is ready for testing.');
    console.log('\n📖 Next steps:');
    console.log('   1. Run: npm start');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Follow: TESTING_GUIDE.md');
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above before testing.');
    console.log('\n📖 Common fixes:');
    console.log('   - Missing tables: Run all schema files in Supabase SQL Editor');
    console.log('   - Missing buckets: Run supabase_storage_setup.sql');
    console.log('   - Connection issues: Check .env file credentials');
  }
  
  console.log('═══════════════════════════════════════════════════\n');
}

// Run the checks
runAllChecks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
