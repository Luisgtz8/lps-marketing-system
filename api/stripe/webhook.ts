// POST /api/stripe/webhook — Stripe event sink (source of truth for "paid").
// No CORS (server-to-server). Needs the RAW body for signature verification,
// so Vercel's body parser is disabled below.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { sql } from '../_lib/db.js';
import { stripe } from '../_lib/stripe.js';

export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  if (!secret || !sig) return res.status(400).json({ error: 'missing_signature' });

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return res.status(400).json({ error: 'invalid_signature' });
  }

  // Idempotency: insert the event id first. On conflict, we've already
  // processed it — ack 200 and stop. This makes Stripe retries safe.
  try {
    const inserted = await sql`
      insert into payments (stripe_event_id, type, raw)
      values (${event.id}, ${event.type}, ${JSON.stringify(event)})
      on conflict (stripe_event_id) do nothing
      returning id
    `;
    if (inserted.length === 0) return res.status(200).json({ received: true, duplicate: true });
  } catch (err) {
    return res.status(500).json({ error: 'persist_failed' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only act on a fully paid one-time checkout.
      if (session.payment_status === 'paid') {
        const userId = session.client_reference_id;
        const customerId = typeof session.customer === 'string' ? session.customer : null;

        // Resolve the user by client_reference_id, falling back to customer id.
        const rows = userId
          ? await sql`select id from users where id = ${userId} limit 1`
          : await sql`select user_id as id from entitlements where stripe_customer_id = ${customerId} limit 1`;
        const resolvedId = (rows[0] as { id: string } | undefined)?.id;

        if (resolvedId) {
          await sql`
            insert into entitlements (user_id, stripe_customer_id, paid, paid_at)
            values (${resolvedId}, ${customerId}, true, now())
            on conflict (user_id) do update set
              paid = true,
              paid_at = coalesce(entitlements.paid_at, now()),
              stripe_customer_id = coalesce(entitlements.stripe_customer_id, ${customerId})
          `;
          // Backfill the user_id + amount on the payment audit row.
          await sql`
            update payments
            set user_id = ${resolvedId},
                stripe_object_id = ${session.id},
                amount_cents = ${session.amount_total},
                currency = ${session.currency ?? 'mxn'}
            where stripe_event_id = ${event.id}
          `;
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    // We already stored the event; let Stripe retry the side effects.
    return res.status(500).json({ error: 'handler_failed' });
  }
}
