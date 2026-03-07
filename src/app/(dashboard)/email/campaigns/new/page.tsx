'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { EmailTemplate, Contact } from '@/types';
import { mergeTags } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Send, Users, Eye } from 'lucide-react';
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
      // Filter contacts that have ALL selected tags
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

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name: name.trim(),
        template_id: templateId,
        filter_tags: selectedTags.length > 0 ? selectedTags : null,
        status: 'sending',
        org_id: 1,
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

    // Send emails in batches via API route
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

      // Stagger between batches (1 second delay)
      if (i + batchSize < matchingContacts.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update campaign stats
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
    <div>
      <Link
        href="/email/campaigns"
        className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Campaigns
      </Link>

      <h1 className="text-2xl font-serif text-navy mb-6">New Email Campaign</h1>

      {step === 'setup' && (
        <div className="space-y-6">
          {/* Campaign Name */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., March Newsletter"
            />
          </div>

          {/* Template Selection */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">Email Template</label>
            {templates.length === 0 ? (
              <div className="text-sm text-navy/60">
                No templates yet.{' '}
                <Link href="/email/templates/new" className="text-gold-dark underline">
                  Create one first
                </Link>
              </div>
            ) : (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.subject || '(no subject)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tag Filter */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <label className="block text-sm font-medium text-navy mb-2">
              Filter by Tags (optional — leave empty to send to all active contacts)
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
              {allTags.length === 0 && (
                <span className="text-sm text-navy/40">No tags found</span>
              )}
            </div>
          </div>

          {/* Matching Contacts */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-navy/60" />
              <span className="text-sm font-medium text-navy">
                {matchingContacts.length} matching contacts
              </span>
            </div>
            <p className="text-xs text-navy/50">
              Only active contacts with email addresses will receive this campaign.
              Unsubscribed and bounced contacts are automatically excluded.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (templateId) setStep('preview');
              }}
              disabled={!templateId}
            >
              <Eye size={14} />
              Preview
            </Button>
            <Button
              onClick={handleSend}
              disabled={!templateId || !name.trim() || matchingContacts.length === 0}
              loading={loading}
            >
              <Send size={14} />
              Send to {matchingContacts.length} Contacts
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && selectedTemplate && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-cream-dark p-6">
            <h3 className="text-sm font-medium text-navy/60 mb-1">Subject</h3>
            <p className="text-navy mb-4">
              {mergeTags(selectedTemplate.subject || '', {
                first_name: 'John',
                last_name: 'Smith',
                email: 'john@example.com',
              })}
            </p>
            <h3 className="text-sm font-medium text-navy/60 mb-1">Body Preview</h3>
            <div
              className="prose prose-sm max-w-none border border-cream-dark rounded-lg p-4"
              dangerouslySetInnerHTML={{
                __html: mergeTags(selectedTemplate.html_body || '', {
                  first_name: 'John',
                  last_name: 'Smith',
                  email: 'john@example.com',
                }),
              }}
            />
            <p className="text-xs text-navy/40 mt-4">
              * Preview uses sample data. Actual emails will use each contact&apos;s real information.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('setup')}>
              Back to Setup
            </Button>
            <Button
              onClick={handleSend}
              disabled={matchingContacts.length === 0}
              loading={loading}
            >
              <Send size={14} />
              Send Campaign
            </Button>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="bg-white rounded-xl border border-cream-dark p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-serif text-navy mb-2">Sending Campaign...</h3>
          <p className="text-sm text-navy/60">
            {sendProgress.sent} of {sendProgress.total} emails processed
          </p>
          <div className="w-full max-w-xs mx-auto mt-4 h-2 bg-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-300"
              style={{
                width: `${sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-xl border border-cream-dark p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">&#10003;</span>
          </div>
          <h3 className="text-lg font-serif text-navy mb-2">Campaign Sent!</h3>
          <p className="text-sm text-navy/60 mb-4">
            Successfully sent {sendProgress.sent} emails.
          </p>
          <Link href="/email/campaigns">
            <Button>View Campaigns</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
