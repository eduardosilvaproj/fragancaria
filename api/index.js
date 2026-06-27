// Vercel Node.js server entry point
// Runs the Nitro server built by TanStack Start + Lovable
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamically import the server from built output
const getServer = async () => {
  try {
    // Import from the built server output
    const { default: server } = await import('../dist/server/server.js');
    return server;
  } catch (err) {
    console.error('Failed to load server:', err);
    throw err;
  }
};

export default async (req, res) => {
  try {
    const server = await getServer();

    if (!server || !server.fetch) {
      res.status(500).json({ error: 'Server not initialized' });
      return;
    }

    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
    });

    const response = await server.fetch(request);

    res.status(response.status);
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    if (response.body) {
      res.end(await response.text());
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
};
