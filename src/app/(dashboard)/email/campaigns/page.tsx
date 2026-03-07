'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { EmailCampaign } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { Mail, Plus, Eye, FileText, Send } from 'lucide-react';

function CampaignSkeleton() {
  return (
    <tr className="border-b border-cream-dark/50">
      <td className="px-5 py-3.5"><div className="skeleton w-32 h-4" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-24 h-3" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-14 h-5 rounded-full" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-10 h-3" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-16 h-3" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-12 h-3" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-24 h-3" /></td>
      <td className="px-5 py-3.5"><div className="skeleton w-8 h-8 rounded-lg" /></td>
    </tr>
  );
}

export default function EmailCampaignsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(name)')
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="gray">Draft</Badge>;
      case 'sending': return <Badge variant="gold">Sending</Badge>;
      case 'sent': return <Badge variant="green">Sent</Badge>;
      case 'failed': return <Badge variant="red">Failed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Send size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">Email Campaigns</h1>
          </div>
          <p className="text-sm text-navy/50">Send email broadcasts to your contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/email/templates">
            <Button variant="outline" size="sm">
              <FileText size={14} />
              Templates
            </Button>
          </Link>
          <Link href="/email/campaigns/new">
            <Button size="sm">
              <Plus size={14} />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark bg-cream/40">
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Campaign</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Template</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Sent</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Opened</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Bounced</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => <CampaignSkeleton key={i} />)}
            </tbody>
          </table>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-navy/25" />
            </div>
            <h3 className="text-base font-serif text-navy mb-1">No campaigns yet</h3>
            <p className="text-sm text-navy/40 mb-4">Create your first email campaign to reach your contacts.</p>
            <Link href="/email/campaigns/new">
              <Button size="sm">
                <Plus size={14} />
                New Campaign
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Campaign</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Template</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Sent</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Opened</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Bounced</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-cream-dark/50 table-row-hover group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-navy group-hover:text-gold-dark transition-colors">
                        {campaign.name || 'Untitled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-navy/50 text-xs">
                      {campaign.email_templates?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(campaign.status)}</td>
                    <td className="px-5 py-3.5 text-navy/60 font-medium">{campaign.total_sent}</td>
                    <td className="px-5 py-3.5 text-navy/60">
                      {campaign.total_sent > 0
                        ? <span>{campaign.total_opened} <span className="text-navy/35">({Math.round((campaign.total_opened / campaign.total_sent) * 100)}%)</span></span>
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-navy/60">
                      {campaign.total_sent > 0
                        ? <span>{campaign.total_bounced} <span className="text-navy/35">({Math.round((campaign.total_bounced / campaign.total_sent) * 100)}%)</span></span>
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-navy/40">
                      {formatDateTime(campaign.sent_at || campaign.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/email/campaigns/${campaign.id}`}>
                        <button className="p-1.5 rounded-lg text-navy/30 hover:text-navy hover:bg-cream-dark transition-colors">
                          <Eye size={15} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
