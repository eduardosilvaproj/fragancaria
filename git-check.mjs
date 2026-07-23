import { execSync } from 'child_process';
const opts = { cwd: 'C:/dev/fragancaria', timeout: 30000, encoding: 'utf-8' };
try {
  console.log('=== git status --short ===');
  console.log(execSync('git status --short', opts));
} catch(e) { console.log('status error:', e.message); }
try {
  console.log('=== git log --oneline -12 ===');
  console.log(execSync('git log --oneline -12', opts));
} catch(e) { console.log('log error:', e.message); }
try {
  console.log('=== git log origin/main --oneline -12 ===');
  console.log(execSync('git log origin/main --oneline -12', opts));
} catch(e) { console.log('origin/main error:', e.message); }
try {
  console.log('=== git rev-parse HEAD ===');
  console.log(execSync('git rev-parse HEAD', opts));
} catch(e) { console.log('rev-parse error:', e.message); }
