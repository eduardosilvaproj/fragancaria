import http from 'http';
import { toNodeListener } from 'h3/node';
import handler from './dist/server/server.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Serve static assets + Nitro handler
const server = http.createServer(async (req, res) => {
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
    }
  }

  // All other routes → Nitro handler
  const nodeListener = toNodeListener(handler);
  return nodeListener(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
