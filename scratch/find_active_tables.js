const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFiles('./src');
const tables = new Map();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /\.from\(['"`]([a-zA-Z0-9_\-]+)['"`]\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tableName = match[1];
    if (!tables.has(tableName)) {
      tables.set(tableName, new Set());
    }
    tables.get(tableName).add(file.replace(/\\/g, '/'));
  }
});

console.log('=== ACTIVE TABLES IN SRC CODE ===');
const sortedTables = Array.from(tables.keys()).sort();
sortedTables.forEach(t => {
  const fileList = Array.from(tables.get(t));
  console.log(`Table: "${t}" (${fileList.length} files)`);
  fileList.forEach(f => console.log(`   - ${f}`));
});
