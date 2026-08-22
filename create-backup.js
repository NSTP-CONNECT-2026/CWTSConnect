#!/usr/bin/env node
/**
 * KEEP UP - Backup Creation Tool
 * Creates timestamped backups with manifest and verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const BACKUP_DIR = path.join(__dirname, 'backups', `final-core-complete-${timestamp}`);

// Files and directories to backup
const BACKUP_ITEMS = [
  { path: 'src', type: 'directory' },
  { path: 'public', type: 'directory' },
  { path: 'package.json', type: 'file' },
  { path: 'package-lock.json', type: 'file' },
  { path: '.env.example', type: 'file' },
  { path: 'supabase_schema.sql', type: 'file' },
  { path: 'database_migration.sql', type: 'file' },
  { path: 'attendance_and_hours_schema.sql', type: 'file' },
  { path: 'cmo_requirements_schema.sql', type: 'file' },
  { path: 'community_requests_schema.sql', type: 'file' },
  { path: 'deployment_management_schema.sql', type: 'file' },
  { path: 'dss_matching_schema.sql', type: 'file' },
  { path: 'notifications_schema.sql', type: 'file' },
  { path: 'supabase_storage_setup.sql', type: 'file' },
  { path: 'CURRENT_STATUS_AND_FIXES.md', type: 'file' },
  { path: 'TESTING_GUIDE.md', type: 'file' },
  { path: 'SYSTEM_DEVELOPMENT_AUDIT_REPORT.md', type: 'file' }
];

// Exclude patterns
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  'uploads',
  'quarantine',
  'backups',
  '*.log',
  'npm-debug.log*'
];

function shouldExclude(itemPath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(itemPath);
    }
    return itemPath.includes(pattern);
  });
}

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

function copyFileWithMetadata(src, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.copyFileSync(src, dest);
  const stats = fs.statSync(src);
  
  return {
    path: path.relative(__dirname, src).replace(/\\/g, '/'),
    size: stats.size,
    checksum: calculateChecksum(src),
    timestamp: stats.mtime.toISOString()
  };
}

function copyDirectory(src, dest, manifest, relativeTo) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const relPath = path.relative(relativeTo, srcPath);
    
    if (shouldExclude(relPath)) {
      return;
    }
    
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      copyDirectory(srcPath, destPath, manifest, relativeTo);
    } else {
      const metadata = copyFileWithMetadata(srcPath, destPath);
      manifest.push(metadata);
    }
  });
}

function createBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KEEP UP - Backup Creation Tool');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`Creating backup at: ${BACKUP_DIR}\n`);
  
  // Create backup directory
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  
  const manifest = [];
  let totalSize = 0;
  let fileCount = 0;
  
  // Backup each item
  BACKUP_ITEMS.forEach(item => {
    const srcPath = path.join(__dirname, item.path);
    const destPath = path.join(BACKUP_DIR, item.path);
    
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Skipping missing: ${item.path}`);
      return;
    }
    
    console.log(`📦 Backing up: ${item.path}`);
    
    if (item.type === 'directory') {
      copyDirectory(srcPath, destPath, manifest, __dirname);
    } else {
      const metadata = copyFileWithMetadata(srcPath, destPath);
      manifest.push(metadata);
    }
  });
  
  // Calculate totals
  manifest.forEach(item => {
    totalSize += item.size;
    fileCount++;
  });
  
  // Create manifest file
  const manifestData = {
    timestamp: new Date().toISOString(),
    version: 'keep-up-web-core-v1.0.0',
    scope: 'Web Application - Objectives 1-5',
    totalFiles: fileCount,
    totalSize: totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    files: manifest
  };
  
  const manifestPath = path.join(BACKUP_DIR, 'BACKUP_MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
  
  // Create README
  const readmePath = path.join(BACKUP_DIR, 'README.md');
  const readme = `# KEEP UP Web Core Backup

**Created:** ${new Date().toISOString()}
**Version:** keep-up-web-core-v1.0.0
**Scope:** Web Application - Objectives 1-5

## Backup Contents

- Total files: ${fileCount}
- Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB

## What's Included

- Source code (src/)
- Frontend assets (public/)
- Database schemas (*.sql)
- Configuration files (package.json, .env.example)
- Documentation

## What's Excluded

- Node modules (can be restored with npm install)
- Environment secrets (.env)
- Upload files (should be backed up separately)
- Git history
- Logs and temporary files

## Restoration Instructions

1. Extract this backup to a clean directory
2. Run: npm install
3. Copy .env.example to .env and configure
4. Run database migrations in Supabase
5. Start server: npm start

## Verification

See BACKUP_MANIFEST.json for checksums of all files.
`;
  
  fs.writeFileSync(readmePath, readme);
  
  console.log('\n✅ Backup created successfully!\n');
  console.log(`📁 Location: ${BACKUP_DIR}`);
  console.log(`📄 Files: ${fileCount}`);
  console.log(`💾 Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📋 Manifest: ${manifestPath}\n`);
  
  return {
    path: BACKUP_DIR,
    fileCount: fileCount,
    totalSize: totalSize,
    manifestPath: manifestPath
  };
}

// Run backup
try {
  const result = createBackup();
  process.exit(0);
} catch (err) {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
}
