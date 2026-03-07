'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { EmailTemplate, Contact } from '@/types';
import { mergeTags } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { ArrowLeft, Send, Users, Eye, Edit2, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaignPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [matchingContacts, setMatchingContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'preview' | 'sending' | 'done'>('setup');
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
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
      .not('email', 'is', null);

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

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const handleSend = async () => {
    if (!templateId || !name.trim()) return;
    setLoading(true);
    setStep('sending');

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name: name.trim(),
        template_id: templateId,
        filter_tags: selectedTags.length > 0 ? selectedTags : null,
        status: 'sending',
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      alert('Failed to create campaign');
      setLoading(false);
      setStep('setup');
      return;
    }

    setSendProgress({ sent: 0, total: matchingContacts.length });

    const batchSize = 10;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < matchingContacts.length; i += batchSize) {
      const batch = matchingContacts.slice(i, i + batchSize);

      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: campaign.id,
            template_id: templateId,
            contacts: batch.map((c) => ({
              id: c.id,
              email: c.email,
              first_name: c.first_name,
              last_name: c.last_name,
            })),
          }),
        });

        const result = await response.json();
        totalSent += result.sent || 0;
        totalFailed += result.failed || 0;
      } catch {
        totalFailed += batch.length;
      }

      setSendProgress({ sent: totalSent + totalFailed, total: matchingContacts.length });

      if (i + batchSize < matchingContacts.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await supabase
      .from('email_campaigns')
      .update({
        total_sent: totalSent,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    setStep('done');
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <Link
        href="/email/campaigns"
        className="inline-flex items-center gap-1 text-xs text-navy/40 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to Campaigns
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <Mail size={20} className="text-gold" />
        <h1 className="text-2xl font-serif text-navy">New Email Campaign</h1>
      </div>

      {step === 'setup' && (
        <div className="max-w-2xl space-y-5">
          {/* Campaign Name */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              placeholder="e.g., March Newsletter"
            />
          </div>

          {/* Template Selection */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Email Template
            </label>
            {templates.length === 0 ? (
              <div className="text-sm text-navy/40">
                No templates yet.{' '}
                <Link href="/email/templates/new" className="text-gold-dark hover:underline">
                  Create one first
                </Link>
              </div>
            ) : (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} -- {t.subject || '(no subject)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tag Filter */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
              Filter by Tags (optional)
            </label>
            <p className="text-[10px] text-navy/35 mb-3">Leave empty to send to all active contacts with email addresses.</p>
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
              <p className="text-sm text-navy/35">No tags found.</p>
            )}
          </div>

          {/* Matching Contacts */}
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={14} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">
                  {matchingContacts.length} recipient{matchingContacts.length !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-navy/40">
                  Active contacts with email. Unsubscribed and bounced excluded.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (templateId) setStep('preview');
              }}
              disabled={!templateId}
            >
              <Eye size={13} />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!templateId || !name.trim() || matchingContacts.length === 0}
              loading={loading}
            >
              <Send size={13} />
              Send to {matchingContacts.length} Contact{matchingContacts.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && selectedTemplate && (
        <div className="max-w-2xl space-y-5">
          <div className="card p-8">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-cream-dark">
                <span className="text-xs font-semibold text-navy/40 uppercase tracking-wider">Subject:</span>
                <span className="text-sm text-navy">
                  {mergeTags(selectedTemplate.subject || '', {
                    first_name: 'John',
                    last_name: 'Smith',
                    email: 'john@example.com',
                  })}
                </span>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: mergeTags(selectedTemplate.html_body || '', {
                    first_name: 'John',
                    last_name: 'Smith',
                    email: 'john@example.com',
                  }),
                }}
              />
              <p className="text-[10px] text-navy/30 mt-6 pt-4 border-t border-cream-dark">
                * Preview uses sample data. Actual emails will use each contact&apos;s real information.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('setup')}>
              <Edit2 size={13} />
              Back to Setup
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={matchingContacts.length === 0}
              loading={loading}
            >
              <Send size={13} />
              Send Campaign
            </Button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="max-w-md mx-auto card p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Sending Campaign...</h3>
          <p className="text-sm text-navy/50">
            {sendProgress.sent} of {sendProgress.total} emails processed
          </p>
          <div className="mt-4 w-full bg-cream-dark rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gold h-full rounded-full transition-all duration-500"
              style={{
                width: `${sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="max-w-md mx-auto card p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Campaign Sent!</h3>
          <p className="text-sm text-navy/50 mb-6">
            Successfully sent {sendProgress.sent} of {sendProgress.total} emails.
          </p>
          <Link href="/email/campaigns">
            <Button size="sm">
              <Mail size={13} />
              View Campaigns
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
