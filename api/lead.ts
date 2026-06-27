// POST /api/lead — capture a prospect's contact info WITHOUT granting access.
// Body: { email, nombre?, empresa?, giro?, departamento?, whatsapp? }.
// Upserts the profile into `users` (entitlements stay unpaid). No magic link is
// sent — access is activated manually via admin.html after payment. The gate's
// "Quiero acceso" tab then sends the prospect to WhatsApp.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';
import { isValidEmail } from './_lib/auth.js';

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

  try {
    await sql`
      insert into users (email, nombre, empresa, giro, departamento, whatsapp_e164)
      values (${email}, ${profile.nombre}, ${profile.empresa}, ${profile.giro},
              ${profile.departamento}, ${profile.whatsapp})
      on conflict (email) do update set
        nombre        = coalesce(users.nombre, excluded.nombre),
        empresa       = coalesce(users.empresa, excluded.empresa),
        giro          = coalesce(users.giro, excluded.giro),
        departamento  = coalesce(users.departamento, excluded.departamento),
        whatsapp_e164 = coalesce(users.whatsapp_e164, excluded.whatsapp_e164)
    `;
    return json(res, 200, { ok: true });
  } catch (err) {
    // Don't leak internals; the gate shows a generic "te contactamos" anyway.
    return json(res, 200, { ok: true });
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
