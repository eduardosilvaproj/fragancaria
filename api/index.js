import { createServer } from 'http';
import { URL } from 'url';

// Lazy load the server module on first request
let serverModule = null;

async function getServer() {
  if (!serverModule) {
    try {
      serverModule = await import('../dist/server/server.js');
    } catch (err) {
      console.error('Failed to load server module:', err);
      throw err;
    }
  }
  return serverModule.default;
}

export default async (req, res) => {
  try {
    const server = await getServer();

    if (!server || typeof server.fetch !== 'function') {
      console.error('Server does not have fetch method');
      res.status(500).json({ error: 'Server not properly initialized' });
      return;
    }

    // Convert Node.js request to fetch API Request
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Read body if present
    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data || undefined));
        req.on('error', reject);
      });
    }

    // Create fetch request
    const fetchReq = new Request(url.toString(), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      ),
      body,
    });

    // Call server
    const fetchRes = await server.fetch(fetchReq);

    // Send response
    res.status(fetchRes.status);

    // Copy headers
    fetchRes.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    // Send body
    if (fetchRes.body) {
      const text = await fetchRes.text();
      res.end(text);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
