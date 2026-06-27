import http from 'http';
import { toNodeListener } from 'h3/node';
import handler from './dist/server/server.js';

const PORT = process.env.PORT || 3000;

// H3 handles Web Request/Response → Node http
const nodeListener = toNodeListener(handler);
const server = http.createServer(nodeListener);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
