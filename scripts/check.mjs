// Quick sanity check: list tables + row counts. DATABASE_URL=... node scripts/check.mjs
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  `select table_name from information_schema.tables where table_schema='public' order by table_name`
);
console.log('Tables:', rows.map((r) => r.table_name).join(', '));
await pool.end();
