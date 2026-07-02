// POST /api/auth/request — start magic-link login.
// Body: { email, nombre?, empresa?, giro?, departamento?, whatsapp?, wa_optin? }
// Upserts the user (capturing profile from the registration form on first
// request), issues a single-use 15-min token, and emails the link.
// Always returns 200 to avoid leaking which emails exist.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, isValidEmail } from '../_lib/auth.js';
import { sendMagicLink } from '../_lib/email.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return json(res, 400, { error: 'invalid_email' });

  const profile = {
    nombre: str(body.nombre),
    empresa: str(body.empresa),
    giro: str(body.giro),
    departamento: str(body.departamento),
    whatsapp: str(body.whatsapp),
  };
  const waOptin = body.wa_optin === true;

  try {
    // Upsert user. On conflict, only fill profile columns that are still null
    // (don't clobber data the user already provided on a prior login).
    const userRows = await sql`
      insert into users (email, nombre, empresa, giro, departamento, whatsapp_e164)
      values (${email}, ${profile.nombre}, ${profile.empresa}, ${profile.giro},
              ${profile.departamento}, ${profile.whatsapp})
      on conflict (email) do update set
        nombre        = coalesce(users.nombre, excluded.nombre),
        empresa       = coalesce(users.empresa, excluded.empresa),
        giro          = coalesce(users.giro, excluded.giro),
        departamento  = coalesce(users.departamento, excluded.departamento),
        whatsapp_e164 = coalesce(users.whatsapp_e164, excluded.whatsapp_e164)
      returning id
    `;
    const userId = (userRows[0] as { id: string }).id;

    // Capture WhatsApp opt-in if given and a phone is present.
    if (waOptin && profile.whatsapp) {
      await sql`
        insert into whatsapp_contacts (user_id, phone_e164, opt_in_status, opt_in_at, consent_source)
        values (${userId}, ${profile.whatsapp}, 'opted_in', now(), 'curso_form')
        on conflict (user_id) do update set
          opt_in_status = 'opted_in',
          opt_in_at = now(),
          consent_source = 'curso_form'
      `;
    }

    // Invalidate any outstanding links for this user, then issue a fresh
    // single-use token (store only its hash). A new request supersedes old ones.
    await sql`
      update magic_link_tokens set consumed_at = now()
      where user_id = ${userId} and consumed_at is null and kind = 'magic_link'
    `;
    const token = newToken();
    await sql`
      insert into magic_link_tokens (user_id, token_hash, expires_at, kind)
      values (${userId}, ${hashToken(token)}, now() + interval '60 minutes', 'magic_link')
    `;

    const base = (process.env.APP_BASE_URL ?? 'https://www.lightningprosolutions.com').trim().replace(/\/$/, '');
    const link = `${base}/curso.html#token=${token}`;
    await sendMagicLink(email, link);

    return json(res, 200, { ok: true });
  } catch (err) {
    // Don't leak internals; still 200-ish UX so the page shows "revisa tu correo".
    return json(res, 200, { ok: true });
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
