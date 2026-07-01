# Course Gate + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive login/lead gate to the new "IA Aplicada" course (`docs/curso.html`), backed by email+password auth (plus magic link), a single active session per user, and a paywall, reusing the existing backend.

**Architecture:** Mostly-additive backend on the existing Vercel Functions + Neon Postgres stack. One migration adds `users.password_hash`. New endpoints `POST /api/auth/login`, `POST /api/auth/set-password`, `POST /api/lead`. A `revokeUserSessions` helper enforces single-session from every login path. The frontend gate is a centered card modal in `curso.html` driven by `/api/me`.

**Tech Stack:** TypeScript Vercel Functions, Neon serverless (Postgres), `node:crypto` (scrypt) for password hashing, plain HTML/CSS/vanilla JS for the gate. No new dependencies.

## Global Constraints

- **No new dependencies** — password hashing uses Node's built-in `node:crypto` (`scryptSync`, `randomBytes`, `timingSafeEqual`). Copied verbatim from spec.
- **Production code path untouched** — the Neon driver path in `_lib/db.ts` must keep working; all new SQL goes through the existing `sql` tagged template.
- **Spanish** for all user-facing copy (gate text, error messages).
- **`API_BASE = ''`** (relative, same-origin via vercel.json rewrites) in `curso.html`.
- **Verification model:** no TS test framework. Each task verifies via `npm run typecheck` (`tsc --noEmit`) **plus** a concrete HTTP request against the local dev server (`npm run dev` on `http://localhost:3000`), with a `psql` read-back for DB writes. Local Postgres: `postgres://lps:lps@localhost:5432/lps`, psql at `C:\Program Files\PostgreSQL\16\bin\psql.exe`.
- **Single-session rule** lives in exactly one helper (`revokeUserSessions`), called by every login path.
- **Branch:** `feature/course-gate-auth` (already created off `main`, spec committed there).

---

### Task 1: Migration — `users.password_hash`

**Files:**
- Create: `migrations/0003_passwords.sql`

**Interfaces:**
- Produces: column `users.password_hash text` (nullable).

- [ ] **Step 1: Write the migration**

Create `migrations/0003_passwords.sql`:

```sql
-- 0003_passwords.sql — add password auth to users.
-- Nullable: null = no password set yet (magic-link only). Idempotent.
begin;
alter table users add column if not exists password_hash text;
commit;
```

- [ ] **Step 2: Apply it to local Postgres**

Run:
```
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -v ON_ERROR_STOP=1 -f migrations/0003_passwords.sql
```
(Set `$env:PGPASSWORD = "lps"` first.)
Expected: `BEGIN` / `ALTER TABLE` / `COMMIT`.

- [ ] **Step 3: Verify the column exists**

Run:
```
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -tAc "select column_name from information_schema.columns where table_name='users' and column_name='password_hash';"
```
Expected: `password_hash`

- [ ] **Step 4: Commit**

```bash
git add migrations/0003_passwords.sql
git commit -m "feat(db): add users.password_hash for password auth"
```

---

### Task 2: Auth helpers — password hashing + session revoke

**Files:**
- Modify: `api/_lib/auth.ts`

**Interfaces:**
- Consumes: existing `sql` (from `./db.js`), `randomBytes`, `timingSafeEqual` (already imported), `SessionUser`.
- Produces:
  - `hashPassword(password: string): string` — returns `"<saltHex>:<hashHex>"`.
  - `verifyPassword(password: string, stored: string): boolean`.
  - `revokeUserSessions(userId: string): Promise<void>`.

- [ ] **Step 1: Add the imports**

In `api/_lib/auth.ts`, change the crypto import line (currently `import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';`) to add `scryptSync`:

```typescript
import { randomBytes, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
```

- [ ] **Step 2: Add the three helpers**

Append to `api/_lib/auth.ts`:

