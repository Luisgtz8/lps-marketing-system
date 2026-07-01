# Diseño — Gate de acceso + auth para el curso "IA Aplicada"

**Fecha:** 2026-06-27
**Estado:** Aprobado (brainstorming) — pendiente plan de implementación

## Contexto

El curso reconstruido `docs/curso.html` ("IA Aplicada", en `main`) **no tiene
ningún gate**: el gate del curso anterior se eliminó en la reconstrucción. Hoy
cualquiera ve el curso completo.

Se necesita volver a poner un muro de acceso, pero mejor que el anterior:

1. **No re-registrar en cada visita.** El curso viejo mandaba un enlace mágico
   cada vez. Los usuarios deben iniciar sesión **una vez por computadora** y
   permanecer dentro hasta cerrar sesión manualmente.
2. **Dos audiencias.** Quien **no** es usuario deja sus datos de contacto
   (lead). Quien **sí** es usuario inicia sesión y obtiene acceso completo.
3. **Modal responsivo.** El gate del curso viejo ocupaba toda la página y se
   veía descuidado; el nuevo es una tarjeta centrada y responsiva.

El backend (`api/`, Vercel Functions + Neon Postgres) ya tiene casi toda la
maquinaria: tabla `sessions` con `revoked_at`, `entitlements.paid`, flujo de
enlace mágico (`/api/auth/request` + `/api/auth/verify`), `/api/me`,
`/api/admin/access`. Este diseño es mayormente **aditivo**.

## Modelo de auth

Tres formas de entrar, todas terminando en **una sesión única, persistente y
activa**:

- **Email + contraseña** (principal, usuarios recurrentes):
  `POST /api/auth/login` → verifica contraseña → emite sesión.
- **Enlace mágico** (bootstrap + reset): `/api/auth/request` + `/api/auth/verify`
  existentes, sin cambios funcionales. Es como un usuario entra la **primera
  vez** y como recupera una contraseña olvidada.
- **Establecer contraseña** (ya dentro): `POST /api/auth/set-password` (requiere
  sesión válida) → guarda el hash. Después de eso, email+contraseña funciona.

### Sesión única (anti-compartir, "gana el último login")

En **cualquier** login exitoso (contraseña o enlace mágico), se revocan todas
las sesiones previas del usuario **antes** de crear la nueva:

```sql
update sessions set revoked_at = now()
where user_id = ${userId} and revoked_at is null
```

El siguiente request del dispositivo viejo recibe 401 → el frontend muestra
"tu sesión se cerró porque iniciaste sesión en otro dispositivo." El usuario
nunca queda bloqueado de su propia cuenta. La tabla `sessions` ya soporta esto
(`revoked_at` existe) — sin cambio de esquema para el mecanismo.

### Persistencia

TTL de sesión largo (30 días, ya es el default) → "inicia sesión una vez por
computadora hasta cerrar sesión". El logout usa `/api/auth/logout` existente.

## Cambios de backend

### Esquema — migración nueva `migrations/0003_passwords.sql`

- Agregar `users.password_hash text` (nullable — null = sin contraseña aún,
  solo enlace mágico).
- Único cambio de esquema. La sesión única reutiliza `revoked_at`.

```sql
begin;
alter table users add column if not exists password_hash text;
commit;
```

### Hashing de contraseña

- **`scrypt`** del módulo nativo `node:crypto` (ya usado en `_lib/auth.ts` para
  hashear tokens) — **sin dependencia nueva**. Formato almacenado `salt:hash`
  (hex). Verificación con `timingSafeEqual` (ya importado ahí).
- Razón: cero deps nuevas, corre bien en Vercel Functions. bcrypt/argon2
  implicarían una dep nativa — se evita.

Helpers nuevos en `api/_lib/auth.ts`:
- `hashPassword(password: string): string` → `scryptSync` con salt aleatorio,
  retorna `salt:hash`.
- `verifyPassword(password: string, stored: string): boolean` → re-deriva y
  compara con `timingSafeEqual`.
