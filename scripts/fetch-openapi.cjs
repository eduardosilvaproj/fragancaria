// Busca o spec OpenAPI atual do PostgREST e salva em scripts/.openapi.json.
// Usa SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do ambiente.
//
// Uso:
//   npm run types:fetch        # atualiza scripts/.openapi.json
//   npm run types:refresh      # fetch + regenerate src/integrations/supabase/types.ts

const fs = require('node:fs');
const https = require('node:https');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('================================================================');
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente(s).');
  console.error('Por favor, configure o arquivo local .env na raiz do projeto ou');
  console.error('vincule o projeto no Supabase / Lovable Cloud antes de continuar.');
  console.error('================================================================');
  process.exit(1);
}

const target = process.argv[2] || 'scripts/.openapi.json';

const reqUrl = new URL('/rest/v1/', url);
reqUrl.searchParams.set('apikey', key);

const timer = setTimeout(() => {
  console.error('TIMEOUT: A requisição de OpenAPI para o Supabase expirou após 30 segundos.');
  process.exit(1);
}, 30000);

https.get(reqUrl, { headers: { Accept: 'application/openapi+json' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    clearTimeout(timer);
    if (res.statusCode !== 200) {
      console.error('HTTP', res.statusCode, data.slice(0, 500));
      process.exit(1);
    }
    fs.writeFileSync(target, data);
    console.log('wrote', target, data.length, 'bytes');
  });
}).on('error', (err) => {
  clearTimeout(timer);
  console.error('ERR', err.message);
  process.exit(1);
});
