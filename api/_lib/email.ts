// Transactional email via Resend (magic links). Spanish copy.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendMagicLink(to: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAGIC_LINK_FROM ?? 'Lightning Pro <no-reply@lightningprosolutions.com>';
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:28px;margin:0 0 8px">⚡</p>
      <h2 style="margin:0 0 12px">Tu acceso a IA Sin Miedo</h2>
      <p style="font-size:15px;line-height:1.5">Haz clic en el botón para entrar al curso. Este enlace expira en 15 minutos y solo puede usarse una vez.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#F59E0B;color:#1a1a1a;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block">Entrar al curso →</a>
      </p>
      <p style="font-size:13px;color:#666">Si no solicitaste este acceso, puedes ignorar este correo.</p>
    </div>`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Tu acceso a IA Sin Miedo',
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend failed: ${res.status} ${detail}`);
  }
}
