import { execSync } from 'child_process';
const opts = { cwd: 'C:/dev/fragancaria', timeout: 60000, encoding: 'utf-8' };
try {
  console.log(execSync('git add src/lib/agent/art-director.ts src/lib/agent/social-publish.functions.ts src/lib/zernio.ts src/routes/admin/redes-sociais.tsx', opts));
  console.log(execSync('git commit -m "feat: bt cancelar post + modal data/hora + ajustes art-dir"', opts));
  console.log(execSync('git push origin main', opts));
  console.log('=== git log origin/main -1 ===');
  console.log(execSync('git log origin/main -1', opts));
} catch(e) {
  console.log('ERROR:', e.message);
  if (e.stdout) console.log('stdout:', e.stdout.toString());
  if (e.stderr) console.log('stderr:', e.stderr.toString());
}
