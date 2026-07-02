// Admin dashboard API.
// Auth: admin user session (is_admin) — primary — or the shared ADMIN_TOKEN.
//   GET ?search=  -> metrics + users (paid status, admin flag, modules done)
//   POST { email, action: 'grant' | 'revoke' | 'make_admin' | 'remove_admin' }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { requireAdmin, isValidEmail, newToken, hashToken } from '../_lib/auth.js';
import { sendActivationLink } from '../_lib/email.js';

const ACTIONS = new Set(['grant', 'revoke', 'make_admin', 'remove_admin', 'edit_profile', 'reset_password']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if ((await requireAdmin(req)) === null) return json(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET') return list(req, res);
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!isValidEmail(email)) return json(res, 400, { error: 'invalid_email' });
  if (!ACTIONS.has(action)) return json(res, 400, { error: 'invalid_action' });

  const users = await sql`select id from users where email = ${email} limit 1`;
  const user = users[0] as { id: string } | undefined;
  if (!user) return json(res, 404, { error: 'user_not_found' });

  switch (action) {
    case 'grant': {
      await sql`
        insert into entitlements (user_id, paid, paid_at)
        values (${user.id}, true, now())
        on conflict (user_id) do update set paid = true,
          paid_at = coalesce(entitlements.paid_at, now())
      `;
      // Send a direct-access magic link. Email failure must NOT revoke access.
      let emailSent = false;
      try {
        await sql`
          update magic_link_tokens set consumed_at = now()
          where user_id = ${user.id} and consumed_at is null and kind = 'magic_link'
        `;
        const token = newToken();
        await sql`
          insert into magic_link_tokens (user_id, token_hash, expires_at, kind)
          values (${user.id}, ${hashToken(token)}, now() + interval '7 days', 'magic_link')
        `;
        const base = (process.env.APP_BASE_URL ?? 'https://www.lightningprosolutions.com').trim().replace(/\/$/, '');
        await sendActivationLink(email, `${base}/curso.html?token=${token}`);
        emailSent = true;
      } catch (err) {
        emailSent = false;
      }
      return json(res, 200, { ok: true, email, action, emailSent });
    }
    case 'revoke':
      await sql`
        insert into entitlements (user_id, paid)
        values (${user.id}, false)
        on conflict (user_id) do update set paid = false
      `;
      break;
    case 'make_admin':
      await sql`update users set is_admin = true where id = ${user.id}`;
      break;
    case 'remove_admin':
      await sql`update users set is_admin = false where id = ${user.id}`;
      break;
    case 'edit_profile': {
      const nombre      = typeof body.nombre      === 'string' ? body.nombre.trim()      || null : undefined;
      const empresa     = typeof body.empresa     === 'string' ? body.empresa.trim()     || null : undefined;
      const whatsapp    = typeof body.whatsapp    === 'string' ? body.whatsapp.trim()    || null : undefined;
      const giro        = typeof body.giro        === 'string' ? body.giro.trim()        || null : undefined;
      const departamento= typeof body.departamento=== 'string' ? body.departamento.trim()|| null : undefined;
      await sql`
        update users set
          nombre        = ${nombre        as string | null},
          empresa       = ${empresa       as string | null},
          whatsapp_e164 = ${whatsapp      as string | null},
          giro          = ${giro          as string | null},
          departamento  = ${departamento  as string | null}
        where id = ${user.id}
      `;
      break;
    }
    case 'reset_password': {
      await sql`
        update magic_link_tokens set consumed_at = now()
        where user_id = ${user.id} and consumed_at is null and kind = 'magic_link'
      `;
      const token = newToken();
      await sql`
        insert into magic_link_tokens (user_id, token_hash, expires_at, kind)
        values (${user.id}, ${hashToken(token)}, now() + interval '7 days', 'magic_link')
      `;
      const base = (process.env.APP_BASE_URL ?? 'https://www.lightningprosolutions.com').trim().replace(/\/$/, '');
      const link = `${base}/curso.html?token=${token}`;
      return json(res, 200, { ok: true, email, action, link });
    }
  }

  return json(res, 200, { ok: true, email, action });
}

async function list(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.search;
  const search = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  const like = `%${search}%`;

  // Users + paid + admin + completed module count, filtered by optional search.
  const users = await sql`
    select u.email, u.nombre, u.empresa, u.whatsapp_e164, u.giro, u.departamento, u.is_admin,
           coalesce(e.paid, false) as paid, e.paid_at, u.created_at,
           coalesce(cp.done, 0) as modules_done
    from users u
    left join entitlements e on e.user_id = u.id
    left join (
      select user_id, count(*) filter (where completed) as done
      from course_progress group by user_id
    ) cp on cp.user_id = u.id
    where ${search === ''} or u.email ilike ${like}
       or u.nombre ilike ${like} or u.empresa ilike ${like}
    order by u.created_at desc
    limit 500
  `;

  // Aggregate metrics over the whole table (not just the filtered page).
  const m = await sql`
    select
      count(*) as total,
      count(*) filter (where e.paid) as pagados,
      count(*) filter (where u.is_admin) as admins
    from users u
    left join entitlements e on e.user_id = u.id
  `;
  const avg = await sql`
    select coalesce(round(avg(done) * 100.0 / 7, 0), 0) as avg_pct
    from (
      select user_id, count(*) filter (where completed) as done
      from course_progress group by user_id
    ) t
  `;
  const metrics = {
    total: Number((m[0] as any).total),
    pagados: Number((m[0] as any).pagados),
    pendientes: Number((m[0] as any).total) - Number((m[0] as any).pagados),
    admins: Number((m[0] as any).admins),
    avg_pct: Number((avg[0] as any).avg_pct),
  };

  return json(res, 200, { users, metrics });
}
