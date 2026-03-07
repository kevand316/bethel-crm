'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { EmailCampaign } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Mail, Plus, Eye } from 'lucide-react';

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
      case 'draft':
        return <Badge variant="gray">Draft</Badge>;
      case 'sending':
        return <Badge variant="gold">Sending</Badge>;
      case 'sent':
        return <Badge variant="green">Sent</Badge>;
      case 'failed':
        return <Badge variant="red">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">Email Campaigns</h1>
          <p className="text-sm text-navy/60 mt-1">
            Send email broadcasts to your contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/email/templates">
            <Button variant="outline" size="sm">Templates</Button>
          </Link>
          <Link href="/email/campaigns/new">
            <Button size="sm">
              <Plus size={14} />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy/40">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No campaigns yet"
            description="Create your first email campaign to reach your contacts."
            action={
              <Link href="/email/campaigns/new">
                <Button size="sm">
                  <Plus size={14} />
                  New Campaign
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Campaign</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Template</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Sent</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Opened</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Bounced</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-navy/70"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{campaign.name || 'Untitled'}</td>
                    <td className="px-4 py-3 text-navy/70">
                      {campaign.email_templates?.name || '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(campaign.status)}</td>
                    <td className="px-4 py-3 text-navy/70">{campaign.total_sent}</td>
                    <td className="px-4 py-3 text-navy/70">
                      {campaign.total_sent > 0
                        ? `${campaign.total_opened} (${Math.round((campaign.total_opened / campaign.total_sent) * 100)}%)`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-navy/70">
                      {campaign.total_sent > 0
                        ? `${campaign.total_bounced} (${Math.round((campaign.total_bounced / campaign.total_sent) * 100)}%)`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-navy/70">
                      {formatDateTime(campaign.sent_at || campaign.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/email/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye size={14} />
                        </Button>
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
