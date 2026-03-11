'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Mail, Send, FileText } from 'lucide-react';
import { Contact, EmailTemplate } from '@/types';

interface DirectEmailModalProps {
  open: boolean;
  onClose: () => void;
  contact: Contact;
  onSuccess?: () => void;
}

export default function DirectEmailModal({
  open,
  onClose,
  contact,
  onSuccess,
}: DirectEmailModalProps) {
  const supabase = createClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setBody('');
    setError('');
    setShowTemplates(false);
    supabase
      .from('email_templates')
      .select('*')
      .order('name')
      .then(({ data }) => setTemplates(data || []));
  }, [open, supabase]);

  const applyTemplate = (template: EmailTemplate) => {
    const merge = (str: string) =>
      str
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
        .replace(/\{\{email\}\}/g, contact.email || '');

    setSubject(merge(template.subject || ''));
    // Strip HTML tags for plain-text compose
    const stripped = (template.html_body || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setBody(merge(stripped));
    setShowTemplates(false);
    setTimeout(() => bodyRef.current?.focus(), 50);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError('');

    const res = await fetch('/api/email/direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contact.id,
        subject: subject.trim(),
        body: body.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to send email');
      setSending(false);
      return;
    }

    setSending(false);
    onClose();
    onSuccess?.();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Email ${contact.first_name || contact.email || 'Contact'}`}>
      <div className="space-y-3">
        {/* To */}
        <div className="flex items-center gap-2 px-3 py-2 bg-cream/50 rounded-xl">
          <Mail size={13} className="text-navy/40 shrink-0" />
          <span className="text-xs text-navy/50">To:</span>
          <span className="text-xs font-medium text-navy">{contact.email}</span>
        </div>

        {/* Subject */}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder-navy/30"
        />

        {/* Body */}
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Hi ${contact.first_name || ''},\n\n`}
          rows={9}
          className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none transition-all placeholder-navy/30"
        />

        {/* Template picker */}
        {showTemplates && (
          <div className="card p-3 max-h-44 overflow-y-auto animate-fade-in">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Load template
            </p>
            {templates.length === 0 ? (
              <p className="text-xs text-navy/40 py-1">
                No templates yet.{' '}
                <a href="/email/templates/new" className="text-gold-dark hover:underline">
                  Create one
                </a>
              </p>
            ) : (
              <div className="space-y-0.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream transition-colors"
                  >
                    <p className="text-sm font-medium text-navy">{t.name}</p>
                    {t.subject && (
                      <p className="text-xs text-navy/40 truncate">{t.subject}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-cream-dark">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
              showTemplates
                ? 'bg-gold/10 text-gold-dark'
                : 'text-navy/40 hover:text-navy hover:bg-cream-dark'
            }`}
          >
            <FileText size={14} />
            Templates
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-navy/25">⌘ + Enter to send</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              loading={sending}
              disabled={!subject.trim() || !body.trim()}
            >
              <Send size={13} />
              Send
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
