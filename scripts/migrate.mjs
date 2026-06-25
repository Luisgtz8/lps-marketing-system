// Run SQL migrations against Neon using the Pool (WebSocket) driver, which
// supports multi-statement files and transactions. No psql needed.
// Usage: DATABASE_URL=... node scripts/migrate.mjs
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const here = dirname(fileURLToPath(import.meta.url));
const migDir = join(here, '..', 'migrations');
const pool = new Pool({ connectionString: url });

const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
console.log(`Found ${files.length} migration(s): ${files.join(', ')}`);

try {
  for (const f of files) {
    const text = readFileSync(join(migDir, f), 'utf8');
    process.stdout.write(`Applying ${f} ... `);
    await pool.query(text);   // runs the whole file (begin/commit inside)
    console.log('ok');
  }
  console.log('All migrations applied.');
} finally {
  await pool.end();
}
