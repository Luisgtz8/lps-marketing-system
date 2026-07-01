# Link de "crear contraseña" al activar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al activar (grant) a un usuario en `admin.html`, mandarle un correo vía Resend con un link de un solo uso a una pantalla "Crea tu contraseña" en `curso.html`; tras definirla queda con sesión y entra al curso.

**Architecture:** Reusa la tabla `magic_link_tokens` (token hash + expiración) con vida de 7 días. `grant` genera el token y manda el correo. Un endpoint nuevo `setup-password` valida el token, setea la contraseña y crea la sesión en una operación (igual que `verify.ts` + `set-password.ts` combinados). El frontend del gate detecta `#setpw=` en el hash y muestra la pantalla nueva.

**Tech Stack:** TypeScript Vercel Functions, Neon/pg (driver `sql` tagged-template en `api/_lib/db.ts`), Resend (HTTP), HTML/CSS/JS vanilla en `docs/`.

## Global Constraints

- **No hay framework de tests para el backend TS.** La verificación de este proyecto es `npm run typecheck` (`tsc --noEmit`) + prueba manual end-to-end con `curl`/navegador. NO introducir vitest/jest.
- **Copy en español** para todo lo visible al usuario (correos, pantallas, toasts).
- **Imports de handlers usan extensión `.js`** (ESM + `@vercel/node`), p. ej. `from '../_lib/db.js'`, aunque el archivo sea `.ts`.
- **El servidor de dev** corre con `npx tsx watch --env-file=.env.development.local dev-server.mts` en `http://localhost:3000`. `tsx watch` reinicia solo al guardar archivos.
- **Resend ya configurado en dev:** `RESEND_API_KEY` + `MAGIC_LINK_FROM="Lightning Pro <onboarding@lightningprosolutions.com>"` en `.env.development.local`. `APP_BASE_URL=http://localhost:3000`.
- **Token de setup:** reusa `magic_link_tokens`, `expires_at = now() + interval '7 days'`. Sin migración nueva.
- **Fallo de correo NO revierte el acceso.** `grant` responde 200 con `emailSent: boolean`.
- **No introducir anon keys ni acoplar al reminder de Python.**

---

### Task 1: Generalizar `email.ts` y añadir plantilla de "crear contraseña"

**Files:**
- Modify: `api/_lib/email.ts`

**Interfaces:**
- Consumes: `process.env.RESEND_API_KEY`, `process.env.MAGIC_LINK_FROM`.
- Produces:
  - `sendEmail(to: string, subject: string, html: string): Promise<void>` — POST a Resend; lanza si falta la key o si Resend responde no-ok.
  - `sendMagicLink(to: string, link: string): Promise<void>` — sin cambio de comportamiento, ahora delega en `sendEmail`.
  - `sendSetupPasswordLink(to: string, link: string): Promise<void>` — correo de activación con botón "Crear contraseña →".

- [ ] **Step 1: Reescribir `email.ts` extrayendo `sendEmail` y añadiendo `sendSetupPasswordLink`**

Reemplazar el contenido completo de `api/_lib/email.ts` por:

```ts
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
      <p style="font-size:15px;line-height:1.5">Haz clic en el botón para entrar al curso. Este enlace expira en 15 minutos y solo puede usarse una vez.</p>
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (sin errores). Si falla, corregir tipos antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/email.ts
git commit -m "refactor(email): extract sendEmail + add sendSetupPasswordLink"
```

---

### Task 2: Endpoint `POST /api/auth/setup-password`

**Files:**
- Create: `api/auth/setup-password.ts`

**Interfaces:**
- Consumes (de `api/_lib/auth.ts`): `hashToken(token: string): string`, `newToken(): string`, `hashPassword(password: string): string`, `revokeUserSessions(userId: string): Promise<void>`. De `api/_lib/db.ts`: `sql`. De `api/_lib/http.ts`: `cors`, `json`.
- Produces: handler `default` que responde `{ token, user }` en éxito (mismo shape que `verify.ts`).

- [ ] **Step 1: Crear el handler**

Crear `api/auth/setup-password.ts`:

