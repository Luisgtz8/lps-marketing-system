// POST /api/auth/verify — exchange a magic-link token for a session bearer.
// Body: { token }. Atomically consumes the token (single-use), marks the email
// verified, creates a 30-day session, returns { token, user }.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, revokeUserSessions } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return json(res, 400, { error: 'missing_token' });

  try {
    // Consume the token atomically: only succeeds if unconsumed AND unexpired.
    // The `consumed_at is null` guard makes this single-use even under races.
    const consumed = await sql`
      update magic_link_tokens
      set consumed_at = now()
      where token_hash = ${hashToken(token)}
        and consumed_at is null
        and expires_at > now()
        and kind = 'magic_link'
      returning user_id
    `;
    if (consumed.length === 0) return json(res, 401, { error: 'invalid_or_expired' });

    const userId = (consumed[0] as { user_id: string }).user_id;

    // First successful verification confirms the email.
    await sql`update users set email_verified = true where id = ${userId}`;

    // Single active session: a magic-link login also kicks prior sessions.
    await revokeUserSessions(userId);

    // Create the session.
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
