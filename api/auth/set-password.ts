// POST /api/auth/set-password — set/replace the current user's password.
// Auth: Bearer session token. Body: { password } (min 8 chars).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { getSessionUser, hashPassword } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8) return json(res, 400, { error: 'weak_password' });

  try {
    await sql`update users set password_hash = ${hashPassword(password)} where id = ${user.id}`;
    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
