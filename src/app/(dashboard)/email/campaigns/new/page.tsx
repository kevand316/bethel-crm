'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { EmailTemplate, Contact } from '@/types';
import { mergeTags, getInitials } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Send,
  Users,
  Eye,
  Edit2,
  CheckCircle,
  Mail,
  Tag,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';

type AudienceMode = 'all' | 'tags' | 'specific';

export default function NewCampaignPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('specific');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [senders, setSenders] = useState<{ id: string; name: string; email: string; is_default: boolean }[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'preview' | 'sending' | 'done'>('setup');
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [sendError, setSendError] = useState('');

  const fetchInitialData = useCallback(async () => {
    const [tmplRes, contactRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
      supabase
        .from('contacts')
        .select('*')
        .eq('status', 'active')
        .not('email', 'is', null)
        .order('first_name'),
    ]);

    setTemplates(tmplRes.data || []);

    const contacts = contactRes.data || [];
    setAllContacts(contacts);

    // Fetch senders
    fetch('/api/email/senders')
      .then((r) => r.json())
      .then((data) => {
        const list = data.senders || [];
        setSenders(list);
        const def = list.find((s: { is_default: boolean }) => s.is_default) || list[0];
        if (def) setSelectedSenderId(def.id);
      });

    const tags = new Set<string>();
    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tags.add(t));
    });
    setAllTags(Array.from(tags).sort());
  }, [supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return allContacts;
    const q = contactSearch.toLowerCase();
    return allContacts.filter((c) =>
      [c.first_name, c.last_name, c.email]
        .filter((v): v is string => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [allContacts, contactSearch]);

  const matchingContacts = useMemo(() => {
    if (audienceMode === 'all') return allContacts;
    if (audienceMode === 'tags') {
      if (selectedTags.length === 0) return allContacts;
      return allContacts.filter(
        (c) => Array.isArray(c.tags) && selectedTags.some((t) => c.tags.includes(t))
      );
    }
    // specific
    return allContacts.filter((c) => selectedContactIds.has(c.id));
  }, [audienceMode, allContacts, selectedTags, selectedContactIds]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const handleSend = async () => {
    if (!templateId || !name.trim() || matchingContacts.length === 0) return;
    setLoading(true);
    setStep('sending');

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name: name.trim(),
        template_id: templateId,
        filter_tags: audienceMode === 'tags' && selectedTags.length > 0 ? selectedTags : null,
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

    let lastError = '';

    for (let i = 0; i < matchingContacts.length; i += batchSize) {
      const batch = matchingContacts.slice(i, i + batchSize);

      try {
        const selectedSender = senders.find((s) => s.id === selectedSenderId);
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: campaign.id,
            template_id: templateId,
            from_email: selectedSender?.email,
            from_name: selectedSender?.name,
            contacts: batch.map((c) => ({
              id: c.id,
              email: c.email,
              first_name: c.first_name,
              last_name: c.last_name,
            })),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          lastError = result.error || `HTTP ${response.status}`;
          totalFailed += batch.length;
        } else {
          totalSent += result.sent || 0;
          totalFailed += result.failed || 0;
          if (result.errors) lastError = result.errors;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Network error';
        totalFailed += batch.length;
      }

      setSendProgress({ sent: totalSent + totalFailed, total: matchingContacts.length });

      if (i + batchSize < matchingContacts.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await supabase
      .from('email_campaigns')
      .update({ total_sent: totalSent, status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaign.id);

    setSendError(lastError);
    setStep('done');
    setLoading(false);
    router.prefetch('/email/campaigns');
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

          {/* Template */}
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
                    {t.name} — {t.subject || '(no subject)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* From Sender */}
          {senders.length > 0 && (
            <div className="card p-5">
              <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
                From
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} &lt;{s.email}&gt;{s.is_default ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Audience */}
          <div className="card p-5 space-y-4">
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider">
              Audience
            </label>

            {/* Mode selector */}
            <div className="flex gap-2">
              {(
                [
                  { value: 'all', label: 'All Contacts', icon: Users },
                  { value: 'tags', label: 'By Tag', icon: Tag },
                  { value: 'specific', label: 'Pick Contacts', icon: Search },
                ] as { value: AudienceMode; label: string; icon: React.ElementType }[]
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setAudienceMode(value)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                    audienceMode === value
                      ? 'bg-gold/10 border-gold/40 text-gold-dark'
                      : 'border-cream-dark text-navy/50 hover:border-navy/20 hover:text-navy bg-white'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* By tag */}
            {audienceMode === 'tags' && (
              <div className="animate-fade-in">
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
                {selectedTags.length === 0 && (
                  <p className="text-xs text-navy/35 mt-2">
                    No tags selected — will send to all active contacts.
                  </p>
                )}
              </div>
            )}

            {/* Specific contacts */}
            {audienceMode === 'specific' && (
              <div className="animate-fade-in space-y-3">
                {/* Tag shortcuts */}
                {allTags.length > 0 && (
                  <div>
                    <p className="text-xs text-navy/40 mb-2">Quick-select by tag:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map((tag) => {
                        const tagContacts = allContacts.filter(
                          (c) => Array.isArray(c.tags) && c.tags.includes(tag)
                        );
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const ids = tagContacts.map((c) => c.id);
                              setSelectedContactIds((prev) => {
                                const next = new Set(prev);
                                ids.forEach((id) => next.add(id));
                                return next;
                              });
                            }}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-cream-dark text-navy/60 hover:bg-gold/10 hover:text-gold-dark transition-all border border-transparent hover:border-gold/20"
                          >
                            {tag} ({tagContacts.length})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-8 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder-navy/30"
                  />
                  {contactSearch && (
                    <button
                      onClick={() => setContactSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/30 hover:text-navy"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Select All / Clear */}
                <div className="flex items-center gap-3 px-1">
                  <button
                    onClick={() =>
                      setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)))
                    }
                    className="text-xs text-gold-dark hover:underline"
                  >
                    Select all ({filteredContacts.length})
                  </button>
                  {selectedContactIds.size > 0 && (
                    <button
                      onClick={() => setSelectedContactIds(new Set())}
                      className="text-xs text-navy/40 hover:text-navy hover:underline"
                    >
                      Clear
                    </button>
                  )}
                  {selectedContactIds.size > 0 && (
                    <span className="text-xs text-navy/40 ml-auto">
                      {selectedContactIds.size} selected
                    </span>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto border border-cream-dark rounded-xl divide-y divide-cream-dark/50 bg-white">
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-navy/40 text-center py-6">No contacts found.</p>
                  ) : (
                    filteredContacts.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c.id)}
                          onChange={() => toggleContact(c.id)}
                          className="rounded border-navy/30 accent-gold shrink-0"
                        />
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center text-[10px] font-semibold text-navy/60 shrink-0 ring-1 ring-navy/5">
                          {getInitials(c.first_name, c.last_name) || (c.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {[c.first_name, c.last_name].filter(Boolean).length > 0 ? (
                            <>
                              <p className="text-sm font-medium text-navy truncate">
                                {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                              </p>
                              <p className="text-xs text-navy/40 truncate">{c.email}</p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-navy truncate">{c.email}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Recipient count summary */}
            <div className="flex items-center gap-2 px-4 py-3 bg-cream/60 rounded-xl">
              <Users size={14} className="text-navy/40 shrink-0" />
              <span className="text-sm font-medium text-navy">
                {matchingContacts.length} recipient{matchingContacts.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-navy/40">
                — active contacts with email (unsubscribed &amp; bounced excluded)
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { if (templateId) setStep('preview'); }}
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
                <span className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                  Subject:
                </span>
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
                * Preview uses sample data. Actual emails will use each contact&apos;s real
                information.
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-navy/50">
              Sending to {matchingContacts.length} contact{matchingContacts.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
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
          <p className="text-sm text-navy/50 mb-2">
            Successfully sent {sendProgress.sent} of {sendProgress.total} emails.
          </p>
          {sendError && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-left">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Error details:</p>
              <p className="text-xs text-red-600 break-words">{sendError}</p>
            </div>
          )}
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
