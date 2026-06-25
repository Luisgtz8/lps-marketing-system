// POST /api/auth/logout — revoke the current session server-side.
// Auth: Bearer session token. Marks sessions.revoked_at so the token stops
// working immediately (clearing localStorage alone left it valid for 30 days).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { hashToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return json(res, 200, { ok: true });
  const token = header.slice('Bearer '.length).trim();
  if (!token) return json(res, 200, { ok: true });

  try {
    await sql`
      update sessions set revoked_at = now()
      where token_hash = ${hashToken(token)} and revoked_at is null
    `;
  } catch (err) {
    // best-effort; the client clears localStorage regardless
  }
  return json(res, 200, { ok: true });
}
