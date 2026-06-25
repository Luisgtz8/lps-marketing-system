// Admin: manually grant/revoke course access after a payment you handle
// yourself (you send a payment link, they pay, you activate them here).
// Auth: Bearer ADMIN_TOKEN.
//   GET                 -> list recent users + their paid status
//   POST { email, action: 'grant' | 'revoke' }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { isAdminRequest, isValidEmail } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (!isAdminRequest(req)) return json(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET') {
    const rows = await sql`
      select u.email, u.nombre, u.empresa, u.whatsapp_e164,
             coalesce(e.paid, false) as paid, e.paid_at, u.created_at
      from users u
      left join entitlements e on e.user_id = u.id
      order by u.created_at desc
      limit 100
    `;
    return json(res, 200, { users: rows });
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const action = body.action === 'revoke' ? 'revoke' : 'grant';
  if (!isValidEmail(email)) return json(res, 400, { error: 'invalid_email' });

  const users = await sql`select id from users where email = ${email} limit 1`;
  const user = users[0] as { id: string } | undefined;
  if (!user) return json(res, 404, { error: 'user_not_found' });

  if (action === 'grant') {
    await sql`
      insert into entitlements (user_id, paid, paid_at)
      values (${user.id}, true, now())
      on conflict (user_id) do update set paid = true,
        paid_at = coalesce(entitlements.paid_at, now())
    `;
  } else {
    await sql`
      insert into entitlements (user_id, paid)
      values (${user.id}, false)
      on conflict (user_id) do update set paid = false
    `;
  }

  return json(res, 200, { ok: true, email, action });
}
