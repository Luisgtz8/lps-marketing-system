# Spec: link de "crear contraseña" al activar un usuario

**Fecha:** 2026-06-30
**Estado:** aprobado para implementación

## Problema

Hoy, cuando el admin activa a un usuario en `docs/admin.html` (botón **Activar** →
`POST /api/admin/access` con `action: 'grant'`), el backend solo pone
`entitlements.paid = true`. **No notifica al usuario de ninguna forma.** El usuario
tiene que volver al curso por su cuenta y adivinar que ya tiene acceso, y además no
tiene contraseña, así que solo podría entrar pidiendo un magic link.

## Objetivo

Al activar a un usuario, mandarle automáticamente un correo (vía Resend) con un link
de un solo uso que lo lleve a una pantalla **"Crea tu contraseña"**. Tras definirla,
queda con sesión iniciada dentro del curso y, en adelante, entra con **correo +
contraseña** (el flujo de login que ya existe).

Resend ya está configurado y verificado para el dominio
`lightningprosolutions.com` (remitente `onboarding@lightningprosolutions.com`).

## Flujo completo

1. Admin pulsa **Activar** en `admin.html` → `POST /api/admin/access { email, action: 'grant' }`.
2. El handler de `grant`:
   a. Pone `entitlements.paid = true` (comportamiento actual, sin cambios).
   b. Genera un token de un solo uso para ese `user_id` y guarda su **hash** en
      `magic_link_tokens` con `expires_at = now() + interval '7 days'`.
   c. Manda un correo con un link a `APP_BASE_URL/curso.html#setpw=<token>`.
3. El usuario abre el link. `curso.html` detecta `#setpw=<token>` en el hash y, en vez
   del login normal, muestra la pantalla **"Crea tu contraseña"** (correo prellenado/oculto,
   un campo de contraseña + confirmación).
4. El usuario define su contraseña → `POST /api/auth/setup-password { token, password }`.
5. El endpoint, en una sola operación atómica: valida y consume el token, setea
   `users.password_hash`, marca `email_verified = true`, revoca sesiones previas, crea
   una sesión nueva de 30 días y la devuelve.
6. `curso.html` guarda el token de sesión, limpia el `#setpw=` de la URL y arranca el
   curso ya desbloqueado (reusa `boot()`).

## Piezas a construir / modificar

### 1. `api/_lib/email.ts` — generalizar el envío
- Extraer un helper `sendEmail(to, subject, html)` que haga el POST a Resend (la lógica
  que hoy está embebida en `sendMagicLink`).
- `sendMagicLink` pasa a llamar a `sendEmail` (sin cambio de comportamiento).
- Nuevo `sendSetupPasswordLink(to, link)`: plantilla en español, asunto
  "Tu acceso a IA Aplicada está activo — crea tu contraseña", botón "Crear contraseña →".
  Reusa el estilo HTML inline existente (mismo look que el magic link).

### 2. `api/admin/access.ts` — `grant` manda el correo
- En `case 'grant':`, después del upsert de `entitlements`:
  - Generar token con `newToken()`, guardar `hashToken(token)` en `magic_link_tokens`
    con expiración de 7 días (invalidar antes los tokens vivos del usuario, igual que
    hace `auth/request.ts`).
  - Construir `link = ${APP_BASE_URL}/curso.html#setpw=${token}`.
  - Llamar `sendSetupPasswordLink(email, link)` **dentro de try/catch**.
- **Si el correo falla:** NO se revierte el acceso (el usuario queda activado). El
  endpoint responde `200` con un campo extra `{ ok: true, email, action, emailSent: false }`
  para que el panel avise. En éxito, `emailSent: true`.
- Necesita el `email` y el `user.id` que ya están disponibles en el handler.

### 3. `api/auth/setup-password.ts` — endpoint nuevo
- `POST { token, password }`. Sin auth previa (el token ES la prueba de identidad).
- Validación: `password.length >= 8`, si no → `400 weak_password`.
- Consumir el token atómicamente (mismo patrón que `verify.ts`: `update ... set
  consumed_at = now() where token_hash = ... and consumed_at is null and expires_at > now()
  returning user_id`). Si no consume → `401 invalid_or_expired`.