```ts
// POST /api/auth/setup-password — set a password via a one-time setup token.
// Body: { token, password }. The token (from the activation email) IS the
// proof of identity — no prior session required. Atomically consumes the
// token, sets the password, verifies the email, revokes prior sessions, and
// returns a fresh 30-day session. Mirrors verify.ts + set-password.ts.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, hashPassword, revokeUserSessions } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token) return json(res, 400, { error: 'missing_token' });
  if (password.length < 8) return json(res, 400, { error: 'weak_password' });

  try {
    // Consume the token atomically: only succeeds if unconsumed AND unexpired.
    const consumed = await sql`
      update magic_link_tokens
      set consumed_at = now()
      where token_hash = ${hashToken(token)}
        and consumed_at is null
        and expires_at > now()
      returning user_id
    `;
    if (consumed.length === 0) return json(res, 401, { error: 'invalid_or_expired' });

    const userId = (consumed[0] as { user_id: string }).user_id;

    await sql`
      update users
      set password_hash = ${hashPassword(password)}, email_verified = true
      where id = ${userId}
    `;

    // Single active session: kick prior sessions, then issue a new one.
    await revokeUserSessions(userId);
    const sessionToken = newToken();
    const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 500);
    await sql`
      insert into sessions (user_id, token_hash, expires_at, user_agent)
      values (${userId}, ${hashToken(sessionToken)}, now() + interval '30 days', ${ua})
    `;

    const userRows = await sql`
      select id, email, nombre, is_admin from users where id = ${userId} limit 1
    `;

    return json(res, 200, { token: sessionToken, user: userRows[0] });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Probar el endpoint con un token sembrado**

Asegurar que el server de dev esté corriendo. Sembrar un token de setup conocido y probar el endpoint. Crear `_t2.tmp.mjs` en la raíz del repo:

```js
import pg from 'pg';
import { createHash, randomBytes } from 'node:crypto';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const EMAIL = 't2.setup@example.com';
const u = await c.query(
  `insert into users (email, nombre) values ($1,'T2 Setup')
   on conflict (email) do update set nombre=excluded.nombre returning id`, [EMAIL]);
const uid = u.rows[0].id;
const RAW = 'setup-token-t2-' + randomBytes(4).toString('hex');
const hash = createHash('sha256').update(RAW).digest('hex');
await c.query(
  `insert into magic_link_tokens (user_id, token_hash, expires_at)
   values ($1,$2, now()+interval '7 days')`, [uid, hash]);
console.log('RAW_TOKEN', RAW);
await c.end();
```

Run:
```bash
node --env-file=.env.development.local _t2.tmp.mjs
```
Copiar el `RAW_TOKEN` impreso y usarlo abajo (sustituir `<RAW>`):
```bash
curl -s -X POST http://localhost:3000/api/auth/setup-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<RAW>","password":"NuevaPass123"}'
```
Expected: JSON con `{"token":"...","user":{...,"email":"t2.setup@example.com"}}`.

Reusar el MISMO token otra vez:
```bash
curl -s -o /dev/null -w "reuse: %{http_code}\n" -X POST http://localhost:3000/api/auth/setup-password \
  -H 'Content-Type: application/json' -d '{"token":"<RAW>","password":"NuevaPass123"}'
```
Expected: `reuse: 401`.

Contraseña corta:
```bash
node --env-file=.env.development.local _t2.tmp.mjs   # genera otro token
# usar el nuevo RAW:
curl -s -o /dev/null -w "weak: %{http_code}\n" -X POST http://localhost:3000/api/auth/setup-password \
  -H 'Content-Type: application/json' -d '{"token":"<RAW2>","password":"corta"}'
