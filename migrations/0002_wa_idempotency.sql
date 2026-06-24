-- 0002_wa_idempotency.sql — dedupe inbound WhatsApp messages.
-- Meta retries webhooks; without this, the same inbound message is logged
-- multiple times and could trigger duplicate auto-replies. Unique on the
-- provider message id (partial: only when present, so outbound rows with null
-- wa_message_id are unaffected).
begin;

create unique index if not exists idx_wa_messages_wamid_unique
  on whatsapp_messages (wa_message_id)
  where wa_message_id is not null;

commit;