```typescript
// ── Password hashing (scrypt; no external deps) ──────────────────────────────
// Stored format: "<saltHex>:<hashHex>". 16-byte salt, 64-byte derived key.
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

// ── Single active session ────────────────────────────────────────────────────
// Revoke every live session for a user. Called by EVERY login path (password
// + magic link) before issuing a new session, so a new login kicks the old
// device ("new login wins"). The old token's next request 401s.
export async function revokeUserSessions(userId: string): Promise<void> {
  await sql`
    update sessions set revoked_at = now()
    where user_id = ${userId} and revoked_at is null
  `;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/auth.ts
git commit -m "feat(auth): scrypt password hashing + revokeUserSessions helper"
```

---

### Task 3: `POST /api/auth/login`

**Files:**
- Create: `api/auth/login.ts`

**Interfaces:**
- Consumes: `sql`, `cors`, `json`, `newToken`, `hashToken`, `verifyPassword`, `revokeUserSessions`, `isValidEmail`.
- Produces: `POST /api/auth/login` → `{ token, user: { id, email, nombre, is_admin } }` on 200; `{ error: 'invalid_credentials' }` on 401.

- [ ] **Step 1: Write the handler**

Create `api/auth/login.ts` (mirrors `verify.ts`'s session-creation pattern):

```typescript
// POST /api/auth/login — email + password login.
// Body: { email, password }. Verifies the password, enforces single active
// session (revokes prior ones), issues a 30-day session bearer token.
// Generic 401 on any failure (no email enumeration).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { newToken, hashToken, verifyPassword, revokeUserSessions, isValidEmail } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isValidEmail(email) || !password) return json(res, 401, { error: 'invalid_credentials' });

  try {
    const rows = await sql`
      select id, email, nombre, is_admin, password_hash
      from users where email = ${email} limit 1
    `;
    const user = rows[0] as
      | { id: string; email: string; nombre: string | null; is_admin: boolean; password_hash: string | null }
      | undefined;

    // No user, or no password set yet → generic failure (use magic link instead).
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: 'invalid_credentials' });
    }

    // Single active session: kill prior sessions, then issue a new one.
    await revokeUserSessions(user.id);
    const sessionToken = newToken();
    const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 500);
    await sql`
      insert into sessions (user_id, token_hash, expires_at, user_agent)
      values (${user.id}, ${hashToken(sessionToken)}, now() + interval '30 days', ${ua})
    `;

    return json(res, 200, {
      token: sessionToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, is_admin: user.is_admin },
    });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Seed a known password directly in DB to test against**

Start the dev server in another terminal: `npm run dev`. Then set a known password for the seeded admin user using a tiny node one-liner that uses the same scrypt format (run from repo root):

```
$env:PGPASSWORD="lps"
node --input-type=module -e "import {scryptSync,randomBytes} from 'node:crypto'; const s=randomBytes(16); const h=scryptSync('test1234', s, 64); console.log(s.toString('hex')+':'+h.toString('hex'));"
```
Copy the printed `salt:hash`, then:
```
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -c "update users set password_hash='<PASTE_SALT:HASH>' where email='dhagenballesteros@outlook.com';"
```

- [ ] **Step 4: Verify login succeeds with right password**

Run:
```
Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"test1234"}' -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: `200` with `{"token":"...","user":{...,"is_admin":true}}`.

- [ ] **Step 5: Verify wrong password fails generically**

Run:
```
try { Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"wrong"}' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `401`.

- [ ] **Step 6: Commit**

```bash
git add api/auth/login.ts
git commit -m "feat(auth): POST /api/auth/login (password + single session)"
```

---

### Task 4: Enforce single-session on the magic-link path

**Files:**
- Modify: `api/auth/verify.ts`

**Interfaces:**
- Consumes: new `revokeUserSessions` from `../_lib/auth.js`.

- [ ] **Step 1: Import the helper**

In `api/auth/verify.ts`, change the auth import (currently `import { newToken, hashToken } from '../_lib/auth.js';`) to:

```typescript
import { newToken, hashToken, revokeUserSessions } from '../_lib/auth.js';
```

- [ ] **Step 2: Revoke prior sessions before creating the new one**

In `api/auth/verify.ts`, find the block that sets `email_verified` and creates the session. Insert the revoke call immediately before the `insert into sessions` statement:

```typescript
    // First successful verification confirms the email.
    await sql`update users set email_verified = true where id = ${userId}`;

    // Single active session: a magic-link login also kicks prior sessions.
    await revokeUserSessions(userId);

    // Create the session.
    const sessionToken = newToken();
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Verify single-session end-to-end (two logins, old token dies)**