```
Expected: `weak: 400`.

Limpiar: `rm -f _t2.tmp.mjs`

- [ ] **Step 4: Commit**

```bash
git add api/auth/setup-password.ts
git commit -m "feat(auth): POST /api/auth/setup-password (token → password + session)"
```

---

### Task 3: `grant` genera token y manda el correo de activación

**Files:**
- Modify: `api/admin/access.ts` (el `case 'grant':` y el `return` final del POST)

**Interfaces:**
- Consumes: `newToken`, `hashToken` (de `_lib/auth.js`), `sendSetupPasswordLink` (de `_lib/email.js`, Task 1), `sql`, `process.env.APP_BASE_URL`. El `user.id` y `email` ya están en scope en el handler.
- Produces: en `action === 'grant'`, el POST responde `{ ok: true, email, action, emailSent: boolean }`. Las demás acciones siguen devolviendo `{ ok: true, email, action }`.

- [ ] **Step 1: Añadir imports**

En `api/admin/access.ts`, ampliar los imports existentes. Cambiar:

```ts
import { requireAdmin, isValidEmail } from '../_lib/auth.js';
```
por:
```ts
import { requireAdmin, isValidEmail, newToken, hashToken } from '../_lib/auth.js';
import { sendSetupPasswordLink } from '../_lib/email.js';
```

- [ ] **Step 2: Hacer que el POST reporte `emailSent` y que `grant` mande el correo**

En el handler, localizar el bloque `switch (action) { ... }` y el `return json(res, 200, { ok: true, email, action });` que le sigue.

Reemplazar el `case 'grant':` actual:

```ts
    case 'grant':
      await sql`
        insert into entitlements (user_id, paid, paid_at)
        values (${user.id}, true, now())
        on conflict (user_id) do update set paid = true,
          paid_at = coalesce(entitlements.paid_at, now())
      `;
      break;
```
por:
```ts
    case 'grant': {
      await sql`
        insert into entitlements (user_id, paid, paid_at)
        values (${user.id}, true, now())
        on conflict (user_id) do update set paid = true,
          paid_at = coalesce(entitlements.paid_at, now())
      `;
      // Send a one-time "create your password" link. Email failure must NOT
      // revoke access — the grant already succeeded; report emailSent so the
      // panel can warn the admin to follow up manually.
      let emailSent = false;
      try {
        // Supersede any outstanding tokens, then issue a fresh 7-day one.
        await sql`
          update magic_link_tokens set consumed_at = now()
          where user_id = ${user.id} and consumed_at is null
        `;
        const token = newToken();
        await sql`
          insert into magic_link_tokens (user_id, token_hash, expires_at)
          values (${user.id}, ${hashToken(token)}, now() + interval '7 days')
        `;
        const base = process.env.APP_BASE_URL ?? 'https://www.lightningprosolutions.com';
        await sendSetupPasswordLink(email, `${base}/curso.html#setpw=${token}`);
        emailSent = true;
      } catch (err) {
        emailSent = false;
      }
      return json(res, 200, { ok: true, email, action, emailSent });
    }
```

Dejar los demás `case` y el `return json(res, 200, { ok: true, email, action });` final tal cual (siguen aplicando a revoke/make_admin/remove_admin).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Probar grant → correo real**

Server de dev corriendo. Crear un lead nuevo, activarlo con el ADMIN_TOKEN, y confirmar `emailSent:true` (debe llegar un correo real a la dirección — usar una bandeja que controles, p. ej. la del admin):

```bash
EMAIL=tu-correo-de-prueba@gmail.com   # usar una bandeja real que puedas revisar
curl -s -X POST http://localhost:3000/api/lead -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"nombre\":\"Grant Test\"}"; echo
curl -s -X POST http://localhost:3000/api/admin/access -H 'Content-Type: application/json' \
  -H "Authorization: Bearer local-dev-admin-token" \
  -d "{\"email\":\"$EMAIL\",\"action\":\"grant\"}"; echo
```
Expected: el segundo curl responde `{"ok":true,"email":"...","action":"grant","emailSent":true}` y llega un correo "Tu acceso a IA Aplicada está activo — crea tu contraseña" con un botón a `http://localhost:3000/curso.html#setpw=<token>`.

- [ ] **Step 5: Commit**

```bash
git add api/admin/access.ts
git commit -m "feat(admin): grant sends a set-password email (Resend), reports emailSent"
```

---

### Task 4: Pantalla "Crea tu contraseña" en `curso.html`

**Files:**
- Modify: `docs/curso.html` (markup del `#gate` + CSS si hace falta + el IIFE del gate cerca de `boot()`)

**Interfaces:**
- Consumes: `POST /api/auth/setup-password` (Task 2). Helpers del IIFE existente: `gate`, `setToken`, `hideGate`, `showGate`, `boot`, `switchTab`. El gate ya tiene `.gate-panel` / `.gate-panel.active` y `.gate-error.hidden`.
- Produces: una pantalla nueva activable cuando la URL trae `#setpw=<token>`.

- [ ] **Step 1: Añadir el markup de la pantalla**

