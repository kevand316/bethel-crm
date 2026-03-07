export interface Contact {
  id: string;
  org_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  source: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  intake_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  org_id: number;
  name: string;
  subject: string | null;
  html_body: string | null;
  created_at: string;
}

export interface SmsTemplate {
  id: string;
  org_id: number;
  name: string;
  body: string | null;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  org_id: number;
  name: string | null;
  template_id: string | null;
  filter_tags: string[] | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
  email_templates?: EmailTemplate;
}

export interface EmailSend {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  resend_id: string | null;
  status: 'sent' | 'opened' | 'clicked' | 'bounced' | 'failed';
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  sent_at: string;
  contacts?: Contact;
}

export interface SmsMessage {
  id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  body: string | null;
  campaign_id: string | null;
  twilio_sid: string | null;
  status: string;
  created_at: string;
  contacts?: Contact;
}

export interface ActivityLog {
  id: string;
  contact_id: string | null;
  type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  totalContacts: number;
  activeContacts: number;
  totalEmailsSent: number;
  emailOpenRate: number;
  emailBounceRate: number;
  totalSmsSent: number;
  totalSmsReceived: number;
  recentActivity: ActivityLog[];
}
