'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SmsTemplate, Contact } from '@/types';
import Button from '@/components/ui/Button';
import { Send, Users, MessageSquare, FileText, CheckCircle } from 'lucide-react';
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
      query = query.or(selectedTags.map((tag) => `tags.cs.${JSON.stringify([tag])}`).join(','));
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

  const charCount = body.length;
  const segments = Math.ceil(charCount / 160) || 1;
  const mergeFields = ['{{first_name}}', '{{last_name}}'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Send size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">SMS Broadcast</h1>
          </div>
          <p className="text-sm text-navy/50">Send a text message to multiple contacts at once</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sms/conversations">
            <Button variant="outline" size="sm">
              <MessageSquare size={14} />
              Conversations
            </Button>
          </Link>
          <Link href="/sms/templates">
            <Button variant="outline" size="sm">
              <FileText size={14} />
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {step === 'compose' && (
        <div className="max-w-2xl space-y-5">
          {/* Template selector */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Start from a template (optional)
            </label>
            <select
              onChange={(e) => {
                const t = templates.find((t) => t.id === e.target.value);
                if (t) setBody(t.body || '');
              }}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            >
              <option value="">Write from scratch</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Message body */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none transition-all"
              placeholder="Hi {{first_name}}, ..."
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                {mergeFields.map((field) => (
                  <button
                    key={field}
                    onClick={() => setBody(body + field)}
                    className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gold/10 text-gold-dark hover:bg-gold/20 transition-colors"
                  >
                    {field}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-navy/35">
                {charCount} chars &middot; {segments} segment{segments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Tag filter */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Filter by Tags (optional)
            </label>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-gold text-white shadow-sm'
                        : 'bg-cream-dark text-navy/60 hover:bg-cream-dark/80 hover:text-navy'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy/35">No tags found. All active contacts with phone numbers will be included.</p>
            )}
          </div>

          {/* Matching contacts */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">
                    {matchingContacts.length} recipient{matchingContacts.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-navy/40">Active contacts with phone numbers</p>
                </div>
              </div>
              {body.trim() && matchingContacts.length > 0 && (
                <span className="text-[10px] text-navy/35">
                  ~{segments * matchingContacts.length} total segment{segments * matchingContacts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSend}
              disabled={!body.trim() || matchingContacts.length === 0}
              loading={sending}
            >
              <Send size={14} />
              Send to {matchingContacts.length} Contact{matchingContacts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="max-w-md mx-auto card p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Sending SMS Broadcast...</h3>
          <p className="text-sm text-navy/50">
            {progress.sent} of {progress.total} messages sent
          </p>
          <div className="mt-4 w-full bg-cream-dark rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gold h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="max-w-md mx-auto card p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Broadcast Sent!</h3>
          <p className="text-sm text-navy/50 mb-6">
            Successfully sent {progress.sent} of {progress.total} SMS messages.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/sms/conversations">
              <Button variant="outline" size="sm">
                <MessageSquare size={14} />
                View Conversations
              </Button>
            </Link>
            <Button size="sm" onClick={() => { setStep('compose'); setBody(''); setSelectedTags([]); }}>
              <Send size={14} />
              Send Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
