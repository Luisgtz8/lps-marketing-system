// GET /api/health — liveness + DB connectivity check.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const rows = await sql`select 1 as ok`;
    return json(res, 200, { status: 'ok', db: rows[0]?.ok === 1 });
  } catch (err) {
    return json(res, 503, { status: 'degraded', db: false });
  }
}
