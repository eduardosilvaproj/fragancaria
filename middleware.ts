import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default function (req: VercelRequest, res: VercelResponse) {
  // This middleware prevents Vercel platform redirects
  res.setHeader('x-middleware-skip', '1');
  return res.status(200).end();
}

export const config = {
  matcher: ['/', '/:path*'],
};
