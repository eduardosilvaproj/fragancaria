import http from 'http';
import { toNodeListener } from 'h3/node';
import handler from './dist/server/server.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Debug: print dist structure
console.log('=== Dist Structure ===');
console.log('dist/client exists:', fs.existsSync(path.join(__dirname, 'dist/client')));
if (fs.existsSync(path.join(__dirname, 'dist/client'))) {
  console.log('dist/client contents:', fs.readdirSync(path.join(__dirname, 'dist/client')));
}
console.log('dist/server exists:', fs.existsSync(path.join(__dirname, 'dist/server')));
if (fs.existsSync(path.join(__dirname, 'dist/server'))) {
  console.log('dist/server files:', fs.readdirSync(path.join(__dirname, 'dist/server')).filter(f => !f.startsWith('assets')).slice(0, 5));
}

// Convert Nitro handler to Node.js listener
const nodeListener = toNodeListener(handler);

// Serve static assets + Nitro handler
const server = http.createServer((req, res) => {
  // Debug: write to file
  fs.appendFileSync('/tmp/requests.log', `${new Date().toISOString()} ${req.method} ${req.url}\n`);

  // Handle /assets/* - serve from dist/client/assets/ (where Vite puts client-side assets)
  if (req.url.startsWith('/assets/')) {
    const filePath = path.join(__dirname, 'dist/client', req.url);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (e) {
      // File not found, fall through to handler
      console.error(`[static] 404: ${filePath}`, e.code);
    }
  }

  // All other routes → Nitro handler
  return nodeListener(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
