'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { EmailCampaign, EmailSend } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Mail, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CampaignDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [sends, setSends] = useState<EmailSend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    const { data } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(name, subject)')
      .eq('id', campaignId)
      .single();
    setCampaign(data);
  }, [campaignId, supabase]);

  const fetchSends = useCallback(async () => {
    const { data } = await supabase
      .from('email_sends')
      .select('*, contacts(first_name, last_name, email)')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false });
    setSends(data || []);
    setLoading(false);
  }, [campaignId, supabase]);

  useEffect(() => {
    fetchCampaign();
    fetchSends();
  }, [fetchCampaign, fetchSends]);

  if (loading || !campaign) {
    return <div className="text-center py-12 text-navy/40">Loading campaign...</div>;
  }

  const openRate = campaign.total_sent > 0
    ? Math.round((campaign.total_opened / campaign.total_sent) * 100)
    : 0;
  const bounceRate = campaign.total_sent > 0
    ? Math.round((campaign.total_bounced / campaign.total_sent) * 100)
    : 0;

  return (
    <div>
      <Link
        href="/email/campaigns"
        className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Campaigns
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">{campaign.name || 'Untitled Campaign'}</h1>
          <p className="text-sm text-navy/60 mt-1">
            Template: {campaign.email_templates?.name || '—'} &middot; Sent {formatDateTime(campaign.sent_at)}
          </p>
        </div>
        <Badge
          variant={
            campaign.status === 'sent'
              ? 'green'
              : campaign.status === 'sending'
              ? 'gold'
              : campaign.status === 'failed'
              ? 'red'
              : 'gray'
          }
        >
          {campaign.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={16} className="text-navy/40" />
            <span className="text-sm text-navy/60">Total Sent</span>
          </div>
          <p className="text-2xl font-serif text-navy">{campaign.total_sent}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={16} className="text-blue-500" />
            <span className="text-sm text-navy/60">Opened</span>
          </div>
          <p className="text-2xl font-serif text-navy">
            {campaign.total_opened} <span className="text-sm text-navy/40">({openRate}%)</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-navy/60">Clicked</span>
          </div>
          <p className="text-2xl font-serif text-navy">{campaign.total_clicked}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm text-navy/60">Bounced</span>
          </div>
          <p className="text-2xl font-serif text-navy">
            {campaign.total_bounced} <span className="text-sm text-navy/40">({bounceRate}%)</span>
          </p>
        </div>
      </div>

      {/* Individual sends */}
      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-cream-dark">
          <h3 className="text-sm font-medium text-navy">Individual Sends</h3>
        </div>
        {sends.length === 0 ? (
          <div className="p-8 text-center text-navy/40 text-sm">No send records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="px-4 py-2 text-left font-medium text-navy/70">Contact</th>
                  <th className="px-4 py-2 text-left font-medium text-navy/70">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-navy/70">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-navy/70">Sent At</th>
                  <th className="px-4 py-2 text-left font-medium text-navy/70">Opened</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((send) => (
                  <tr key={send.id} className="border-b border-cream-dark/50">
                    <td className="px-4 py-2">
                      {send.contacts
                        ? `${send.contacts.first_name || ''} ${send.contacts.last_name || ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-navy/70">{send.contacts?.email || '—'}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={
                          send.status === 'sent' || send.status === 'opened'
                            ? 'green'
                            : send.status === 'bounced'
                            ? 'red'
                            : 'gray'
                        }
                      >
                        {send.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-navy/70">{formatDateTime(send.sent_at)}</td>
                    <td className="px-4 py-2 text-navy/70">{formatDateTime(send.opened_at)}</td>
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
