import type { VercelRequest, VercelResponse } from '@vercel/node';
import server from '../dist/server/server.js';

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const origin = `https://${req.headers.host}`;
    const url = req.url || '/';

    const fetchReq = new Request(new URL(url, origin), {
      method: req.method || 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers || {})
          .filter(([key]) => key !== 'content-length')
          .map(([key, value]) => [key, Array.isArray(value) ? value[0] : (value || '')])
      ),
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : (req as any),
    });

    const fetchRes = await server.fetch(fetchReq);

    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const text = await fetchRes.text();
    res.end(text);
  } catch (error) {
    console.error('Error in catch-all handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


