-- 0004_token_kind.sql — distinguish magic-login tokens from set-password tokens
-- in the shared magic_link_tokens table. Existing rows are login tokens.
-- Idempotent.
begin;
alter table magic_link_tokens add column if not exists kind text not null default 'magic_link';
commit;