- Con el `user_id`: `update users set password_hash = hashPassword(password),
  email_verified = true`.
- `revokeUserSessions(user_id)`, crear sesión nueva de 30 días, devolver
  `{ token: sessionToken, user }` (idéntico a `verify.ts`).
- CORS + método como los demás handlers.

### 4. `docs/curso.html` — pantalla "Crea tu contraseña"
- **Markup:** una pantalla nueva dentro de `#gate` (un `gate-panel` o un bloque aparte)
  con: título "Crea tu contraseña", un campo password, un campo confirmar, un botón
  "Crear contraseña →", y un slot de error (`.gate-error.hidden`, igual que los otros).
  Las pestañas (`gate-tabs`) se ocultan en este modo: no aplica "Ya tengo / Quiero acceso".
- **JS (en el IIFE del gate):** en `boot()`, antes de la lógica de `#token=`, detectar
  `var setpw = (location.hash.match(/setpw=([^&]+)/) || [])[1];`. Si existe:
  - Mostrar el gate con la pantalla de "crear contraseña" (ocultar tabs y los otros paneles).
  - Al enviar: validar que las dos contraseñas coincidan y tengan ≥8 chars (mensaje local
    si no), luego `POST /api/auth/setup-password { token: setpw, password }`.
  - Si `ok`: `setToken(d.token)`, `history.replaceState` para limpiar el hash, y `boot()`
    de nuevo (que verá la sesión + `paid:true` y desbloqueará el curso).
  - Si error: mostrar "El enlace expiró o ya se usó. Pide acceso de nuevo." en el slot.

### 5. `docs/admin.html` — feedback de envío
- En `act()`, cuando `action === 'grant'`, leer `data.emailSent`:
  - `true` → toast "✓ Acceso activado · correo enviado · {email}".
  - `false` → toast de advertencia "Acceso activado, pero el correo NO se envió · {email}"
    (clase `err` o un estilo de aviso) para que el admin lo contacte manualmente.

## Decisiones (cerradas)

- **Expiración del token: 7 días.** Es onboarding, no un login rápido.
- **Reusar `magic_link_tokens`**, sin tabla ni migración nueva. Un token de setup y un
  magic token son intercambiables (ambos prueban "este correo es tuyo"); lo que cambia es
  a qué pantalla lleva, y eso lo decide el prefijo en la URL (`#setpw=` vs `#token=`).
- **Fallo de correo no revierte el acceso.** El acceso es el efecto importante; el correo
  es notificación. Si falla, el panel avisa y el admin reenvía/contacta.
- **El usuario siempre se auto-registra primero** (lead form o magic link), así que `grant`
  siempre actúa sobre un `user` que ya existe. No se construye "crear-si-no-existe".

## Fuera de alcance (YAGNI)

- Reenviar el correo de activación desde el panel (si falla, por ahora el admin contacta
  por WhatsApp). Se puede añadir después.
- Cambiar contraseña desde el panel del curso para usuarios ya activos (el prompt
  `maybeOfferPassword` existente ya cubre el caso de "ponerse contraseña").
- Verificación de fuerza de contraseña más allá de ≥8 caracteres.

## Verificación

Probar localmente (Resend ya envía en dev) el flujo completo end-to-end:
1. Crear un lead nuevo (usuario sin contraseña, sin acceso).
2. Activarlo desde `admin.html` → confirmar toast "correo enviado" y que llega el correo.
3. Abrir el link `#setpw=` → ver la pantalla "Crea tu contraseña".
4. Definir contraseña → confirmar que entra al curso desbloqueado.
5. Cerrar sesión y volver a entrar con **correo + contraseña** → desbloquea.
6. Reusar el mismo link `#setpw=` → debe fallar ("expiró o ya se usó").
7. Caso de fallo de correo: forzar (p. ej. quitar la key) y confirmar que el acceso se
   activa igual y el panel muestra la advertencia.
