'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Contact, ActivityLog, EmailSend, SmsMessage } from '@/types';
import { formatDateTime, formatPhone, getInitials } from '@/lib/utils';
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
} from 'lucide-react';
import Link from 'next/link';

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
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
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
    await supabase
      .from('contacts')
      .update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        status: editForm.status,
      })
      .eq('id', contactId);

    await supabase.from('activity_log').insert({
      contact_id: contactId,
      type: 'contact_updated',
      description: 'Contact information updated',
    });

    setEditing(false);
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

  if (loading || !contact) {
    return <div className="text-center py-12 text-navy/40">Loading contact...</div>;
  }

  // Build unified timeline
  const timeline = [
    ...activities.map((a) => ({
      id: a.id,
      type: a.type || 'activity',
      description: a.description || '',
      date: a.created_at,
      icon: 'activity' as const,
    })),
    ...emailSends.map((e) => ({
      id: e.id,
      type: 'email_sent',
      description: `Email ${e.status}${(e as unknown as { email_campaigns?: { name: string } }).email_campaigns?.name ? ` — ${(e as unknown as { email_campaigns: { name: string } }).email_campaigns.name}` : ''}`,
      date: e.sent_at,
      icon: 'email' as const,
    })),
    ...smsMessages.map((s) => ({
      id: s.id,
      type: s.direction === 'inbound' ? 'sms_received' : 'sms_sent',
      description: `${s.direction === 'inbound' ? 'Received' : 'Sent'} SMS: "${(s.body || '').slice(0, 80)}${(s.body || '').length > 80 ? '...' : ''}"`,
      date: s.created_at,
      icon: 'sms' as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-navy transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Contacts
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center text-xl font-medium text-navy">
              {getInitials(contact.first_name, contact.last_name)}
            </div>
            <div>
              <h1 className="text-2xl font-serif text-navy">
                {contact.first_name} {contact.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-navy/60">
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {formatPhone(contact.phone)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Edit2 size={14} />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Link href={`/sms/conversations/${contactId}`}>
              <Button variant="outline" size="sm">
                <MessageSquare size={14} />
                SMS
              </Button>
            </Link>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact Info Card */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="text-sm font-medium text-navy/60 mb-3">Contact Information</h3>
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="First name"
                  className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Last name"
                  className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Phone"
                  className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
                <Button size="sm" onClick={handleSave}>Save Changes</Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-navy/60">Status</span>
                  <Badge
                    variant={
                      contact.status === 'active'
                        ? 'green'
                        : contact.status === 'bounced'
                        ? 'red'
                        : 'gray'
                    }
                  >
                    {contact.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/60">Source</span>
                  <span className="capitalize">{contact.source?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/60">Added</span>
                  <span>{formatDateTime(contact.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy/60">Updated</span>
                  <span>{formatDateTime(contact.updated_at)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tags Card */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="text-sm font-medium text-navy/60 mb-3 flex items-center gap-1">
              <Tag size={14} /> Tags
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                contact.tags.map((tag) => (
                  <Badge key={tag} variant="gold" removable onRemove={() => handleRemoveTag(tag)}>
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-navy/40">No tags</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <Button size="sm" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="text-sm font-medium text-navy/60 mb-4">Activity Timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-navy/40 text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-0.5">
                      {item.icon === 'email' ? (
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                          <Send size={13} className="text-blue-600" />
                        </div>
                      ) : item.icon === 'sms' ? (
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                          <MessageSquare size={13} className="text-green-600" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center">
                          <Clock size={13} className="text-navy/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy">{item.description}</p>
                      <p className="text-xs text-navy/40 mt-0.5">
                        {formatDateTime(item.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
