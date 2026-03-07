'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Contact, ActivityLog, EmailSend, SmsMessage } from '@/types';
import { formatDateTime, formatPhone, getInitials, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  ArrowLeft,
  Mail,
  Phone,
  Tag,
  Edit2,
  Trash2,
  MessageSquare,
  Send,
  Clock,
  Save,
  X,
  UserPlus,
  AlertTriangle,
  Calendar,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

function DetailSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton w-24 h-4 mb-6" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="skeleton w-16 h-16 rounded-2xl" />
              <div>
                <div className="skeleton w-48 h-6 mb-2" />
                <div className="skeleton w-32 h-4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="skeleton w-16 h-3 mb-2" />
                  <div className="skeleton w-40 h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="skeleton w-24 h-4 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 mb-4">
              <div className="skeleton w-7 h-7 rounded-full" />
              <div className="flex-1">
                <div className="skeleton w-full h-3 mb-1" />
                <div className="skeleton w-20 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [emailSends, setEmailSends] = useState<EmailSend[]>([]);
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    tags: '',
  });
  const [newTag, setNewTag] = useState('');

  const fetchContact = useCallback(async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (data) {
      setContact(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        status: data.status,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });
    }
  }, [contactId, supabase]);

  const fetchTimeline = useCallback(async () => {
    const [actRes, emailRes, smsRes] = await Promise.all([
      supabase
        .from('activity_log')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('email_sends')
        .select('*, email_campaigns(name)')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: false })
        .limit(20),
      supabase
        .from('sms_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setActivities(actRes.data || []);
    setEmailSends(emailRes.data || []);
    setSmsMessages(smsRes.data || []);
    setLoading(false);
  }, [contactId, supabase]);

  useEffect(() => {
    fetchContact();
    fetchTimeline();
  }, [fetchContact, fetchTimeline]);

  const handleSave = async () => {
    setSaving(true);
    const tags = editForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await supabase
      .from('contacts')
      .update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        status: editForm.status,
        tags,
      })
      .eq('id', contactId);

    await supabase.from('activity_log').insert({
      contact_id: contactId,
      type: 'contact_updated',
      description: 'Contact information updated',
    });

    setEditing(false);
    setSaving(false);
    fetchContact();
    fetchTimeline();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact? This cannot be undone.')) return;
    await supabase.from('contacts').delete().eq('id', contactId);
    router.push('/contacts');
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !contact) return;
    const currentTags = Array.isArray(contact.tags) ? contact.tags : [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    await supabase
      .from('contacts')
      .update({ tags: [...currentTags, newTag.trim()] })
      .eq('id', contactId);
    setNewTag('');
    fetchContact();
  };

  const handleRemoveTag = async (tag: string) => {
    if (!contact) return;
    const currentTags = Array.isArray(contact.tags) ? contact.tags : [];
    await supabase
      .from('contacts')
      .update({ tags: currentTags.filter((t) => t !== tag) })
      .eq('id', contactId);
    fetchContact();
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case 'email_sent':
      case 'email_opened':
      case 'email':
        return <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Mail size={12} className="text-blue-500" /></div>;
      case 'email_bounced':
        return <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle size={12} className="text-red-500" /></div>;
      case 'sms_sent':
      case 'sms_received':
      case 'sms':
        return <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0"><MessageSquare size={12} className="text-green-500" /></div>;
      case 'contact_created':
      case 'contact_updated':
        return <div className="w-7 h-7 rounded-full bg-gold-50 flex items-center justify-center shrink-0"><UserPlus size={12} className="text-gold-dark" /></div>;
      default:
        return <div className="w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center shrink-0"><Clock size={12} className="text-navy/40" /></div>;
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!contact) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-serif text-navy mb-2">Contact not found</h2>
        <Link href="/contacts">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} />
            Back to Contacts
          </Button>
        </Link>
      </div>
    );
  }

  // Build unified timeline
  const timeline = [
    ...activities.map((a) => ({
      id: a.id,
      type: a.type || 'activity',
      description: a.description || '',
      date: a.created_at,
    })),
    ...emailSends.map((e) => ({
      id: e.id,
      type: 'email',
      description: `Email ${e.status}${(e as unknown as { email_campaigns?: { name: string } }).email_campaigns?.name ? ` — ${(e as unknown as { email_campaigns: { name: string } }).email_campaigns.name}` : ''}`,
      date: e.sent_at,
    })),
    ...smsMessages.map((s) => ({
      id: s.id,
      type: 'sms',
      description: `${s.direction === 'inbound' ? 'Received' : 'Sent'} SMS: "${(s.body || '').slice(0, 80)}${(s.body || '').length > 80 ? '...' : ''}"`,
      date: s.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="animate-fade-in">
      {/* Back Link */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-navy/50 hover:text-navy transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back to Contacts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center text-lg font-serif text-navy/60 ring-1 ring-navy/5">
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
                <div>
                  <h1 className="text-xl font-serif text-navy">
                    {contact.first_name} {contact.last_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        contact.status === 'active' ? 'green'
                          : contact.status === 'unsubscribed' ? 'gray'
                          : contact.status === 'bounced' ? 'red'
                          : 'gray'
                      }
                    >
                      {contact.status}
                    </Badge>
                    {contact.source && (
                      <span className="text-xs text-navy/40 flex items-center gap-1">
                        <Globe size={10} />
                        {contact.source.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Edit2 size={13} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X size={13} />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} loading={saving}>
                      <Save size={13} />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Tags</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="resident, vip (comma-separated)"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                  <div>
                    <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-1.5">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-navy/30" />
                      <p className="text-sm text-navy">{contact.email || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-1.5">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-navy/30" />
                      <p className="text-sm text-navy">{formatPhone(contact.phone) || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-1.5">Added</p>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-navy/30" />
                      <p className="text-sm text-navy">{formatDate(contact.created_at)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-1.5">Source</p>
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-navy/30" />
                      <p className="text-sm text-navy capitalize">{contact.source?.replace('_', ' ') || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                      contact.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gold/10 text-gold-dark group"
                        >
                          <Tag size={10} />
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-navy/30">No tags</span>
                    )}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add tag..."
                        className="w-24 px-2 py-1 text-xs border border-dashed border-cream-dark rounded-full bg-transparent focus:outline-none focus:border-gold placeholder-navy/25 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-cream-dark flex items-center gap-2">
                  {contact.email && (
                    <Link href="/email/campaigns/new">
                      <Button variant="outline" size="sm">
                        <Mail size={13} />
                        Send Email
                      </Button>
                    </Link>
                  )}
                  {contact.phone && (
                    <Link href={`/sms/conversations/${contactId}`}>
                      <Button variant="outline" size="sm">
                        <Send size={13} />
                        Send SMS
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Sidebar */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-dark bg-cream/30">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-navy/40" />
              <h2 className="text-sm font-semibold text-navy">Activity Timeline</h2>
            </div>
          </div>
          {timeline.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-3">
                <Clock size={16} className="text-navy/25" />
              </div>
              <p className="text-xs text-navy/40">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-cream-dark/50 max-h-[600px] overflow-y-auto">
              {timeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 px-5 py-3 table-row-hover">
                  <div className="mt-0.5">{activityIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-navy leading-relaxed">{item.description}</p>
                    <p className="text-[10px] text-navy/30 mt-0.5">{formatDateTime(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