- `revokeUserSessions(userId: string): Promise<void>` → el `update ... revoked_at`
  de arriba. **Punto único** donde vive la regla de sesión única.

### Endpoints

**Nuevo `POST /api/auth/login`** — `{ email, password }`:
1. Buscar usuario por email; si no existe o `password_hash` es null → 401
   genérico (`{ error: 'invalid_credentials' }`, sin revelar si el email existe).
2. `verifyPassword` → si falla → 401 genérico.
3. `revokeUserSessions(user.id)`.
4. Crear sesión (mismo patrón que `verify.ts`: token aleatorio, hash, 30 días).
5. Retornar `{ token, user: { id, email, nombre, is_admin } }`.

**Nuevo `POST /api/auth/set-password`** — auth con Bearer:
1. `getSessionUser(req)`; si null → 401.
2. Validar `password` (mínimo razonable, p. ej. ≥ 8 caracteres) → 400 si no.
3. `update users set password_hash = ${hashPassword(password)} where id = ${user.id}`.
4. Retornar `{ ok: true }`.

**Cambiado `POST /api/auth/verify`** (enlace mágico): agregar
`revokeUserSessions(userId)` justo antes de crear la sesión, para que el enlace
mágico también respete la sesión única.

**Nuevo `POST /api/lead`** — captura de prospecto SIN emitir acceso:
`{ email, nombre?, empresa?, giro?, departamento?, whatsapp? }`.
1. Upsert en `users` con el perfil (mismo upsert que `request.ts`, sin
   clobber de datos previos), dejando `entitlements.paid=false`.
2. **NO** emite token ni envía correo — solo guarda el lead.
3. Retornar `{ ok: true }`. El frontend luego redirige a WhatsApp.

Razón: `/api/auth/request` envía un enlace mágico que **da acceso**. Un
prospecto que aún no paga no debe recibir ese enlace (saltaría el paywall). Por
eso la captura de lead es un endpoint aparte que solo persiste el contacto; el
acceso se activa a mano vía `admin.html` → `grant` tras el pago.

**Sin cambios:** `/api/auth/request` (sigue siendo solo para usuarios que ya
deben tener acceso: bootstrap de primera contraseña y reset), `/api/me`,
`/api/admin/access`, el resto del flujo de paywall.

## Gate modal (frontend, en `docs/curso.html`)

- Al cargar, el contenido del curso se renderiza pero queda **cubierto por una
  tarjeta modal centrada** sobre un fondo atenuado/desenfocado. Todo gateado →
  nada se asoma.
- **Responsivo:** tarjeta máx. ~420px en desktop; casi ancho completo con
  padding cómodo en móvil. Body con scroll bloqueado mientras está abierto.
  Esto corrige directamente el "ocupa toda la página, descuidado".
- **Dos pestañas:**
  - **"Ya tengo acceso"** (login): campos email + contraseña →
    `POST /api/auth/login`. Debajo, enlace pequeño "Entrar con enlace por
    correo" → dispara `/api/auth/request` (primera vez / contraseña olvidada).
  - **"Quiero acceso"** (prospecto): nombre, email, empresa, etc. → guarda el
    lead → handoff a WhatsApp.
- **Estados de error dentro de la tarjeta** (no full-page): credenciales
  inválidas, "sesión cerrada en otro dispositivo", enlace enviado, etc.

### Captura de prospecto (lead → WhatsApp)

La pestaña "Quiero acceso" llama a `POST /api/lead`, que hace upsert del perfil
(nombre, empresa, giro, etc.) en la tabla `users` **sin** emitir token ni enviar
correo. El frontend luego manda al prospecto a WhatsApp (`wa.me/...`) para
iniciar la conversación de pago. Tú activas el acceso a mano vía `admin.html` →
`/api/admin/access` (acción `grant`). **No se inventa tabla de leads nueva** —
`users` + `entitlements.paid=false` es el lead. (Importante: NO se usa
`/api/auth/request` aquí, porque ese envía un enlace que da acceso y saltaría el
paywall.)

