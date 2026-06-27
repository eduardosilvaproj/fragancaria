import { createServer } from 'http';
import server from './dist/server/server.js';

const PORT = process.env.PORT || 3000;

// Create HTTP server that uses Nitro's fetch handler
const httpServer = createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host || `localhost:${PORT}`}`;
    const fetchReq = new Request(new URL(req.url, origin), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([key]) => key !== 'content-length')
          .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      ),
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
    });

    const fetchRes = await server.fetch(fetchReq);

    res.writeHead(fetchRes.status, Object.fromEntries(fetchRes.headers));
    if (fetchRes.body) {
      res.end(await fetchRes.text());
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Support for Vercel serverless
export default async (req, res) => {
  try {
    const origin = `https://${req.headers.host}`;
    const fetchReq = new Request(new URL(req.url, origin), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([key]) => key !== 'content-length')
          .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      ),
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
    });

    const fetchRes = await server.fetch(fetchReq);

    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const text = await fetchRes.text();
    res.end(text);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).end('Internal Server Error');
  }
};
