-- Email sender identities
CREATE TABLE IF NOT EXISTS email_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage email_senders"
  ON email_senders FOR ALL TO authenticated USING (true);

-- Ensure only one default sender at a time
CREATE UNIQUE INDEX IF NOT EXISTS email_senders_one_default
  ON email_senders (is_default) WHERE is_default = TRUE;
