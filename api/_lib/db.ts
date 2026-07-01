// Shared Postgres client for all API functions.
//
// Prod: Neon serverless HTTP driver — one round-trip per query, ideal for
// Vercel Functions. DATABASE_URL is auto-provisioned by the Neon integration.
//
// Local dev: when DATABASE_URL points at a localhost Postgres, we can't use the
// Neon driver (it speaks Neon's HTTP/WS protocol, not raw Postgres wire), so we
// fall back to the standard `pg` driver behind an identical tagged-template
// interface. Same `sql\`...\`` call sites, same bare-array result shape — prod
// code path is untouched.
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  // Fail loud at cold start rather than producing confusing query errors.
  throw new Error('DATABASE_URL is not set');
}

// Use the local `pg` shim ONLY off-Vercel against a localhost DB. The two
// guards are belt-and-suspenders so prod can never take this path:
//   1. `process.env.VERCEL` is set in every Vercel runtime (build + all envs),
//      so any deployed function fails this test and uses the Neon driver.
//   2. the URL must point at a loopback host.
// This avoids the failure mode where a Neon URL happening to contain
// "@localhost" (or a tunnel) flips production onto a driver that can't speak
// Neon's protocol and onto `pg`, which isn't in prod `dependencies`.
const isLocal = !process.env.VERCEL && /@(localhost|127\.0\.0\.1)[:/]/.test(url);

// A tagged-template query function returning an array of row objects:
//   sql`select * from users where id = ${id}`
// Parameters are bound safely ($1, $2, …) — no string interpolation.
// Rows are typed loosely (any[]) to match the Neon driver's result shape, so
// existing `rows[0] as Foo` casts in handlers compile unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

export const sql: Sql = isLocal ? makeLocalSql(url) : (neon(url) as unknown as Sql);

// ── Local-only: pg-backed tagged template ────────────────────────────────────
// Lazily dynamic-import `pg` (a devDependency) on first query — the project is
// ESM ("type":"module"), so `require` isn't available. The pool is created once
// and reused. Prod never touches this path, so prod bundles never load `pg`.
function makeLocalSql(connectionString: string): Sql {
  let poolPromise: Promise<import('pg').Pool> | null = null;
  const getPool = () => {
    if (!poolPromise) {
      poolPromise = import('pg').then(({ default: pg }) => new pg.Pool({ connectionString }));
    }
    return poolPromise;
  };

  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    // Build a parameterized query: stitch the literal chunks with $1..$N.
    let text = strings[0];
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}` + strings[i + 1];
    }
    const pool = await getPool();
    const result = await pool.query(text, values);
    return result.rows;
  };
}
