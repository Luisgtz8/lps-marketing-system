-- 0003_passwords.sql — add password auth to users.
-- Nullable: null = no password set yet (magic-link only). Idempotent.
begin;
alter table users add column if not exists password_hash text;
commit;
