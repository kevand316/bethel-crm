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
  BarChart3,
  Zap,
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

function StatSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-4 h-4 rounded" />
      </div>
      <div className="skeleton w-16 h-7 mb-1.5" />
      <div className="skeleton w-24 h-3" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="skeleton w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1">
        <div className="skeleton w-3/4 h-4 mb-2" />
        <div className="skeleton w-24 h-3" />
      </div>
    </div>
  );
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
    try {
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
    } catch {
      // Keep default zero values on error — dashboard still renders
    }
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
        return (
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <Mail size={14} className="text-blue-500" />
          </div>
        );
      case 'email_bounced':
        return (
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={14} className="text-red-500" />
          </div>
        );
      case 'sms_sent':
      case 'sms_received':
        return (
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
            <MessageSquare size={14} className="text-green-500" />
          </div>
        );
      case 'contact_created':
        return (
          <div className="w-8 h-8 rounded-full bg-gold-50 flex items-center justify-center">
            <UserPlus size={14} className="text-gold-dark" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center">
            <Clock size={14} className="text-navy/40" />
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-gold" />
          <h1 className="text-2xl font-serif text-navy">Dashboard</h1>
        </div>
        <p className="text-sm text-navy/50">Welcome to Bethel CRM — here&apos;s your overview.</p>
      </div>

      {loading ? (
        <>
          {/* Skeleton Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8 stagger-children">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
          <div className="card">
            <div className="px-5 py-4 border-b border-cream-dark">
              <div className="skeleton w-32 h-4" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
            <Link
              href="/contacts"
              className="card-interactive p-5 animate-fade-in-up group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                  <Users size={18} className="text-navy/60" />
                </div>
                <ArrowRight size={14} className="text-navy/15 group-hover:text-gold transition-colors" />
              </div>
              <p className="text-2xl font-serif text-navy">{stats.totalContacts.toLocaleString()}</p>
              <p className="text-xs text-navy/50 mt-1">
                Total Contacts
                {stats.contactsThisMonth > 0 && (
                  <span className="text-green-600 ml-1.5 font-medium">+{stats.contactsThisMonth} this month</span>
                )}
              </p>
            </Link>

            <div className="card p-5 animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-serif text-navy">{stats.activeContacts.toLocaleString()}</p>
              <p className="text-xs text-navy/50 mt-1">Active Contacts</p>
            </div>

            <Link
              href="/email/campaigns"
              className="card-interactive p-5 animate-fade-in-up group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <ArrowRight size={14} className="text-navy/15 group-hover:text-gold transition-colors" />
              </div>
              <p className="text-2xl font-serif text-navy">{stats.totalEmailsSent.toLocaleString()}</p>
              <p className="text-xs text-navy/50 mt-1">
                Emails Sent
                {stats.totalEmailsSent > 0 && (
                  <span className="ml-1.5">&middot; {emailOpenRate}% opened</span>
                )}
              </p>
            </Link>

            <Link
              href="/sms/conversations"
              className="card-interactive p-5 animate-fade-in-up group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <MessageSquare size={18} className="text-purple-600" />
                </div>
                <ArrowRight size={14} className="text-navy/15 group-hover:text-gold transition-colors" />
              </div>
              <p className="text-2xl font-serif text-navy">{(stats.totalSmsSent + stats.totalSmsReceived).toLocaleString()}</p>
              <p className="text-xs text-navy/50 mt-1">
                SMS Messages
              </p>
            </Link>
          </div>

          {/* Email Performance Row */}
          <div className="grid grid-cols-3 gap-4 mb-6 stagger-children">
            <div className="card p-5 animate-fade-in-up">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-navy-50 flex items-center justify-center">
                  <Send size={13} className="text-navy/50" />
                </div>
                <span className="text-xs font-medium text-navy/50 uppercase tracking-wider">Sent</span>
              </div>
              <p className="text-xl font-serif text-navy">{stats.totalEmailsSent.toLocaleString()}</p>
            </div>
            <div className="card p-5 animate-fade-in-up">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 size={13} className="text-blue-500" />
                </div>
                <span className="text-xs font-medium text-navy/50 uppercase tracking-wider">Open Rate</span>
              </div>
              <p className="text-xl font-serif text-navy">{emailOpenRate}%</p>
              {stats.totalEmailsSent > 0 && (
                <div className="progress-bar mt-2">
                  <div className="progress-bar-fill" style={{ width: `${emailOpenRate}%` }} />
                </div>
              )}
            </div>
            <div className="card p-5 animate-fade-in-up">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={13} className="text-red-500" />
                </div>
                <span className="text-xs font-medium text-navy/50 uppercase tracking-wider">Bounce Rate</span>
              </div>
              <p className="text-xl font-serif text-navy">{emailBounceRate}%</p>
              {stats.totalEmailsSent > 0 && (
                <div className="progress-bar mt-2">
                  <div
                    className="h-full rounded-[3px] transition-all duration-400"
                    style={{
                      width: `${emailBounceRate}%`,
                      background: emailBounceRate > 5 ? '#ef4444' : '#22c55e',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-navy/40" />
                <h2 className="text-sm font-semibold text-navy">Recent Activity</h2>
              </div>
              <Badge variant="gray">{recentActivity.length} events</Badge>
            </div>
            {recentActivity.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-navy/30" />
                </div>
                <p className="text-sm text-navy/40">No activity yet</p>
                <p className="text-xs text-navy/25 mt-1">Activity will appear here as you use the CRM</p>
              </div>
            ) : (
              <div className="divide-y divide-cream-dark/50">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 px-5 py-3.5 table-row-hover">
                    <div className="mt-0.5 shrink-0">
                      {activityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy leading-snug">{activity.description}</p>
                      <p className="text-xs text-navy/35 mt-1">
                        {formatDateTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
