# Backend deployment runbook

The `api/` backend (Vercel Functions + Neon Postgres) is written and typechecks,
but provisioning needs accounts only you can create. Do these in order. The
static site (`docs/`) keeps being served by GitHub Pages — Vercel only runs the
API.

## 0. Prerequisites
```bash
npm i -g vercel
vercel login
vercel link            # choose the existing project lps-marketing-system
```

## 1. Database (Neon)
- In the Vercel dashboard → **Storage** → add **Neon** (Marketplace). It
  auto-injects `DATABASE_URL` into the project's env vars.
- Pull env locally and run the migration:
```bash
vercel env pull .env
psql "$DATABASE_URL" -f migrations/0001_init.sql
```
- ⚠️ **Backfill gap:** the old `curso_registros` rows have no email, but
  `users.email` is `NOT NULL UNIQUE`. Decide how to handle (leave them, or
  collect email on next login) before importing. See `migrations/README.md`.

## 2. Email (Resend) — Phase 2
- Create a Resend account, verify the `lightningprosolutions.com` domain
  (DNS records), make an API key.
- Set env: `vercel env add RESEND_API_KEY` (and `MAGIC_LINK_FROM`,
  `APP_BASE_URL=https://www.lightningprosolutions.com`).

## 3. Manual access grants (no Stripe)
Payments are handled by you out-of-band: a prospect contacts you, you talk,
you send a payment link, and once they pay you activate them.
- Set `ADMIN_TOKEN` to a long random string in Vercel env.
- After deploy, open `https://www.lightningprosolutions.com/admin.html`, paste
  the token, and you get a list of registrants with **Activar / Quitar**
  buttons (or type an email). This calls `POST /api/admin/access`.
- The course paywall card sends unpaid users to your WhatsApp to start that
  conversation.

## 4. Deploy + DNS
```bash
vercel deploy --prod
```
- Add domain `api.lightningprosolutions.com` to the Vercel project; point its
  DNS (CNAME) at Vercel. The frontend already calls `API_BASE` there.
- Verify: `curl https://api.lightningprosolutions.com/api/health` → `{"status":"ok","db":true}`.

## 5. WhatsApp — Phase 5 (long pole: start verification early)
- **Start Meta Business + WhatsApp Business Account (WABA) verification now** —
  it can take days–weeks in Mexico.
- For testing before that: use the **Twilio WhatsApp sandbox** (same DB tables).
- Env: `WHATSAPP_VERIFY_TOKEN` (any random string, also entered in Meta),
  `WHATSAPP_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `CRON_SECRET`.
- In Meta, set the webhook callback to
  `https://api.lightningprosolutions.com/api/whatsapp/webhook` with the same
  verify token; subscribe to `messages`.
- The nudge cron runs daily (`vercel.json`); only messages opted-in contacts
  inside the 24h window. Outside-window template sends are a follow-up.

## Env var checklist (all in Vercel project settings)
`DATABASE_URL` · `APP_BASE_URL` · `RESEND_API_KEY` · `MAGIC_LINK_FROM` ·
`ADMIN_TOKEN` · `WHATSAPP_VERIFY_TOKEN` · `WHATSAPP_APP_SECRET` ·
`WHATSAPP_TOKEN` · `WHATSAPP_PHONE_NUMBER_ID` · `CRON_SECRET`
