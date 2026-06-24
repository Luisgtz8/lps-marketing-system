// WhatsApp (Meta Cloud API) helpers: phone normalization, signature check,
// and outbound send. Twilio sandbox can reuse the same DB shape for testing.
import { createHmac, timingSafeEqual } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * Normalize a Mexican phone to E.164 (+52##########).
 * Mexico dropped the "1" mobile prefix; we strip a leading 521 -> 52.
 */
export function toE164MX(raw: string): string | null {
  let d = (raw || '').replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('521')) d = '52' + d.slice(3);   // legacy 1-prefix
  if (d.length === 10) d = '52' + d;                 // bare 10-digit local
  if (!d.startsWith('52') || d.length !== 12) return null;
  return '+' + d;
}

/**
 * Verify the X-Hub-Signature-256 header against the raw request body using the
 * Meta app secret. Returns true if valid.
 */
export function verifyMetaSignature(raw: Buffer, signature: string | undefined): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Send a free-form text (only valid inside the 24h service window). */
export async function sendText(toE164: string, body: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('WhatsApp env not configured');

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toE164.replace('+', ''),
      type: 'text',
      text: { body },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp send failed: ${res.status} ${detail}`);
  }
}
