'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SmsTemplate, Contact } from '@/types';
import Button from '@/components/ui/Button';
import { ArrowLeft, Send, Users } from 'lucide-react';
import Link from 'next/link';

export default function SmsBroadcastPage() {
  const supabase = createClient();

  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [matchingContacts, setMatchingContacts] = useState<Contact[]>([]);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<'compose' | 'sending' | 'done'>('compose');
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('sms_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
  }, [supabase]);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('tags');
    if (data) {
      const tags = new Set<string>();
      data.forEach((c) => {
        if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tags.add(t));
      });
      setAllTags(Array.from(tags).sort());
    }
  }, [supabase]);

  const fetchMatchingContacts = useCallback(async () => {
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('status', 'active')
      .not('phone', 'is', null);

    if (selectedTags.length > 0) {
      for (const tag of selectedTags) {
        query = query.contains('tags', JSON.stringify([tag]));
      }
    }

    const { data } = await query;
    setMatchingContacts(data || []);
  }, [selectedTags, supabase]);

  useEffect(() => {
    fetchTemplates();
    fetchTags();
  }, [fetchTemplates, fetchTags]);

  useEffect(() => {
    fetchMatchingContacts();
  }, [fetchMatchingContacts]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSend = async () => {
    if (!body.trim() || matchingContacts.length === 0) return;
    setSending(true);
    setStep('sending');
    setProgress({ sent: 0, total: matchingContacts.length });

    try {
      const response = await fetch('/api/sms/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          contacts: matchingContacts.map((c) => ({
            id: c.id,
            phone: c.phone,
            first_name: c.first_name,
            last_name: c.last_name,
          })),
        }),
      });

      const result = await response.json();
      setProgress({ sent: result.sent || 0, total: matchingContacts.length });
    } catch {
      // Handle error
    }

    setStep('done');
    setSending(false);
  };

  return (
    <div>
      <Link
        href="/sms/conversations"
        className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Conversations
      </Link>

      <h1 className="text-2xl font-serif text-navy mb-6">SMS Broadcast</h1>

      {step === 'compose' && (
        <div className="space-y-6">
          {/* Template selector */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">
              Start from a template (optional)
            </label>
            <select
              onChange={(e) => {
                const t = templates.find((t) => t.id === e.target.value);
                if (t) setBody(t.body || '');
              }}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="">Write from scratch</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Message body */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              placeholder="Hi {{first_name}}, ..."
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex gap-1">
                {['first_name', 'last_name'].map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setBody(body + `{{${field}}}`)}
                    className="px-2 py-0.5 text-xs bg-gold/10 text-gold-dark rounded hover:bg-gold/20 transition-colors"
                  >
                    {`{{${field}}}`}
                  </button>
                ))}
              </div>
              <span className="text-xs text-navy/40">
                {body.length} chars &middot; {Math.ceil(body.length / 160) || 1} segment{Math.ceil(body.length / 160) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Tag filter */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">
              Filter by Tags (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-gold text-white'
                      : 'bg-cream-dark text-navy hover:bg-cream-dark/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Matching contacts */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-navy/60" />
              <span className="text-sm font-medium text-navy">
                {matchingContacts.length} contacts with phone numbers
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={!body.trim() || matchingContacts.length === 0}
              loading={sending}
            >
              <Send size={14} />
              Send to {matchingContacts.length} Contacts
            </Button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="bg-white rounded-xl border border-cream-dark p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-serif text-navy mb-2">Sending SMS Broadcast...</h3>
          <p className="text-sm text-navy/60">
            {progress.sent} of {progress.total} messages sent
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-xl border border-cream-dark p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">&#10003;</span>
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Broadcast Sent!</h3>
          <p className="text-sm text-navy/60 mb-4">
            Successfully sent {progress.sent} SMS messages.
          </p>
          <Link href="/sms/conversations">
            <Button>View Conversations</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
