import http from 'http';
import { toNodeListener } from 'h3/node';
import handler from './dist/server/server.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Debug: print dist structure
console.log('=== Startup Info ===');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('APP_ROOT:', process.env.APP_ROOT || 'not set');

console.log('=== Dist Structure ===');
const clientPath = path.join(__dirname, 'dist/client');
const serverPath = path.join(__dirname, 'dist/server');

console.log('dist/client path:', clientPath);
console.log('dist/client exists:', fs.existsSync(clientPath));
if (fs.existsSync(clientPath)) {
  console.log('dist/client contents:', fs.readdirSync(clientPath));
  const assetsPath = path.join(clientPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath).slice(0, 5);
    console.log('dist/client/assets sample files:', files);
  }
}

console.log('dist/server path:', serverPath);
console.log('dist/server exists:', fs.existsSync(serverPath));
if (fs.existsSync(serverPath)) {
  const files = fs.readdirSync(serverPath).filter(f => !f.startsWith('assets')).slice(0, 5);
  console.log('dist/server files:', files);
}

// Convert Nitro handler to Node.js listener
const nodeListener = toNodeListener(handler);

// Serve static assets + Nitro handler
const server = http.createServer((req, res) => {
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
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (e) {
      // File not found
      console.error(`[static] 404: ${filePath} (${e.code})`);
      // Check what's in assets directory
      try {
        const assetsDir = path.dirname(filePath);
        const available = fs.readdirSync(assetsDir).slice(0, 3);
        console.error(`Available in ${assetsDir}:`, available);
      } catch (e2) {
        console.error(`Cannot list ${path.dirname(filePath)}:`, e2.code);
      }
    }
  }

  // All other routes → Nitro handler
  return nodeListener(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
