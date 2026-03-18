-- Add ON DELETE CASCADE to contact foreign keys so deleting a contact
-- also removes their email_sends, sms_messages, and activity_log records.

ALTER TABLE email_sends
  DROP CONSTRAINT IF EXISTS email_sends_contact_id_fkey,
  ADD CONSTRAINT email_sends_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE sms_messages
  DROP CONSTRAINT IF EXISTS sms_messages_contact_id_fkey,
  ADD CONSTRAINT sms_messages_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_contact_id_fkey,
  ADD CONSTRAINT activity_log_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
