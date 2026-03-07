'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ActivityLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import {
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Clock,
  Send,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

interface Stats {
  totalContacts: number;
  activeContacts: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsBounced: number;
  totalSmsSent: number;
  totalSmsReceived: number;
  contactsThisMonth: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    activeContacts: 0,
    totalEmailsSent: 0,
    totalEmailsOpened: 0,
    totalEmailsBounced: 0,
    totalSmsSent: 0,
    totalSmsReceived: 0,
    contactsThisMonth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      contactsRes,
      activeRes,
      monthRes,
      emailSendsRes,
      emailOpenedRes,
      emailBouncedRes,
      smsSentRes,
      smsReceivedRes,
    ] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('email_sends').select('id', { count: 'exact', head: true }),
      supabase.from('email_sends').select('id', { count: 'exact', head: true }).eq('status', 'opened'),
      supabase.from('email_sends').select('id', { count: 'exact', head: true }).eq('status', 'bounced'),
      supabase.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'outbound'),
      supabase.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound'),
    ]);

    setStats({
      totalContacts: contactsRes.count || 0,
      activeContacts: activeRes.count || 0,
      totalEmailsSent: emailSendsRes.count || 0,
      totalEmailsOpened: emailOpenedRes.count || 0,
      totalEmailsBounced: emailBouncedRes.count || 0,
      totalSmsSent: smsSentRes.count || 0,
      totalSmsReceived: smsReceivedRes.count || 0,
      contactsThisMonth: monthRes.count || 0,
    });
  }, [supabase]);

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    setRecentActivity(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStats();
    fetchActivity();
  }, [fetchStats, fetchActivity]);

  const emailOpenRate = stats.totalEmailsSent > 0
    ? Math.round((stats.totalEmailsOpened / stats.totalEmailsSent) * 100)
    : 0;
  const emailBounceRate = stats.totalEmailsSent > 0
    ? Math.round((stats.totalEmailsBounced / stats.totalEmailsSent) * 100)
    : 0;

  const activityIcon = (type: string | null) => {
    switch (type) {
      case 'email_sent':
      case 'email_opened':
        return <Mail size={14} className="text-blue-500" />;
      case 'email_bounced':
        return <AlertTriangle size={14} className="text-red-500" />;
      case 'sms_sent':
      case 'sms_received':
        return <MessageSquare size={14} className="text-green-500" />;
      case 'contact_created':
        return <UserPlus size={14} className="text-gold" />;
      default:
        return <Clock size={14} className="text-navy/40" />;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-navy/40">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-navy">Dashboard</h1>
        <p className="text-sm text-navy/60 mt-1">Welcome to Bethel CRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/contacts"
          className="bg-white rounded-xl border border-cream-dark p-4 hover:border-gold/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-navy/5 flex items-center justify-center">
              <Users size={18} className="text-navy/60" />
            </div>
            <ArrowRight size={14} className="text-navy/20 group-hover:text-gold transition-colors" />
          </div>
          <p className="text-2xl font-serif text-navy">{stats.totalContacts}</p>
          <p className="text-xs text-navy/50 mt-0.5">
            Total Contacts
            {stats.contactsThisMonth > 0 && (
              <span className="text-green-600 ml-1">+{stats.contactsThisMonth} this month</span>
            )}
          </p>
        </Link>

        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-serif text-navy">{stats.activeContacts}</p>
          <p className="text-xs text-navy/50 mt-0.5">Active Contacts</p>
        </div>

        <Link
          href="/email/campaigns"
          className="bg-white rounded-xl border border-cream-dark p-4 hover:border-gold/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail size={18} className="text-blue-600" />
            </div>
            <ArrowRight size={14} className="text-navy/20 group-hover:text-gold transition-colors" />
          </div>
          <p className="text-2xl font-serif text-navy">{stats.totalEmailsSent}</p>
          <p className="text-xs text-navy/50 mt-0.5">
            Emails Sent
            {stats.totalEmailsSent > 0 && (
              <span className="ml-1">&middot; {emailOpenRate}% open rate</span>
            )}
          </p>
        </Link>

        <Link
          href="/sms/conversations"
          className="bg-white rounded-xl border border-cream-dark p-4 hover:border-gold/50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <MessageSquare size={18} className="text-purple-600" />
            </div>
            <ArrowRight size={14} className="text-navy/20 group-hover:text-gold transition-colors" />
          </div>
          <p className="text-2xl font-serif text-navy">{stats.totalSmsSent + stats.totalSmsReceived}</p>
          <p className="text-xs text-navy/50 mt-0.5">
            SMS Messages ({stats.totalSmsSent} sent, {stats.totalSmsReceived} received)
          </p>
        </Link>
      </div>

      {/* Email Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send size={14} className="text-navy/40" />
            <span className="text-xs text-navy/50">Total Sent</span>
          </div>
          <p className="text-xl font-serif text-navy">{stats.totalEmailsSent}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={14} className="text-blue-500" />
            <span className="text-xs text-navy/50">Open Rate</span>
          </div>
          <p className="text-xl font-serif text-navy">{emailOpenRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-dark p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-xs text-navy/50">Bounce Rate</span>
          </div>
          <p className="text-xl font-serif text-navy">{emailBounceRate}%</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-cream-dark">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-dark">
          <h2 className="text-sm font-medium text-navy">Recent Activity</h2>
          <Badge variant="gray">{recentActivity.length} events</Badge>
        </div>
        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-navy/40 text-sm">No activity yet</div>
        ) : (
          <div className="divide-y divide-cream-dark/50">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">
                  {activityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy">{activity.description}</p>
                  <p className="text-xs text-navy/40 mt-0.5">
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
