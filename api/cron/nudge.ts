// GET /api/cron/nudge — scheduled WhatsApp nudges for stalled learners.
// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET:
// Vercel sends `Authorization: Bearer $CRON_SECRET` on cron invocations.
//
// Sends only to opted-in contacts that messaged us within the last 24h (the
// free service window). Contacts outside the window need an approved template
// — left as a follow-up so we don't silently fail or incur marketing cost.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { sendText } from '../_lib/whatsapp.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Fail closed: if CRON_SECRET isn't configured, refuse — otherwise anyone
  // could trigger WhatsApp sends (cost + spam). Vercel cron sends this header.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).end();
  }

  // Opted-in, inside the 24h window, with fewer than 7 completed modules,
  // and not nudged in the last 3 days.
  const targets = await sql`
    select c.id as contact_id, c.phone_e164, u.id as user_id, u.nombre,
           count(p.module_id) filter (where p.completed) as done_modules
    from whatsapp_contacts c
    join users u on u.id = c.user_id
    left join course_progress p on p.user_id = u.id
    where c.opt_in_status = 'opted_in'
      and c.last_inbound_at > now() - interval '24 hours'
      and not exists (
        select 1 from whatsapp_messages m
        where m.contact_id = c.id and m.direction = 'outbound'
          and m.created_at > now() - interval '3 days'
      )
    group by c.id, c.phone_e164, u.id, u.nombre
    having count(p.module_id) filter (where p.completed) < 7
  `;

  let sent = 0;
  for (const t of targets as any[]) {
    const remaining = 7 - Number(t.done_modules);
    const name = t.nombre ? ` ${t.nombre}` : '';
    const body = `Hola${name} 👋 Te faltan ${remaining} módulo${remaining === 1 ? '' : 's'} para terminar IA Sin Miedo. ¿Retomamos hoy? Responde BAJA para no recibir más recordatorios.`;
    try {
      await sendText(t.phone_e164, body);
      await sql`
        insert into whatsapp_messages (user_id, contact_id, direction, category, body)
        values (${t.user_id}, ${t.contact_id}, 'outbound', 'utility', ${body})
      `;
      sent++;
    } catch {
      // skip failures; next run retries
    }
  }

  return res.status(200).json({ targets: (targets as any[]).length, sent });
}