## Flujo de datos (máquina de estados del gate)

1. Carga la página → lee token de sesión de `localStorage` → `GET /api/me`.
2. **Sesión válida + `paid:true`** → ocultar modal, acceso completo.
3. **Sesión válida + `paid:false`** → estado "tu acceso aún no está activo →
   WhatsApp" (logueado pero sin pagar).
4. **Sin sesión / inválida / revocada (401)** → mostrar gate (pestaña login
   por defecto).
5. **Login exitoso** → guardar token, `GET /api/me`, desbloquear.
6. **Cualquier 401 a mitad de sesión** (p. ej. expulsado por login nuevo en otro
   lado) → re-mostrar gate con el mensaje "sesión iniciada en otro dispositivo".

### Primera contraseña

Usuario nuevo abre enlace mágico → llega al curso con `#token=` → intercambia
vía `/api/auth/verify` → entra. Un aviso suave ofrece "establece una contraseña
para entrar más rápido la próxima vez" → `POST /api/auth/set-password`. Opcional
pero recomendado.

### Cuenta / logout

Un menú pequeño con "Cerrar sesión" → `POST /api/auth/logout` → limpia
localStorage → reaparece el gate.

### API_BASE

Relativo (`''`) — mismo origen vía los rewrites de `vercel.json` (consistente
con cómo lo dejan PR #2/#3).

## Componentes y límites

| Unidad | Qué hace | Depende de |
|---|---|---|
| `0003_passwords.sql` | Agrega `users.password_hash` | — |
| `_lib/auth.ts` (helpers nuevos) | hashPassword / verifyPassword / revokeUserSessions | node:crypto, db |
| `POST /api/auth/login` | Login por contraseña + sesión única | _lib/auth, db |
| `POST /api/auth/set-password` | Fija contraseña (auth'd) | _lib/auth, db |
| `POST /api/lead` | Captura prospecto sin emitir acceso | db |
| `verify.ts` (cambio mínimo) | Revoca sesiones previas en login mágico | _lib/auth |
| Gate UI en `curso.html` | Modal responsivo, login/lead, máquina de estados | /api/auth/login, /api/me, /api/auth/request, /api/auth/logout, /api/auth/set-password, /api/lead |

## Pruebas (end-to-end, contra el entorno local)

Con el dev server local (`npm run dev`) + Postgres local:

1. **Migración:** correr `0003` y verificar columna `password_hash`.
2. **Login sin contraseña:** usuario sin `password_hash` → `/api/auth/login`
   → 401 genérico.
3. **Set + login:** enlace mágico → dentro → `set-password` → logout →
   `login` con email+contraseña → 200 + sesión.
4. **Sesión única:** login en "dispositivo A" (token A), luego login en
   "dispositivo B" (token B); verificar que un request con token A → 401 y que
   `sessions` muestra A con `revoked_at` no nulo.
5. **Gate paid/unpaid:** usuario sin `entitlements.paid` → estado WhatsApp;
   tras `grant` vía admin → acceso completo.
6. **Prospecto:** "Quiero acceso" → `POST /api/lead` guarda perfil en `users`
   sin enviar correo ni token, redirige a WhatsApp, sin acceso hasta `grant`.
7. **Modal responsivo:** verificar a ancho desktop y móvil (≤420px) que la
   tarjeta no ocupa toda la página y el scroll del body queda bloqueado.

## Notas de alcance / branching

- Este trabajo toca **`docs/curso.html` (curso nuevo, en `main`)** y el backend
  (`api/`, `migrations/`). NO va en la rama `infra/local-dev-env`.
- Va en su propia rama de feature, su propio PR al repo de Luis, basado donde
  corresponda según el orden de merge de los PRs de infra/auth existentes
  (#2/#3) — a decidir al armar el plan.
- Fuera de alcance (YAGNI): recuperación de contraseña por formulario dedicado
  (el enlace mágico cubre el reset), límite de intentos / rate-limiting de
  login, "recuérdame" configurable (la sesión ya es de 30 días fija).
