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
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const target = process.argv[2] || 'scripts/.openapi.json';

const reqUrl = new URL('/rest/v1/', url);
reqUrl.searchParams.set('apikey', key);

https.get(reqUrl, { headers: { Accept: 'application/openapi+json' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('HTTP', res.statusCode, data.slice(0, 500));
      process.exit(1);
    }
    fs.writeFileSync(target, data);
    console.log('wrote', target, data.length, 'bytes');
  });
}).on('error', (err) => {
  console.error('ERR', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(1);
}, 30000);
