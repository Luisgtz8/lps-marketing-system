-- 0001_init.sql — Lightning Pro Solutions backend schema
-- Idempotent: safe to run multiple times. Target: Neon Postgres.
-- See plan: auth (magic link), one-time paywall, course progress + goals, WhatsApp.

begin;

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email

-- ── updated_at trigger helper ───────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── users ───────────────────────────────────────────────────────────────────
-- Single source of truth. Migrates the old curso_registros concept.
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          citext unique not null,
  nombre         text,
  empresa        text,
  giro           text,            -- values from curso.html:1676-1683
  departamento   text,            -- values from curso.html:1688-1699
  whatsapp_e164  text,            -- normalized +52...
  email_verified boolean not null default false,
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_users_whatsapp on users (whatsapp_e164);

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

-- ── magic_link_tokens ───────────────────────────────────────────────────────
-- Store only SHA-256 of the token, never the raw value. Single-use, short TTL.
create table if not exists magic_link_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,        -- now() + 15 min
  consumed_at timestamptz,                  -- null until used
  created_at  timestamptz not null default now()
);
create index if not exists idx_mlt_token_hash on magic_link_tokens (token_hash);
create index if not exists idx_mlt_user on magic_link_tokens (user_id);

-- ── sessions ────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash text not null,                 -- SHA-256 of bearer token
  expires_at timestamptz not null,          -- now() + 30 days (sliding)
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_sessions_token_hash on sessions (token_hash);
create index if not exists idx_sessions_user on sessions (user_id);

-- ── entitlements ────────────────────────────────────────────────────────────
-- One-time payment model: a simple "has paid → lifetime access" flag.
create table if not exists entitlements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references users(id) on delete cascade,
  stripe_customer_id text,
  product            text not null default 'curso',
  paid               boolean not null default false,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_entitlements_customer on entitlements (stripe_customer_id);

drop trigger if exists trg_entitlements_updated on entitlements;
create trigger trg_entitlements_updated before update on entitlements
  for each row execute function set_updated_at();

-- ── payments ────────────────────────────────────────────────────────────────
-- Append-only Stripe audit. stripe_event_id unique → webhook idempotency.
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete set null,
  stripe_event_id  text not null unique,
  stripe_object_id text,
  type             text,                    -- checkout.session.completed, ...
  amount_cents     integer,
  currency         text not null default 'mxn',
  raw              jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_payments_user on payments (user_id);

-- ── course_progress ─────────────────────────────────────────────────────────
create table if not exists course_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  module_id    smallint not null,           -- 1..7
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, module_id)
);
create index if not exists idx_progress_user on course_progress (user_id);

drop trigger if exists trg_progress_updated on course_progress;
create trigger trg_progress_updated before update on course_progress
  for each row execute function set_updated_at();

-- ── quiz_answers ────────────────────────────────────────────────────────────
create table if not exists quiz_answers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  question_id    text not null,             -- 'q3','q6','q8'
  selected_index smallint,
  is_correct     boolean,
  answered_at    timestamptz not null default now(),
  unique (user_id, question_id)
);

-- ── exercise_submissions ────────────────────────────────────────────────────
create table if not exists exercise_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  exercise_id text not null,                -- 'p1','skill-ej3','agente-pdf'
  kind        text not null,                -- exercise|skill|agent|puzzle
  done        boolean not null default true,
  retries     smallint not null default 0,  -- puzzleRetries
  payload     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, exercise_id)
);

drop trigger if exists trg_exercise_updated on exercise_submissions;
create trigger trg_exercise_updated before update on exercise_submissions
  for each row execute function set_updated_at();

-- ── goals ───────────────────────────────────────────────────────────────────
-- Backs the "Tu camino de 30 días" section (curso.html:4028-4032).
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null,
  detail      text,
  target_date date,
  status      text not null default 'open', -- open|done|dropped
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_goals_user_status on goals (user_id, status);

drop trigger if exists trg_goals_updated on goals;
create trigger trg_goals_updated before update on goals
  for each row execute function set_updated_at();

-- ── whatsapp_contacts ───────────────────────────────────────────────────────
create table if not exists whatsapp_contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references users(id) on delete cascade,
  phone_e164      text not null,
  opt_in_status   text not null default 'pending', -- pending|opted_in|opted_out
  opt_in_at       timestamptz,
  opt_out_at      timestamptz,
  consent_source  text,                            -- curso_form|reply_keyword
  last_inbound_at timestamptz,                      -- drives 24h service window
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists idx_wa_contacts_phone on whatsapp_contacts (phone_e164);

drop trigger if exists trg_wa_contacts_updated on whatsapp_contacts;
create trigger trg_wa_contacts_updated before update on whatsapp_contacts
  for each row execute function set_updated_at();

-- ── whatsapp_messages ───────────────────────────────────────────────────────
create table if not exists whatsapp_messages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,  -- null until matched
  contact_id    uuid references whatsapp_contacts(id) on delete cascade,
  direction     text not null,             -- inbound|outbound
  wa_message_id text,                       -- provider id (for status updates)
  template_name text,
  category      text,                       -- marketing|utility|service|auth
  body          text,
  status        text,                       -- sent|delivered|read|failed
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_wa_messages_contact on whatsapp_messages (contact_id, created_at);
create index if not exists idx_wa_messages_wamid on whatsapp_messages (wa_message_id);

commit;