En `docs/curso.html`, localizar el cierre del form `id="gate-lead"` (la pantalla "Solicita tu acceso", termina en `</form>`). Justo DESPUÉS de ese `</form>` y ANTES del cierre de `.gate-card`, insertar:

```html
    <!-- Crear contraseña (activado por #setpw= en la URL) -->
    <form id="gate-setpw" class="gate-panel" autocomplete="on">
      <h2 class="gate-h">Crea tu contraseña</h2>
      <p class="gate-sub">Tu acceso ya está activo. Define una contraseña para entrar al curso.</p>
      <label class="gate-label" for="setpw-pass">Contraseña</label>
      <input class="gate-input" id="setpw-pass" type="password" autocomplete="new-password" minlength="8" required>
      <label class="gate-label" for="setpw-pass2">Confirmar contraseña</label>
      <input class="gate-input" id="setpw-pass2" type="password" autocomplete="new-password" minlength="8" required>
      <p class="gate-error hidden" id="setpw-error"></p>
      <button class="gate-submit" id="setpw-submit" type="submit">Crear contraseña →</button>
    </form>
```

- [ ] **Step 2: Añadir el manejo de `#setpw=` en el IIFE del gate**

En el `<script>` del gate (el IIFE que empieza con `var API_BASE = '';`), localizar la función `async function boot() {` y su primera línea:

```js
    var magic = (location.hash.match(/token=([^&]+)/) || [])[1];
```

Insertar, INMEDIATAMENTE antes de esa línea (como primeras sentencias dentro de `boot`):

```js
    var setpw = (location.hash.match(/setpw=([^&]+)/) || [])[1];
    if (setpw) { showSetPassword(setpw); return; }
```

- [ ] **Step 3: Añadir `showSetPassword` + el submit handler**

En el mismo IIFE, justo ANTES de la línea `boot();` que cierra el IIFE (la penúltima línea, antes de `})();`), insertar:

```js
  // Pantalla "Crea tu contraseña" (llegando desde el correo de activación).
  function showSetPassword(setpwToken) {
    gate.classList.remove('hidden'); gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gated');
    // Ocultar tabs y los otros paneles; mostrar solo el de crear contraseña.
    var tabs = document.querySelector('.gate-tabs'); if (tabs) tabs.style.display = 'none';
    document.getElementById('gate-login').classList.remove('active');
    document.getElementById('gate-lead').classList.remove('active');
    document.getElementById('gate-setpw').classList.add('active');

    document.getElementById('gate-setpw').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var err = document.getElementById('setpw-error'); err.classList.add('hidden');
      var p1 = document.getElementById('setpw-pass').value;
      var p2 = document.getElementById('setpw-pass2').value;
      if (p1.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; err.classList.remove('hidden'); return; }
      if (p1 !== p2) { err.textContent = 'Las contraseñas no coinciden.'; err.classList.remove('hidden'); return; }
      try {
        var r = await fetch(API_BASE + '/api/auth/setup-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: setpwToken, password: p1 }),
        });
        if (!r.ok) { err.textContent = 'El enlace expiró o ya se usó. Pide acceso de nuevo.'; err.classList.remove('hidden'); return; }
        var d = await r.json(); setToken(d.token);
        if (tabs) tabs.style.display = '';            // restaurar para próximas veces
        document.getElementById('gate-setpw').classList.remove('active');
        document.getElementById('gate-login').classList.add('active');
        history.replaceState(null, '', location.pathname);
        await boot();                                  // sesión + paid → desbloquea
      } catch (e) { err.textContent = 'Error de conexión. Inténtalo de nuevo.'; err.classList.remove('hidden'); }
    });
  }

```

- [ ] **Step 4: Verificar el flujo completo en el navegador**

Server de dev corriendo. Generar un token de setup para un usuario activado y abrir el link. Usar el usuario del Task 3 (o sembrar uno). Construir la URL `http://localhost:3000/curso.html#setpw=<RAW>` con un token válido (sembrar como en Task 2 Step 3, o tomar el del correo de Task 3).

Abrir esa URL en el navegador y confirmar:
- Aparece la pantalla "Crea tu contraseña" (sin las pestañas "Ya tengo acceso / Quiero acceso").
- Escribir dos contraseñas distintas → muestra "Las contraseñas no coinciden."
- Escribir la misma (≥8) y enviar → el gate desaparece y se ve el curso (módulo "¿Qué es un LLM?").
- Recargar `curso.html` (sin hash): sigue dentro (sesión guardada).
- Cerrar sesión ("Cerrar sesión") y entrar con correo + la contraseña recién creada → desbloquea.

