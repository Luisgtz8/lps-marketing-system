-- 0005_quiz_attempts.sql — Track how many times a user has reset their quiz.
-- quiz_attempt starts at 1 (first attempt), increments on each reset.
begin;
alter table users add column if not exists quiz_attempt smallint not null default 1;
commit;
