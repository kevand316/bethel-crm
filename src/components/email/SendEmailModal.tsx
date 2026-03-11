'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Mail, Send } from 'lucide-react';
import { EmailTemplate, Contact } from '@/types';

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSuccess?: () => void;
}

export default function SendEmailModal({ open, onClose, contacts, onSuccess }: SendEmailModalProps) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const eligibleContacts = contacts.filter((c) => c.email && c.status === 'active');

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setTemplateId('');
    supabase
      .from('email_templates')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setTemplates(data || []);
        if (data && data.length === 1) setTemplateId(data[0].id);
      });
  }, [open, supabase]);

  const handleSend = async () => {
    if (!templateId || eligibleContacts.length === 0) return;
    setSending(true);

    const campaignName =
      contacts.length === 1
        ? `Direct: ${[contacts[0].first_name, contacts[0].last_name].filter(Boolean).join(' ')}`
        : `Direct Send (${eligibleContacts.length} contacts)`;

    const { data: campaign } = await supabase
      .from('email_campaigns')
      .insert({
        name: campaignName,
        template_id: templateId,
        status: 'sending',
        total_sent: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
      })
      .select()
      .single();

    if (!campaign) {
      setSending(false);
      return;
    }

    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaign.id,
        template_id: templateId,
        contacts: eligibleContacts,
      }),
    });

    const data = await res.json();

    await supabase
      .from('email_campaigns')
      .update({ status: 'sent', total_sent: data.sent || 0, sent_at: new Date().toISOString() })
      .eq('id', campaign.id);

    setSending(false);
    setResult(data);
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Email">
      {result ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <p className="text-green-700 font-semibold text-base">
              {result.sent} email{result.sent !== 1 ? 's' : ''} sent
            </p>
            {result.failed > 0 && (
              <p className="text-red-500 text-sm mt-1">{result.failed} failed to send</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onSuccess?.();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-cream/50 rounded-xl">
            <Mail size={14} className="text-gold mt-0.5 shrink-0" />
            <p className="text-xs text-navy/60 leading-relaxed">
              Sending to{' '}
              <strong className="text-navy">
                {eligibleContacts.length} active contact{eligibleContacts.length !== 1 ? 's' : ''}
              </strong>{' '}
              with an email address
              {contacts.length > eligibleContacts.length && (
                <span className="text-navy/40">
                  {' '}
                  ({contacts.length - eligibleContacts.length} skipped — no email or inactive)
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              Template
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.subject ? ` — ${t.subject}` : ''}
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-navy/40 mt-1.5">
                No templates yet.{' '}
                <a href="/email/templates/new" className="text-gold-dark underline">
                  Create one first.
                </a>
              </p>
            )}
          </div>

          {eligibleContacts.length === 0 && (
            <p className="text-xs text-red-500 px-1">
              No eligible contacts. Contacts must be active and have an email address.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-cream-dark">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              loading={sending}
              disabled={!templateId || eligibleContacts.length === 0}
            >
              <Send size={13} />
              Send{eligibleContacts.length > 0 ? ` to ${eligibleContacts.length}` : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