(Verificación visual; no hay test automatizado. Si algo falla, corregir antes del commit.)

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "feat(curso): #setpw= screen to create password from activation email"
```

---

### Task 5: Feedback de envío en `admin.html`

**Files:**
- Modify: `docs/admin.html` (función `act`)

**Interfaces:**
- Consumes: `data.emailSent` del POST de grant (Task 3). Helpers existentes: `toast(text, kind)`.
- Produces: toast diferenciado para grant según se haya mandado el correo o no.

- [ ] **Step 1: Diferenciar el toast en `act` para grant**

En `docs/admin.html`, localizar dentro de `async function act(btn, email, action)` el bloque que arma el toast de éxito:

```js
        var labels = { grant:'Acceso activado', revoke:'Acceso retirado', make_admin:'Ahora es admin', remove_admin:'Admin retirado' };
        toast('✓ ' + (labels[action]||'Listo') + ' · ' + email, 'ok');
```

Reemplazarlo por:

```js
        if (action === 'grant') {
          if (data.emailSent) {
            toast('✓ Acceso activado · correo de contraseña enviado · ' + email, 'ok');
          } else {
            toast('⚠ Acceso activado, pero el correo NO se envió · contacta a ' + email, 'err');
          }
        } else {
          var labels = { revoke:'Acceso retirado', make_admin:'Ahora es admin', remove_admin:'Admin retirado' };
          toast('✓ ' + (labels[action]||'Listo') + ' · ' + email, 'ok');
        }
```

(Nota: `make_admin`/`remove_admin` ya no se disparan desde la UI porque quitamos esos botones, pero se dejan en `labels` por si se llaman por otra vía. `grant` y `revoke` son las activas.)

- [ ] **Step 2: Verificar en el panel**

Server de dev corriendo. Entrar a `admin.html` con tu usuario admin. Activar a un usuario pendiente (con un correo real que controles) y confirmar el toast "✓ Acceso activado · correo de contraseña enviado · …".

Para ver el caso de fallo: parar el server, vaciar `RESEND_API_KEY` en `.env.development.local`, reiniciar, activar otro usuario → debe salir el toast de advertencia "⚠ Acceso activado, pero el correo NO se envió …" y el usuario igual queda "Con acceso". Restaurar la `RESEND_API_KEY` y reiniciar al terminar.

- [ ] **Step 3: Commit**

```bash
git add docs/admin.html
git commit -m "feat(admin): toast distingue correo enviado vs fallo al activar"
```

---

## Self-Review (hecho)

**Cobertura del spec:**
- Pieza 1 (generalizar email.ts) → Task 1. ✓
- Pieza 2 (grant manda correo + emailSent) → Task 3. ✓
- Pieza 3 (endpoint setup-password) → Task 2. ✓
- Pieza 4 (pantalla #setpw= en curso.html) → Task 4. ✓
- Pieza 5 (feedback en admin.html) → Task 5. ✓
- Decisiones (7 días, reusar magic_link_tokens, fallo no revierte) → cubiertas en Tasks 2/3 + Global Constraints. ✓
- Verificación end-to-end del spec (7 pasos) → distribuida en los Steps de prueba de Tasks 2-5. ✓

**Placeholders:** ninguno; todo el código va completo.

**Consistencia de tipos/nombres:** `sendEmail`/`sendMagicLink`/`sendSetupPasswordLink` (Task 1) usados igual en Tasks 3. `newToken`/`hashToken`/`hashPassword`/`revokeUserSessions` existen en `api/_lib/auth.ts` (verificado). `setup-password` devuelve `{ token, user }` (Task 2) consumido por el frontend (Task 4). `emailSent` producido en Task 3, consumido en Tasks 4/5. URL `#setpw=` consistente entre Task 3 (genera) y Task 4 (lee).

**Orden de dependencias:** Task 1 → Task 3 (usa `sendSetupPasswordLink`); Task 2 → Task 4 (usa el endpoint); Task 3 → Task 5 (usa `emailSent`). Ejecutar 1, 2, 3, 4, 5 en orden.
