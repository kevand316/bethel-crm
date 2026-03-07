-- ============================================================
-- Bethel CRM — Initial Schema Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. Contacts table
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id INT DEFAULT 1,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  intake_submission_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- ============================================================
-- 2. Email templates
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id INT DEFAULT 1,
  name TEXT NOT NULL,
  subject TEXT,
  html_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. SMS templates
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id INT DEFAULT 1,
  name TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Email campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id INT DEFAULT 1,
  name TEXT,
  template_id UUID REFERENCES email_templates(id),
  filter_tags JSONB,
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Individual email sends
-- ============================================================
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  resend_id TEXT,
  status TEXT DEFAULT 'sent',
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact ON email_sends(contact_id);

-- ============================================================
-- 6. SMS messages (inbound + outbound)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT,
  campaign_id UUID,
  twilio_sid TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sms_messages_contact ON sms_messages(contact_id);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);

-- ============================================================
-- 7. Activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_contact ON activity_log(contact_id);
CREATE INDEX idx_activity_log_type ON activity_log(type);

-- ============================================================
-- 8. Auto-ingest trigger: intake_submissions → contacts
-- ============================================================

-- Function to auto-create a contact when an intake submission is inserted
CREATE OR REPLACE FUNCTION fn_intake_to_contact()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contacts (
    org_id,
    first_name,
    last_name,
    email,
    phone,
    source,
    intake_submission_id,
    tags
  ) VALUES (
    1,
    COALESCE(NEW.first_name, NEW.raw->>'first_name', ''),
    COALESCE(NEW.last_name, NEW.raw->>'last_name', ''),
    COALESCE(NEW.email, NEW.raw->>'email', ''),
    COALESCE(NEW.phone, NEW.raw->>'phone', ''),
    'intake_form',
    NEW.id,
    '["intake"]'::jsonb
  );

  -- Log the activity
  INSERT INTO activity_log (contact_id, type, description)
  SELECT id, 'contact_created', 'Auto-created from intake form submission'
  FROM contacts WHERE intake_submission_id = NEW.id
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on intake_submissions
-- Note: This assumes intake_submissions table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intake_submissions') THEN
    DROP TRIGGER IF EXISTS trg_intake_to_contact ON intake_submissions;
    CREATE TRIGGER trg_intake_to_contact
      AFTER INSERT ON intake_submissions
      FOR EACH ROW
      EXECUTE FUNCTION fn_intake_to_contact();
  END IF;
END $$;

-- ============================================================
-- 9. Updated_at auto-update trigger for contacts
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- 10. Row Level Security (RLS) policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything (staff-only CRM)
CREATE POLICY "Authenticated users can manage contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email_templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage sms_templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email_campaigns"
  ON email_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email_sends"
  ON email_sends FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage sms_messages"
  ON sms_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage activity_log"
  ON activity_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role policies for edge functions (webhooks, etc.)
CREATE POLICY "Service role full access contacts"
  ON contacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access sms_messages"
  ON sms_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access activity_log"
  ON activity_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access email_sends"
  ON email_sends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access email_campaigns"
  ON email_campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 11. Helper RPC: Atomically increment campaign stats
-- ============================================================
CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campaign_id UUID,
  p_field TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE email_campaigns SET %I = %I + 1 WHERE id = $1',
    p_field, p_field
  ) USING p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
