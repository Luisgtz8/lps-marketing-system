// WhatsApp webhook (Meta Cloud API).
//   GET  — verification handshake (hub.verify_token).
//   POST — inbound messages: verify HMAC, log, match to user, handle opt-out.
// No CORS (server-to-server). Raw body needed for signature → bodyParser off.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { toE164MX, verifyMetaSignature, sendText } from '../_lib/whatsapp.js';

export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const OPT_OUT_WORDS = new Set(['baja', 'stop', 'cancelar', 'unsubscribe']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── GET: verification handshake ──
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method !== 'POST') return res.status(405).end();

  const raw = await readRawBody(req);
  if (!verifyMetaSignature(raw, req.headers['x-hub-signature-256'] as string | undefined)) {
    return res.status(401).end();
  }

  let payload: any;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).end(); }

  try {
    const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    for (const msg of messages) {
      if (msg.type !== 'text') continue;
      const phone = toE164MX(msg.from);
      if (!phone) continue;
      const body = (msg.text?.body ?? '').trim();

      // Upsert contact, stamp last_inbound_at (drives the 24h window).
      const rows = await sql`
        insert into whatsapp_contacts (phone_e164, last_inbound_at, consent_source)
        values (${phone}, now(), 'reply_keyword')
        on conflict (phone_e164) do update set last_inbound_at = now()
        returning id, user_id, opt_in_status
      `;
      const contact = rows[0] as { id: string; user_id: string | null; opt_in_status: string };

      // Match to a user by phone if not already linked.
      let userId = contact.user_id;
      if (!userId) {
        const u = await sql`select id from users where whatsapp_e164 = ${phone} limit 1`;
        userId = (u[0] as { id: string } | undefined)?.id ?? null;
        if (userId) await sql`update whatsapp_contacts set user_id = ${userId} where id = ${contact.id}`;
      }

      // Log inbound.
      await sql`
        insert into whatsapp_messages (user_id, contact_id, direction, wa_message_id, body, raw)
        values (${userId}, ${contact.id}, 'inbound', ${msg.id ?? null}, ${body}, ${JSON.stringify(msg)})
      `;

      // Opt-out keyword.
      if (OPT_OUT_WORDS.has(body.toLowerCase())) {
        await sql`
          update whatsapp_contacts set opt_in_status = 'opted_out', opt_out_at = now()
          where id = ${contact.id}
        `;
        try { await sendText(phone, 'Listo, no volverás a recibir mensajes. Responde HOLA si cambias de opinión.'); } catch {}
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    // Ack 200 so Meta doesn't hammer retries; the event is already logged best-effort.
    return res.status(200).json({ received: true });
  }
}
