// Auth helpers: token generation, hashing, session resolution.
import { randomBytes, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';
import { sql } from './db.js';

// Opaque random token (URL-safe). 32 bytes ≈ 256 bits of entropy.
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

// We store only the hash; the raw token lives in the email link / bearer header.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionUser {
  id: string;
  email: string;
  nombre: string | null;
  is_admin: boolean;
}

/**
 * Resolve the bearer token on a request to a user + active session.
 * Returns null if missing/invalid/expired/revoked.
 */
export async function getSessionUser(req: VercelRequest): Promise<SessionUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const rows = await sql`
    select u.id, u.email, u.nombre, u.is_admin
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)}
      and s.revoked_at is null
      and s.expires_at > now()
    limit 1
  `;
  return (rows[0] as SessionUser) ?? null;
}

// Basic RFC-5322-ish email sanity check (not exhaustive — Postgres citext +
// the magic-link round-trip are the real validation).
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Hard allowlist of admin emails. A session only reaches the admin panel if its
// email is in here AND it has is_admin=true — the allowlist is the load-bearing
// gate, is_admin is a secondary flag. Configured via ADMIN_EMAILS (comma-separated);
// falls back to the three known operators if the env var is unset.
const ADMIN_EMAILS_DEFAULT = [
  'luisgutierrezhomesolutions@gmail.com',
  'davidhagenb@gmail.com',
  'dhagenballesteros@outlook.com',
];

function adminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS;
  const list = (raw ? raw.split(',') : ADMIN_EMAILS_DEFAULT)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
}

export function isAllowlistedAdmin(email: string): boolean {
  return adminEmailAllowlist().has(email.trim().toLowerCase());
}

// Admin auth (fallback): a shared secret in `Authorization: Bearer <ADMIN_TOKEN>`.
// Kept as a break-glass option; the primary path is a user session with is_admin.
export function isAdminRequest(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  const header = req.headers.authorization;
  if (!expected || !header || !header.startsWith('Bearer ')) return false;
  const given = header.slice('Bearer '.length).trim();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Authorize an admin request. Primary path: a logged-in user whose session
 * has is_admin=true AND whose email is in the ADMIN_EMAILS allowlist (both are
 * required — the allowlist is the hard gate). Fallback: the shared ADMIN_TOKEN
 * break-glass. Returns the SessionUser when authorized via session, `true` when
 * authorized via the token, or null when not authorized.
 */
export async function requireAdmin(req: VercelRequest): Promise<SessionUser | true | null> {
  const user = await getSessionUser(req);
  if (user && user.is_admin && isAllowlistedAdmin(user.email)) return user;
  if (isAdminRequest(req)) return true;
  return null;
}

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
