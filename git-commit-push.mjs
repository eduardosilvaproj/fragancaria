import { execSync } from 'child_process';
const opts = { cwd: 'C:/dev/fragancaria', timeout: 30000, encoding: 'utf-8' };
try {
  console.log(execSync('git add src/components/shop/FranChatWidget.tsx', opts));
  console.log(execSync('git commit -m "fix: polling do widget recriava setInterval a cada render (refs estaveis para funcoes zustand)"', opts));
  console.log(execSync('git push', opts));
  console.log('=== git log origin/main -1 ===');
  console.log(execSync('git log origin/main -1', opts));
} catch(e) {
  console.log('ERROR:', e.message);
  if (e.stdout) console.log('stdout:', e.stdout.toString());
  if (e.stderr) console.log('stderr:', e.stderr.toString());
}