With the dev server running and the admin password seeded (Task 3 Step 3):
```
# Login A
$a = (Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"test1234"}' -UseBasicParsing | ConvertFrom-Json).token
# /api/me with token A works
(Invoke-WebRequest "http://localhost:3000/api/me" -Headers @{Authorization="Bearer $a"} -UseBasicParsing).StatusCode
# Login B (new device)
$b = (Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"test1234"}' -UseBasicParsing | ConvertFrom-Json).token
# token A must now be dead
try { Invoke-WebRequest "http://localhost:3000/api/me" -Headers @{Authorization="Bearer $a"} -UseBasicParsing } catch { "A now: " + $_.Exception.Response.StatusCode.value__ }
# token B works
(Invoke-WebRequest "http://localhost:3000/api/me" -Headers @{Authorization="Bearer $b"} -UseBasicParsing).StatusCode
```
Expected: token A → `200`, then after login B: token A → `401`, token B → `200`.

- [ ] **Step 5: Commit**

```bash
git add api/auth/verify.ts
git commit -m "feat(auth): enforce single session on magic-link login"
```

---

### Task 5: `POST /api/auth/set-password`

**Files:**
- Create: `api/auth/set-password.ts`

**Interfaces:**
- Consumes: `sql`, `cors`, `json`, `getSessionUser`, `hashPassword`.
- Produces: `POST /api/auth/set-password` (Bearer auth) → `{ ok: true }` on 200; `{ error: 'unauthorized' }` 401; `{ error: 'weak_password' }` 400.

- [ ] **Step 1: Write the handler**

Create `api/auth/set-password.ts`:

```typescript
// POST /api/auth/set-password — set/replace the current user's password.
// Auth: Bearer session token. Body: { password } (min 8 chars).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { cors, json } from '../_lib/http.js';
import { getSessionUser, hashPassword } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8) return json(res, 400, { error: 'weak_password' });

  try {
    await sql`update users set password_hash = ${hashPassword(password)} where id = ${user.id}`;
    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, 500, { error: 'server_error' });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Verify set-password then login with the new password**

With dev server running, get a session (login as admin from Task 3), then:
```
$t = (Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"test1234"}' -UseBasicParsing | ConvertFrom-Json).token
# set a new password
(Invoke-WebRequest "http://localhost:3000/api/auth/set-password" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $t"} -Body '{"password":"newpass99"}' -UseBasicParsing).StatusCode
# login with the NEW password
(Invoke-WebRequest "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"dhagenballesteros@outlook.com","password":"newpass99"}' -UseBasicParsing).StatusCode
# weak password rejected
try { Invoke-WebRequest "http://localhost:3000/api/auth/set-password" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $t"} -Body '{"password":"short"}' -UseBasicParsing } catch { "weak: " + $_.Exception.Response.StatusCode.value__ }
```
Expected: set-password → `200`, login with new password → `200`, weak → `400`.

- [ ] **Step 4: Commit**

```bash
git add api/auth/set-password.ts
git commit -m "feat(auth): POST /api/auth/set-password"
```

---

### Task 6: `POST /api/lead`

**Files:**
- Create: `api/lead.ts`

**Interfaces:**
- Consumes: `sql`, `cors`, `json`, `isValidEmail`.
- Produces: `POST /api/lead` → `{ ok: true }`. Upserts profile into `users`, never emits a token or email.

- [ ] **Step 1: Write the handler**

Create `api/lead.ts` (the upsert mirrors `auth/request.ts` but does NOT issue a token or send mail):

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Verify lead capture writes profile, grants no access**

With dev server running:
```
$email = "lead-test@example.com"
(Invoke-WebRequest "http://localhost:3000/api/lead" -Method POST -ContentType "application/json" -Body "{`"email`":`"$email`",`"nombre`":`"Prospecto`",`"empresa`":`"Acme`"}" -UseBasicParsing).StatusCode
$env:PGPASSWORD="lps"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -tAc "select email||'|'||coalesce(empresa,'-')||'|paid='||coalesce((select paid::text from entitlements e where e.user_id=u.id),'none') from users u where email='$email';"
```
Expected: `200`, then DB row `lead-test@example.com|Acme|paid=none` (profile saved, no entitlement → no access).

- [ ] **Step 4: Confirm no session/token was created for the lead**

Run:
```
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -tAc "select count(*) from magic_link_tokens t join users u on u.id=t.user_id where u.email='lead-test@example.com';"
```
Expected: `0` (lead capture issues no magic link).

- [ ] **Step 5: Commit**

```bash
git add api/lead.ts
git commit -m "feat: POST /api/lead — prospect capture without granting access"
```

---

### Task 7: Gate modal markup + styles in `curso.html`

**Files:**
- Modify: `docs/curso.html`

**Interfaces:**
- Produces: a `#gate` overlay element (hidden by default via a class) with two tab panels (`#gate-login`, `#gate-lead`), an error slot per panel, and a `body.gated` scroll-lock class. Wired by Task 8's JS.

- [ ] **Step 1: Add the gate markup**

In `docs/curso.html`, immediately after the opening `<body ...>` tag, insert the gate overlay. (Find `<body` — add right after it.)

```html
<!-- ─── GATE DE ACCESO ─── -->
<div id="gate" class="gate hidden" aria-hidden="true">
  <div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-title">
    <div class="gate-brand">⚡ IA Aplicada</div>
    <div class="gate-tabs">
      <button class="gate-tab active" id="tab-login" type="button">Ya tengo acceso</button>
      <button class="gate-tab" id="tab-lead" type="button">Quiero acceso</button>
    </div>

    <!-- Login -->
    <form id="gate-login" class="gate-panel active" autocomplete="on">
      <h2 id="gate-title" class="gate-h">Inicia sesión</h2>
      <label class="gate-label" for="login-email">Correo</label>
      <input class="gate-input" id="login-email" type="email" autocomplete="email" required>
      <label class="gate-label" for="login-pass">Contraseña</label>
      <input class="gate-input" id="login-pass" type="password" autocomplete="current-password" required>
      <p class="gate-error hidden" id="login-error"></p>
      <button class="gate-submit" id="login-submit" type="submit">Entrar →</button>
      <button class="gate-link" id="login-magic" type="button">Entrar con enlace por correo</button>
    </form>

    <!-- Lead -->
    <form id="gate-lead" class="gate-panel" autocomplete="on">
      <h2 class="gate-h">Solicita tu acceso</h2>
      <p class="gate-sub">Déjanos tus datos y te contactamos por WhatsApp para activarte.</p>
      <label class="gate-label" for="lead-nombre">Nombre</label>
      <input class="gate-input" id="lead-nombre" type="text" autocomplete="name">
      <label class="gate-label" for="lead-email">Correo</label>
      <input class="gate-input" id="lead-email" type="email" autocomplete="email" required>
      <label class="gate-label" for="lead-empresa">Empresa</label>
      <input class="gate-input" id="lead-empresa" type="text" autocomplete="organization">
      <p class="gate-error hidden" id="lead-error"></p>
      <button class="gate-submit" id="lead-submit" type="submit">Continuar por WhatsApp →</button>
    </form>
  </div>
</div>
```

- [ ] **Step 2: Add the gate styles**

In `docs/curso.html`, inside the existing `<style>` block (append near the end of it, before `</style>`). Uses the page's existing CSS vars (`--bg`, `--surface`, `--surface2`, `--text`, `--muted`, `--border`, `--amber`):

```css
/* ─── GATE ─── */
.gate { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  background: rgba(10,10,10,0.82); backdrop-filter: blur(6px); padding: 20px; }
.gate.hidden { display: none; }
body.gated { overflow: hidden; }
.gate-card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 28px 26px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.gate-brand { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; color: var(--amber); margin-bottom: 18px; }
.gate-tabs { display: flex; gap: 6px; background: var(--surface2); border-radius: 10px; padding: 4px; margin-bottom: 20px; }
.gate-tab { flex: 1; padding: 9px; border: 0; border-radius: 7px; background: transparent; color: var(--muted);
  font-size: 13px; font-weight: 600; cursor: pointer; }
.gate-tab.active { background: var(--bg); color: var(--text); }
.gate-panel { display: none; flex-direction: column; }
.gate-panel.active { display: flex; }
.gate-h { font-family: 'Space Grotesk', sans-serif; font-size: 20px; margin: 0 0 4px; color: var(--text); }
.gate-sub { font-size: 13px; color: var(--muted); margin: 0 0 14px; }
.gate-label { font-size: 12px; color: var(--muted); margin: 10px 0 4px; }
.gate-input { width: 100%; padding: 11px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 14px; }
.gate-input:focus { outline: none; border-color: var(--amber); }
.gate-error { color: #f87171; font-size: 13px; margin: 10px 0 0; }
.gate-submit { margin-top: 16px; padding: 12px; border: 0; border-radius: 8px; background: var(--amber);
  color: #1a1a1a; font-weight: 700; font-size: 14px; cursor: pointer; }
.gate-link { margin-top: 10px; padding: 6px; border: 0; background: transparent; color: var(--muted);
  font-size: 13px; text-decoration: underline; cursor: pointer; }
@media (max-width: 480px) { .gate-card { max-width: none; border-radius: 14px; padding: 22px 18px; } }
```

- [ ] **Step 3: Verify markup renders responsively**

Start `npm run dev`. In a browser, open `http://localhost:3000/curso.html`. Temporarily force the gate visible by running in the devtools console: `document.getElementById('gate').classList.remove('hidden'); document.body.classList.add('gated');`
Expected: centered card ≤420px on desktop, near-full-width with padding when the window is narrowed to phone size; background dimmed/blurred; body scroll locked. Tabs and inputs visible.

- [ ] **Step 4: Commit**

```bash
git add docs/curso.html
git commit -m "feat(curso): responsive access-gate modal markup + styles"
```

---

### Task 8: Gate logic — auth state machine in `curso.html`

**Files:**
- Modify: `docs/curso.html`

**Interfaces:**
- Consumes: `#gate`, `#gate-login`, `#gate-lead`, tab buttons, inputs, error slots from Task 7; endpoints `/api/me`, `/api/auth/login`, `/api/auth/request`, `/api/auth/logout`; `localStorage`.
- Produces: gate shown/hidden based on session+paid; `lps-session` token in localStorage.

- [ ] **Step 1: Add the gate script**

In `docs/curso.html`, add a `<script>` block just before `</body>` (after any existing course scripts so its globals are last). WhatsApp number copied from the old course flow.

```html
<script>
(function () {
  var API_BASE = ''; // same-origin via vercel.json rewrites
  var SESSION_KEY = 'lps-session';
  var WHATSAPP = 'https://wa.me/526623478040?text=' + encodeURIComponent('Hola, quiero acceso al curso IA Aplicada');

  var gate = document.getElementById('gate');
  function token() { return localStorage.getItem(SESSION_KEY) || ''; }
  function setToken(t) { localStorage.setItem(SESSION_KEY, t); }
  function clearToken() { localStorage.removeItem(SESSION_KEY); }

  function showGate(msg) {
    gate.classList.remove('hidden'); gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gated');
    if (msg) { var e = document.getElementById('login-error'); e.textContent = msg; e.classList.remove('hidden'); }
  }
  function hideGate() {
    gate.classList.add('hidden'); gate.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gated');
  }

  // Tab switching
  document.getElementById('tab-login').onclick = function () { switchTab('login'); };
  document.getElementById('tab-lead').onclick = function () { switchTab('lead'); };
  function switchTab(which) {
    document.getElementById('tab-login').classList.toggle('active', which === 'login');
    document.getElementById('tab-lead').classList.toggle('active', which === 'lead');
    document.getElementById('gate-login').classList.toggle('active', which === 'login');
    document.getElementById('gate-lead').classList.toggle('active', which === 'lead');
  }

  // Boot: decide gate vs. access from /api/me
  async function boot() {
    var magic = (location.hash.match(/token=([^&]+)/) || [])[1];
    if (magic) {
      try {
        var vr = await fetch(API_BASE + '/api/auth/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: magic }),
        });
        if (vr.ok) { var vd = await vr.json(); setToken(vd.token); history.replaceState(null, '', location.pathname); }
      } catch (e) {}
    }
    if (!token()) { showGate(); return; }
    try {
      var r = await fetch(API_BASE + '/api/me', { headers: { Authorization: 'Bearer ' + token() } });
      if (r.status === 401) { clearToken(); showGate(); return; }
      var d = await r.json();
      if (d.paid) { hideGate(); }
      else { showGate('Tu acceso aún no está activo. Escríbenos por WhatsApp para activarlo.'); }
    } catch (e) { showGate(); }
  }

  // Login submit
  document.getElementById('gate-login').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var err = document.getElementById('login-error'); err.classList.add('hidden');
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-pass').value;
    try {
      var r = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });
      if (!r.ok) { err.textContent = 'Correo o contraseña incorrectos.'; err.classList.remove('hidden'); return; }
      var d = await r.json(); setToken(d.token);
      await boot();
    } catch (e) { err.textContent = 'Error de conexión. Inténtalo de nuevo.'; err.classList.remove('hidden'); }
  });

  // Magic link request
  document.getElementById('login-magic').onclick = async function () {
    var err = document.getElementById('login-error'); err.classList.add('hidden');
    var email = document.getElementById('login-email').value.trim();
    if (!email) { err.textContent = 'Escribe tu correo y te enviamos un enlace.'; err.classList.remove('hidden'); return; }
    try {
      await fetch(API_BASE + '/api/auth/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      });
      err.style.color = 'var(--muted)';
      err.textContent = 'Si tu correo tiene acceso, te enviamos un enlace. Revisa tu bandeja.';
      err.classList.remove('hidden');
    } catch (e) { err.textContent = 'Error de conexión.'; err.classList.remove('hidden'); }
  };

  // Lead submit → save + WhatsApp
  document.getElementById('gate-lead').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var err = document.getElementById('lead-error'); err.classList.add('hidden');
    var payload = {
      email: document.getElementById('lead-email').value.trim(),
      nombre: document.getElementById('lead-nombre').value.trim(),
      empresa: document.getElementById('lead-empresa').value.trim(),
    };
    try {
      await fetch(API_BASE + '/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {}
    window.open(WHATSAPP, '_blank', 'noopener');
  });

  // Expose logout for the account menu (Task 9 wires the button)
  window.lpsLogout = async function () {
    try { await fetch(API_BASE + '/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token() } }); } catch (e) {}
    clearToken(); showGate();
  };

  boot();
})();
</script>
```

- [ ] **Step 2: Typecheck (no TS here, but confirm the page still loads)**

Start `npm run dev` (if not running). Open `http://localhost:3000/curso.html` in a browser with localStorage empty (or run `localStorage.removeItem('lps-session')` in console and reload).
Expected: the gate appears automatically (no token → `showGate()`), login tab active.

- [ ] **Step 3: Verify the full login → unlock flow in the browser**

Ensure the admin user has a known password and a paid entitlement:
```
$env:PGPASSWORD="lps"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U lps -h localhost -p 5432 -d lps -c "insert into entitlements (user_id, paid, paid_at) select id, true, now() from users where email='dhagenballesteros@outlook.com' on conflict (user_id) do update set paid=true;"
```
In the browser gate, log in with `dhagenballesteros@outlook.com` / the seeded password.
Expected: gate disappears, course is accessible. Reload the page → still in (session persisted, no re-login).

- [ ] **Step 4: Verify unpaid user sees the WhatsApp state**

Create an unpaid user with a password (reuse the node scrypt one-liner from Task 3), then log in as them.
Expected: gate stays, showing "Tu acceso aún no está activo… WhatsApp" message.

- [ ] **Step 5: Verify lead tab opens WhatsApp + saves**

Click "Quiero acceso", fill email + nombre, submit.
Expected: a WhatsApp tab opens; `psql` shows the lead row in `users` (reuse Task 6 Step 3 query with the entered email).

- [ ] **Step 6: Commit**

```bash
git add docs/curso.html
git commit -m "feat(curso): gate auth state machine (login, magic link, lead, logout)"
```

---

### Task 9: Logout control + optional set-password prompt

**Files:**
- Modify: `docs/curso.html`

**Interfaces:**
- Consumes: `window.lpsLogout` (Task 8), `/api/auth/set-password`.
- Produces: a visible "Cerrar sesión" control; a one-time prompt to set a password after magic-link entry.

- [ ] **Step 1: Add a logout button**

In `docs/curso.html`, find the course's top nav/header area (search for the existing header/nav container — e.g. an element with the course title or theme toggle). Add a logout button next to it:

```html
<button id="logout-btn" type="button" onclick="window.lpsLogout()"
  style="background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;">
  Cerrar sesión
</button>
```

- [ ] **Step 2: Add the set-password prompt after magic-link entry**

In the Task 8 `boot()` function, after a successful magic-link verify (inside `if (vr.ok)` after `setToken(vd.token)`), set a flag, and after the gate hides for a paid user, offer to set a password. Add this helper inside the IIFE and call it from `boot()` right after `hideGate()`:

```javascript
  function maybeOfferPassword() {
    if (localStorage.getItem('lps-pw-offered')) return;
    localStorage.setItem('lps-pw-offered', '1');
    var pw = window.prompt('Para entrar más rápido la próxima vez, crea una contraseña (mínimo 8 caracteres). Déjalo vacío para omitir.');
    if (!pw || pw.length < 8) return;
    fetch('' + '/api/auth/set-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('lps-session') || '') },
      body: JSON.stringify({ password: pw }),
    });
  }
```

Then in `boot()`, change the paid branch from `if (d.paid) { hideGate(); }` to:
```javascript
      if (d.paid) { hideGate(); maybeOfferPassword(); }
```

- [ ] **Step 3: Verify logout returns to the gate**

With the dev server running and logged in (paid user), click "Cerrar sesión".
Expected: the gate reappears; reloading the page keeps the gate (token cleared).

- [ ] **Step 4: Verify the set-password prompt only fires once after magic-link**

Clear localStorage, enter via a magic link (`/curso.html#token=<valid>`), and after unlock confirm the prompt appears; reload → prompt does not reappear (`lps-pw-offered` set).
Expected: prompt once, then never again on that browser.

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "feat(curso): logout control + one-time set-password prompt"
```

---

## Self-Review

**1. Spec coverage:**
- Email+password login → Task 3 ✓
- Magic link (bootstrap + reset) → existing endpoints, reused in Task 8 boot() + login-magic ✓
- Set password once inside → Task 5 (endpoint) + Task 9 (prompt) ✓
- Single active session, "new login wins" → Task 2 (helper) + Task 3 (password path) + Task 4 (magic-link path) ✓
- Persistent 30-day session → Task 3/4 session insert (`interval '30 days'`) ✓
- Prospect lead capture without access → Task 6 (`/api/lead`) + Task 8 lead submit ✓
- WhatsApp handoff → Task 8 lead submit ✓
- Everything gated; paid vs unpaid states → Task 8 boot() state machine ✓
- Responsive centered card modal → Task 7 ✓
- API_BASE relative → Task 8 ✓
- Migration `password_hash` → Task 1 ✓

**2. Placeholder scan:** No TBD/TODO; every code step has full code; every test step has a runnable command + expected output. ✓

**3. Type consistency:** `hashPassword`/`verifyPassword`/`revokeUserSessions` (Task 2) are consumed with matching signatures in Tasks 3/4/5. Session token + `{ token, user }` shape matches `verify.ts`'s existing contract. `localStorage` key `lps-session` consistent across Tasks 8/9. ✓

**4. Scope:** Single feature (gate + auth), one branch, no decomposition needed. ✓
