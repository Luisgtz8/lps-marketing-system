// POST /api/auth/setup-password — set a password via a one-time setup token.
// Body: { token, password }. The token (from the activation email) IS the
// proof of identity — no prior session required. Atomically consumes the
// token, sets the password, verifies the email, revokes prior sessions, and
// returns a fresh 30-day session. Mirrors verify.ts + set-password.ts.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, hashPassword, revokeUserSessions } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token) return json(res, 400, { error: 'missing_token' });
  if (password.length < 8) return json(res, 400, { error: 'weak_password' });

  try {
    // Consume the token atomically: only succeeds if unconsumed AND unexpired.
    const consumed = await sql`
      update magic_link_tokens
      set consumed_at = now()
      where token_hash = ${hashToken(token)}
        and consumed_at is null
        and expires_at > now()
      returning user_id
    `;
    if (consumed.length === 0) return json(res, 401, { error: 'invalid_or_expired' });

    const userId = (consumed[0] as { user_id: string }).user_id;

    await sql`
      update users
      set password_hash = ${hashPassword(password)}, email_verified = true
      where id = ${userId}
    `;

    // Single active session: kick prior sessions, then issue a new one.
    await revokeUserSessions(userId);
    const sessionToken = newToken();
    const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 500);
    await sql`
      insert into sessions (user_id, token_hash, expires_at, user_agent)
      values (${userId}, ${hashToken(sessionToken)}, now() + interval '30 days', ${ua})
    `;

    const userRows = await sql`
      select id, email, nombre, is_admin from users where id = ${userId} limit 1
    `;

    return json(res, 200, { token: sessionToken, user: userRows[0] });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
