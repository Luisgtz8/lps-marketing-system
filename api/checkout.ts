// POST /api/checkout — start a one-time Stripe Checkout for the course.
// Auth: Bearer session token. Returns { url } to redirect the browser to.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { cors, json } from './_lib/http.js';
import { getSessionUser } from './_lib/auth.js';
import { stripe } from './_lib/stripe.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return json(res, 500, { error: 'price_not_configured' });

  try {
    // Already paid? Don't let them buy twice.
    const ent = await sql`select paid, stripe_customer_id from entitlements where user_id = ${user.id} limit 1`;
    const existing = ent[0] as { paid: boolean; stripe_customer_id: string | null } | undefined;
    if (existing?.paid) return json(res, 409, { error: 'already_paid' });

    // Reuse or create the Stripe customer.
    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await sql`
        insert into entitlements (user_id, stripe_customer_id)
        values (${user.id}, ${customerId})
        on conflict (user_id) do update set stripe_customer_id = ${customerId}
      `;
    }

    const base = process.env.APP_BASE_URL ?? 'https://www.lightningprosolutions.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/curso.html?pago=ok`,
      cancel_url: `${base}/curso.html?pago=cancelado`,
    });

    return json(res, 200, { url: session.url });
  } catch (err) {
    return json(res, 500, { error: 'checkout_failed' });
  }
}
