// POST /api/auth/login — email + password login.
// Body: { email, password }. Verifies the password, enforces single active
// session (revokes prior ones), issues a 30-day session bearer token.
// Generic 401 on any failure (no email enumeration).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, verifyPassword, revokeUserSessions, isValidEmail } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isValidEmail(email) || !password) return json(res, 401, { error: 'invalid_credentials' });

  try {
    const rows = await sql`
      select id, email, nombre, is_admin, password_hash
      from users where email = ${email} limit 1
    `;
    const user = rows[0] as
      | { id: string; email: string; nombre: string | null; is_admin: boolean; password_hash: string | null }
      | undefined;

    // No user, or no password set yet → generic failure (use magic link instead).
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: 'invalid_credentials' });
    }

    // Single active session: kill prior sessions, then issue a new one.
    await revokeUserSessions(user.id);
    const sessionToken = newToken();
    const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 500);
    await sql`
      insert into sessions (user_id, token_hash, expires_at, user_agent)
      values (${user.id}, ${hashToken(sessionToken)}, now() + interval '30 days', ${ua})
    `;

    return json(res, 200, {
      token: sessionToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, is_admin: user.is_admin },
    });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
