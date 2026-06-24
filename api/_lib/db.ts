// Shared Neon Postgres client for all API functions.
// Uses the serverless HTTP driver — one round-trip per query, ideal for
// Vercel Functions. DATABASE_URL is auto-provisioned by the Neon integration.
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  // Fail loud at cold start rather than producing confusing query errors.
  throw new Error('DATABASE_URL is not set');
}

// `sql` is a tagged-template function: sql`select * from users where id = ${id}`
// Parameters are bound safely (no string interpolation / SQL injection).
export const sql = neon(url);
