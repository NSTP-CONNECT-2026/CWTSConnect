const { execSync } = require('child_process');

try {
  const res = execSync('powershell "Get-Process -Id 3748, 10176, 10196 | Select-Object Id, ProcessName, CPU, WorkingSet64"', { encoding: 'utf8' });
  console.log(res);
} catch (e) {
  console.log(e.message);
}
