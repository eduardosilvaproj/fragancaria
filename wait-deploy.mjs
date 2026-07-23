import { execSync } from 'child_process';
const opts = { cwd: 'C:/dev/fragancaria', timeout: 30000, encoding: 'utf-8' };
for (let i = 0; i < 12; i++) {
  try {
    const out = execSync('railway status', opts);
    if (out.includes('Online')) {
      console.log('DEPLOY COMPLETO - Online');
      console.log(out);
      process.exit(0);
    }
    if (out.includes('Building')) {
      console.log('Ainda building... tentativa ' + (i+1));
    }
  } catch(e) {
    console.log('Erro na tentativa ' + (i+1) + ': ' + e.message);
  }
  // wait 15s
  const start = Date.now();
  while (Date.now() - start < 15000) {}
}
console.log('Timeout - deploy ainda nao completo');
