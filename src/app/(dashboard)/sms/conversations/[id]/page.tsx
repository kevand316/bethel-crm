'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Contact, SmsMessage, SmsTemplate } from '@/types';
import { formatDateTime, formatPhone, getInitials } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { ArrowLeft, Send, FileText, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';

function MessageSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <div className="flex justify-start"><div className="skeleton w-48 h-10 rounded-2xl rounded-bl-md" /></div>
      <div className="flex justify-end"><div className="skeleton w-56 h-10 rounded-2xl rounded-br-md" /></div>
      <div className="flex justify-start"><div className="skeleton w-40 h-10 rounded-2xl rounded-bl-md" /></div>
      <div className="flex justify-end"><div className="skeleton w-64 h-10 rounded-2xl rounded-br-md" /></div>
    </div>
  );
}

export default function SmsConversationPage() {
  const params = useParams();
  const supabase = createClient();
  const contactId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const fetchContact = useCallback(async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    setContact(data);
  }, [contactId, supabase]);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, [contactId, supabase]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('sms_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchContact();
    fetchMessages();
    fetchTemplates();
  }, [fetchContact, fetchMessages, fetchTemplates]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('sms-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SmsMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, supabase]);

  const handleSend = async () => {
    if (!newMessage.trim() || !contact?.phone) return;
    setSending(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          to: contact.phone,
          body: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }

    setSending(false);
  };

  const applyTemplate = (template: SmsTemplate) => {
    let body = template.body || '';
    if (contact) {
      body = body
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
        .replace(/\{\{email\}\}/g, contact.email || '')
        .replace(/\{\{phone\}\}/g, contact.phone || '');
    }
    setNewMessage(body);
    setShowTemplates(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-cream-dark">
        <Link
          href="/sms/conversations"
          className="p-1.5 rounded-lg hover:bg-cream-dark transition-colors text-navy/50 hover:text-navy"
        >
          <ArrowLeft size={18} />
        </Link>
        {contact ? (
          <>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center text-xs font-semibold text-navy/60 ring-1 ring-navy/5">
              {getInitials(contact.first_name, contact.last_name)}
            </div>
            <div>
              <h2 className="font-medium text-navy text-sm">
                {contact.first_name} {contact.last_name}
              </h2>
              <p className="text-xs text-navy/40">{formatPhone(contact.phone)}</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div>
              <div className="skeleton w-24 h-4 mb-1" />
              <div className="skeleton w-20 h-3" />
            </div>
          </div>
        )}
        <div className="ml-auto">
          <Link href={`/contacts/${contactId}`}>
            <Button variant="outline" size="sm">
              <User size={13} />
              View Contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2 px-2">
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-navy/25" />
            </div>
            <p className="text-sm text-navy/40 mb-1">No messages yet</p>
            <p className="text-xs text-navy/30">Send the first message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOutbound = msg.direction === 'outbound';
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showTimestamp = !prevMsg ||
              new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000; // 5 min gap

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="text-center my-3">
                    <span className="text-[10px] text-navy/30 bg-cream px-2 py-0.5 rounded-full">
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isOutbound
                        ? 'bg-navy text-white rounded-br-md'
                        : 'bg-white border border-cream-dark text-navy rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    {msg.status && msg.status !== 'delivered' && msg.status !== 'received' && (
                      <p className={`text-[10px] mt-1 ${isOutbound ? 'text-white/40' : 'text-navy/30'}`}>
                        {msg.status}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Template selector */}
      {showTemplates && (
        <div className="card p-3 mb-2 max-h-48 overflow-y-auto animate-fade-in">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">Select a template</p>
          {templates.length === 0 ? (
            <p className="text-xs text-navy/40 py-2">No templates available. <Link href="/sms/templates" className="text-gold-dark hover:underline">Create one</Link></p>
          ) : (
            <div className="space-y-0.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream transition-colors"
                >
                  <p className="text-sm font-medium text-navy">{t.name}</p>
                  <p className="text-xs text-navy/40 truncate">{t.body}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-3 border-t border-cream-dark">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={`p-2.5 rounded-xl transition-all shrink-0 ${
            showTemplates
              ? 'bg-gold/10 text-gold-dark'
              : 'hover:bg-cream-dark text-navy/40 hover:text-navy'
          }`}
          title="Use template"
        >
          <FileText size={18} />
        </button>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={contact?.phone ? 'Type a message...' : 'Contact has no phone number'}
          disabled={!contact?.phone}
          rows={1}
          className="flex-1 px-4 py-2.5 border border-cream-dark rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none disabled:opacity-50 transition-all placeholder-navy/30"
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending || !contact?.phone}
          loading={sending}
          className="shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
