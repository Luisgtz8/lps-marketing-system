// Shared HTTP helpers: CORS + JSON responses.
// The frontend (lightningprosolutions.com on GitHub Pages) is a DIFFERENT
// origin from this API, so every response must carry CORS headers and we must
// answer the OPTIONS preflight.
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allow-list of origins permitted to call the API.
const ALLOWED_ORIGINS = new Set([
  'https://lightningprosolutions.com',
  'https://www.lightningprosolutions.com',
]);

/**
 * Apply CORS headers. If the request is a preflight OPTIONS, end it here and
 * return true so the handler can `return`.
 */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}
