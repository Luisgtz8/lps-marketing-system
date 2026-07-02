// Transactional email via Resend. Spanish copy.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Low-level send. Throws if the key is missing or Resend rejects the request.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAGIC_LINK_FROM ?? 'Lightning Pro <no-reply@lightningprosolutions.com>';
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend failed: ${res.status} ${detail}`);
  }
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="background:#F59E0B;color:#1a1a1a;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block">${label}</a>`;
}

export async function sendMagicLink(to: string, link: string): Promise<void> {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:28px;margin:0 0 8px">⚡</p>
      <h2 style="margin:0 0 12px">Tu acceso a IA Aplicada</h2>
      <p style="font-size:15px;line-height:1.5">Haz clic en el botón para entrar al curso. Este enlace expira en 1 hora y solo puede usarse una vez.</p>
      <p style="margin:24px 0">${button(link, 'Entrar al curso →')}</p>
      <p style="font-size:13px;color:#666">Si no solicitaste este acceso, puedes ignorar este correo.</p>
    </div>`;
  await sendEmail(to, 'Tu acceso a IA Aplicada', html);
}

export async function sendSetupPasswordLink(to: string, link: string): Promise<void> {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:28px;margin:0 0 8px">⚡</p>
      <h2 style="margin:0 0 12px">Tu acceso a IA Aplicada está activo</h2>
      <p style="font-size:15px;line-height:1.5">Ya activamos tu acceso al curso. Crea tu contraseña para entrar; con ella podrás iniciar sesión cuando quieras. Este enlace expira en 7 días y solo puede usarse una vez.</p>
      <p style="margin:24px 0">${button(link, 'Crear contraseña →')}</p>
      <p style="font-size:13px;color:#666">Si no esperabas este correo, puedes ignorarlo.</p>
    </div>`;
  await sendEmail(to, 'Tu acceso a IA Aplicada está activo — crea tu contraseña', html);
}
