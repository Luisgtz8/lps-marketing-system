# Database migrations

SQL migrations for the Lightning Pro Solutions backend (Neon Postgres). Plain
`.sql` files, applied in numeric order. No migration framework — keep it simple.

## Run a migration

```bash
# DATABASE_URL is auto-provisioned by the Neon integration in Vercel env.
# Pull it locally with `vercel env pull .env`, then:
psql "$DATABASE_URL" -f migrations/0001_init.sql
```

Each file is wrapped in a transaction and uses `if not exists`, so re-running is
safe (idempotent).

## Files

- `0001_init.sql` — all tables: `users`, `magic_link_tokens`, `sessions`,
  `entitlements`, `payments`, `course_progress`, `quiz_answers`,
  `exercise_submissions`, `goals`, `whatsapp_contacts`, `whatsapp_messages`.
  Extensions `pgcrypto` + `citext`, and a shared `set_updated_at()` trigger.

## One-time backfill: `curso_registros` → `users`

The old Supabase `curso_registros` rows (name/empresa/giro/departamento/whatsapp)
map onto `users`. Export them from the old Supabase project and insert with
`email_verified = false`; users re-verify on first magic-link login. Note: the
old table has no email column, so `email` must be supplied (e.g. left null until
the user logs in, or matched by another channel). Decide before backfilling
whether `giro`/`departamento` should become a `CHECK` enum to avoid dirty data.
