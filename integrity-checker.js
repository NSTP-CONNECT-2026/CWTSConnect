#!/usr/bin/env node
/**
 * KEEP UP - System Integrity Checker
 * Validates database references, file integrity, and system consistency
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function checkOrphanDatabaseRecords() {
  console.log('\n🔍 Checking for orphan database records...\n');
  
  const issues = [];
  
  // Check students without profiles
  const { data: studentsWithoutProfile, error: e1 } = await supabase
    .from('students')
    .select('student_id, email')
    .is('first_name', null)
    .limit(10);
  
  if (studentsWithoutProfile && studentsWithoutProfile.length > 0) {
    issues.push({
      type: 'INCOMPLETE_PROFILES',
      severity: 'LOW',
      count: studentsWithoutProfile.length,
      message: 'Students with incomplete profiles found'
    });
  }
  
  // Check for invalid deployment references
  const { data: deployments, error: e2 } = await supabase
    .from('deployments')
    .select('deployment_id, request_id, student_id');
  
  if (deployments) {
    for (const deployment of deployments.slice(0, 10)) {
      // Check if request exists
      const { data: request } = await supabase
        .from('community_requests')
        .select('request_id')
        .eq('request_id', deployment.request_id)
        .single();
      
      if (!request) {
        issues.push({
          type: 'INVALID_DEPLOYMENT_REQUEST',
          severity: 'HIGH',
          message: `Deployment ${deployment.deployment_id} references non-existent request ${deployment.request_id}`
        });
      }
      
      // Check if student exists
      const { data: student } = await supabase
        .from('students')
        .select('student_id')
        .eq('student_id', deployment.student_id)
        .single();
      
      if (!student) {
        issues.push({
          type: 'INVALID_DEPLOYMENT_STUDENT',
          severity: 'HIGH',
          message: `Deployment ${deployment.deployment_id} references non-existent student ${deployment.student_id}`
        });
      }
    }
  }
  
  return issues;
}

async function checkMissingFiles() {
  console.log('\n🔍 Checking for missing referenced files...\n');
  
  const issues = [];
  
  // Check student CMO requirement uploads
  const { data: requirements, error } = await supabase
    .from('student_cmo_requirements')
    .select('requirement_id, student_id, file_url')
    .not('file_url', 'is', null)
    .limit(50);
  
  if (requirements) {
    for (const req of requirements) {
      if (req.file_url && req.file_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, 'public', req.file_url);
        if (!fs.existsSync(filePath)) {
          issues.push({
            type: 'MISSING_REFERENCED_FILE',
            severity: 'MEDIUM',
            message: `File not found: ${req.file_url} (referenced by requirement ${req.requirement_id})`
          });
        }
      }
    }
  }
  
  return issues;
}

async function checkDuplicatePatients() {
  console.log('\n🔍 Checking for duplicate student records...\n');
  
  const issues = [];
  
  // Check for duplicate student numbers
  const { data: students, error } = await supabase
    .from('students')
    .select('student_number, student_id, email')
    .not('student_number', 'is', null);
  
  if (students) {
    const numberMap = new Map();
    
    students.forEach(student => {
      if (!numberMap.has(student.student_number)) {
        numberMap.set(student.student_number, []);
      }
      numberMap.get(student.student_number).push(student);
    });
    
    for (const [number, records] of numberMap.entries()) {
      if (records.length > 1) {
        issues.push({
          type: 'DUPLICATE_STUDENT_NUMBER',
          severity: 'HIGH',
          count: records.length,
          message: `Student number ${number} is used by ${records.length} students`,
          details: records.map(r => `${r.student_id} (${r.email})`).join(', ')
        });
      }
    }
  }
  
  // Check for duplicate emails
  const { data: emailGroups, error: e2 } = await supabase
    .rpc('get_duplicate_emails')
    .limit(10);
  
  // If RPC doesn't exist, do manual check
  const emailMap = new Map();
  students?.forEach(student => {
    if (!emailMap.has(student.email)) {
      emailMap.set(student.email, []);
    }
    emailMap.get(student.email).push(student);
  });
  
  for (const [email, records] of emailMap.entries()) {
    if (records.length > 1) {
      issues.push({
        type: 'DUPLICATE_EMAIL',
        severity: 'HIGH',
        count: records.length,
        message: `Email ${email} is used by ${records.length} students`
      });
    }
  }
  
  return issues;
}

async function checkUnreferencedFiles() {
  console.log('\n🔍 Checking for unreferenced upload files...\n');
  
  const issues = [];
  
  if (!fs.existsSync(UPLOADS_DIR)) {
    return issues;
  }
  
  // Get all database file references
  const { data: requirements } = await supabase
    .from('student_cmo_requirements')
    .select('file_url')
    .not('file_url', 'is', null);
  
  const referencedFiles = new Set(
    requirements?.map(r => r.file_url.replace('/uploads/', '')) || []
  );
  
  // Scan uploads directory
  let totalFiles = 0;
  let unreferencedFiles = 0;
  
  function scanDir(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relPath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        scanDir(fullPath, relPath);
      } else {
        totalFiles++;
        if (!referencedFiles.has(relPath.replace(/\\/g, '/'))) {
          unreferencedFiles++;
        }
      }
    });
  }
  
  scanDir(UPLOADS_DIR);
  
  if (unreferencedFiles > 0) {
    issues.push({
      type: 'UNREFERENCED_FILES',
      severity: 'LOW',
      count: unreferencedFiles,
      total: totalFiles,
      message: `${unreferencedFiles} of ${totalFiles} upload files are not referenced in database`
    });
  }
  
  return issues;
}

async function runIntegrityCheck() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KEEP UP - System Integrity Checker');
  console.log('═══════════════════════════════════════════════════════');
  
  const allIssues = [];
  
  try {
    const orphanRecords = await checkOrphanDatabaseRecords();
    allIssues.push(...orphanRecords);
    
    const missingFiles = await checkMissingFiles();
    allIssues.push(...missingFiles);
    
    const duplicates = await checkDuplicatePatients();
    allIssues.push(...duplicates);
    
    const unreferenced = await checkUnreferencedFiles();
    allIssues.push(...unreferenced);
    
  } catch (error) {
    console.error('❌ Error during integrity check:', error.message);
    process.exit(1);
  }
  
  // Display results
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  INTEGRITY CHECK RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (allIssues.length === 0) {
    console.log('✅ No integrity issues found!\n');
  } else {
    const high = allIssues.filter(i => i.severity === 'HIGH');
    const medium = allIssues.filter(i => i.severity === 'MEDIUM');
    const low = allIssues.filter(i => i.severity === 'LOW');
    
    console.log(`Total issues found: ${allIssues.length}`);
    console.log(`  🔴 High severity: ${high.length}`);
    console.log(`  🟡 Medium severity: ${medium.length}`);
    console.log(`  🟢 Low severity: ${low.length}\n`);
    
    if (high.length > 0) {
      console.log('🔴 HIGH SEVERITY ISSUES:');
      high.forEach(issue => {
        console.log(`  - ${issue.message}`);
        if (issue.details) console.log(`    ${issue.details}`);
      });
      console.log();
    }
    
    if (medium.length > 0) {
      console.log('🟡 MEDIUM SEVERITY ISSUES:');
      medium.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
      console.log();
    }
    
    if (low.length > 0) {
      console.log('🟢 LOW SEVERITY ISSUES:');
      low.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
      console.log();
    }
  }
  
  // Save report
  const reportPath = path.join(__dirname, `integrity-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: allIssues.length,
      high: allIssues.filter(i => i.severity === 'HIGH').length,
      medium: allIssues.filter(i => i.severity === 'MEDIUM').length,
      low: allIssues.filter(i => i.severity === 'LOW').length
    },
    issues: allIssues
  }, null, 2));
  
  console.log(`📄 Full report saved to: ${reportPath}\n`);
  
  return allIssues;
}

// Run the check
runIntegrityCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
