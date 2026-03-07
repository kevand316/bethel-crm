'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { EmailCampaign, EmailSend } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Mail, Eye, AlertTriangle, CheckCircle, MousePointerClick } from 'lucide-react';
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
    return (
      <div className="animate-fade-in">
        <div className="skeleton w-32 h-4 mb-6" />
        <div className="skeleton w-64 h-8 mb-2" />
        <div className="skeleton w-48 h-4 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton w-full h-64 rounded-xl" />
      </div>
    );
  }

  const openRate = campaign.total_sent > 0
    ? Math.round((campaign.total_opened / campaign.total_sent) * 100)
    : 0;
  const bounceRate = campaign.total_sent > 0
    ? Math.round((campaign.total_bounced / campaign.total_sent) * 100)
    : 0;

  const stats = [
    {
      label: 'Total Sent',
      value: campaign.total_sent,
      icon: Mail,
      iconColor: 'text-navy/40',
      iconBg: 'bg-cream-dark',
    },
    {
      label: 'Opened',
      value: campaign.total_opened,
      suffix: `${openRate}%`,
      icon: Eye,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Clicked',
      value: campaign.total_clicked,
      icon: MousePointerClick,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50',
    },
    {
      label: 'Bounced',
      value: campaign.total_bounced,
      suffix: `${bounceRate}%`,
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
    },
  ];

  return (
    <div className="animate-fade-in">
      <Link
        href="/email/campaigns"
        className="inline-flex items-center gap-1 text-xs text-navy/40 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to Campaigns
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">{campaign.name || 'Untitled Campaign'}</h1>
          <p className="text-xs text-navy/40 mt-1">
            Template: {campaign.email_templates?.name || '--'} &middot; Sent {formatDateTime(campaign.sent_at)}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon size={13} className={stat.iconColor} />
              </div>
              <span className="text-[10px] font-semibold text-navy/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-serif text-navy">
              {stat.value}
              {stat.suffix && (
                <span className="text-xs text-navy/35 ml-1">({stat.suffix})</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Individual sends */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-cream-dark">
          <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Individual Sends</h3>
        </div>
        {sends.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-3">
              <Mail size={20} className="text-navy/25" />
            </div>
            <p className="text-sm text-navy/40">No send records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/30">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-navy/40 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-navy/40 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-navy/40 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-navy/40 uppercase tracking-wider">Sent At</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-navy/40 uppercase tracking-wider">Opened</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((send) => (
                  <tr key={send.id} className="border-b border-cream-dark/30 table-row-hover">
                    <td className="px-5 py-2.5 text-sm text-navy font-medium">
                      {send.contacts
                        ? `${send.contacts.first_name || ''} ${send.contacts.last_name || ''}`.trim() || '--'
                        : '--'}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-navy/50">{send.contacts?.email || '--'}</td>
                    <td className="px-5 py-2.5">
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
                    <td className="px-5 py-2.5 text-xs text-navy/40">{formatDateTime(send.sent_at)}</td>
                    <td className="px-5 py-2.5 text-xs text-navy/40">{send.opened_at ? formatDateTime(send.opened_at) : '--'}</td>
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
