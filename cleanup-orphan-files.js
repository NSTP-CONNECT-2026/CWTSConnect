#!/usr/bin/env node
/**
 * KEEP UP - Orphan File Cleanup Tool
 * Detects and optionally quarantines unreferenced upload files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELETE_CONFIRMED = args.includes('--delete-confirmed');

// Paths
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const QUARANTINE_DIR = path.join(__dirname, 'quarantine', `orphans-${new Date().toISOString().replace(/:/g, '-')}`);

// Known test patterns
const TEST_PATTERNS = [
  /WALK25/i,
  /security-test/i,
  /phase3-test/i,
  /final-completion/i,
  /test-patient/i,
  /synthetic/i,
  /temp-test/i
];

function calculateChecksum(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (err) {
    return null;
  }
}

function isTestArtifact(filename) {
  return TEST_PATTERNS.some(pattern => pattern.test(filename));
}

function scanUploads() {
  console.log('🔍 Scanning uploads directory...\n');
  
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('❌ Uploads directory not found');
    return { detected: [], confirmed: [], unknown: [] };
  }

  const detected = [];
  const confirmed = [];
  const unknown = [];

  function scanDir(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relPath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        scanDir(fullPath, relPath);
      } else {
        const fileInfo = {
          path: relPath,
          fullPath: fullPath,
          size: stats.size,
          checksum: calculateChecksum(fullPath),
          modified: stats.mtime
        };
        
        detected.push(fileInfo);
        
        if (isTestArtifact(item)) {
          confirmed.push(fileInfo);
        } else {
          unknown.push(fileInfo);
        }
      }
    });
  }

  scanDir(UPLOADS_DIR);
  
  return { detected, confirmed, unknown };
}

function displayResults(results) {
  console.log('📊 SCAN RESULTS\n');
  console.log(`Total files detected: ${results.detected.length}`);
  console.log(`Confirmed test artifacts: ${results.confirmed.length}`);
  console.log(`Unknown files (need review): ${results.unknown.length}\n`);
  
  if (results.confirmed.length > 0) {
    console.log('✅ CONFIRMED TEST ARTIFACTS:');
    results.confirmed.forEach(file => {
      console.log(`  - ${file.path} (${(file.size / 1024).toFixed(2)} KB)`);
    });
    console.log();
  }
  
  if (results.unknown.length > 0) {
    console.log('⚠️  UNKNOWN FILES (REQUIRE MANUAL REVIEW):');
    results.unknown.forEach(file => {
      console.log(`  - ${file.path} (${(file.size / 1024).toFixed(2)} KB)`);
    });
    console.log();
  }
}

function quarantineFiles(files) {
  if (files.length === 0) {
    console.log('✅ No files to quarantine');
    return;
  }

  console.log(`\n📦 Quarantining ${files.length} files to: ${QUARANTINE_DIR}\n`);
  
  // Create quarantine directory
  fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
  
  const manifest = [];
  
  files.forEach(file => {
    const targetPath = path.join(QUARANTINE_DIR, file.path);
    const targetDir = path.dirname(targetPath);
    
    // Create subdirectories
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Move file
    fs.renameSync(file.fullPath, targetPath);
    
    // Verify checksum
    const newChecksum = calculateChecksum(targetPath);
    const verified = newChecksum === file.checksum;
    
    manifest.push({
      originalPath: file.path,
      quarantinePath: targetPath,
      checksum: file.checksum,
      size: file.size,
      verified: verified
    });
    
    console.log(`  ${verified ? '✅' : '❌'} ${file.path}`);
  });
  
  // Save manifest
  const manifestPath = path.join(QUARANTINE_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\n📄 Manifest saved to: ${manifestPath}`);
}

function deleteFiles(files) {
  if (files.length === 0) {
    console.log('✅ No files to delete');
    return;
  }

  console.log(`\n🗑️  Deleting ${files.length} files...\n`);
  
  files.forEach(file => {
    try {
      fs.unlinkSync(file.fullPath);
      console.log(`  ✅ Deleted: ${file.path}`);
    } catch (err) {
      console.log(`  ❌ Failed to delete: ${file.path} - ${err.message}`);
    }
  });
}

// Main execution
console.log('═══════════════════════════════════════════════════════');
console.log('  KEEP UP - Orphan File Cleanup Tool');
console.log('═══════════════════════════════════════════════════════\n');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

const results = scanUploads();
displayResults(results);

if (!DRY_RUN && results.confirmed.length > 0) {
  if (DELETE_CONFIRMED) {
    console.log('⚠️  WARNING: --delete-confirmed flag is set');
    console.log('This will PERMANENTLY DELETE confirmed test artifacts!\n');
    deleteFiles(results.confirmed);
  } else {
    quarantineFiles(results.confirmed);
  }
}

if (DRY_RUN) {
  console.log('\n💡 To quarantine confirmed test artifacts, run:');
  console.log('   node cleanup-orphan-files.js');
  console.log('\n⚠️  To permanently delete (NOT RECOMMENDED), run:');
  console.log('   node cleanup-orphan-files.js --delete-confirmed');
}

console.log('\n✅ Scan complete');
