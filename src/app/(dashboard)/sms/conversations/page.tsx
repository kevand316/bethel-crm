'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { formatDateTime, getInitials } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { MessageSquare, Send, FileText } from 'lucide-react';

interface ConversationPreview {
  contact_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  last_message: string | null;
  last_message_at: string;
  direction: string;
  unread_count: number;
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="skeleton w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <div className="skeleton w-28 h-4" />
          <div className="skeleton w-16 h-3" />
        </div>
        <div className="skeleton w-48 h-3" />
      </div>
    </div>
  );
}

export default function SmsConversationsPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    const { data: messages } = await supabase
      .from('sms_messages')
      .select('contact_id, body, direction, created_at, contacts(first_name, last_name, phone)')
      .order('created_at', { ascending: false });

    if (messages) {
      const contactMap = new Map<string, ConversationPreview>();

      for (const msg of messages) {
        if (!msg.contact_id) continue;
        if (!contactMap.has(msg.contact_id)) {
          const contact = msg.contacts as unknown as { first_name: string | null; last_name: string | null; phone: string | null } | null;
          contactMap.set(msg.contact_id, {
            contact_id: msg.contact_id,
            first_name: contact?.first_name || null,
            last_name: contact?.last_name || null,
            phone: contact?.phone || null,
            last_message: msg.body,
            last_message_at: msg.created_at,
            direction: msg.direction,
            unread_count: 0,
          });
        }
      }

      setConversations(Array.from(contactMap.values()));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">SMS Conversations</h1>
          </div>
          <p className="text-sm text-navy/50">View and manage SMS threads with contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sms/templates">
            <Button variant="outline" size="sm">
              <FileText size={14} />
              Templates
            </Button>
          </Link>
          <Link href="/sms/broadcast">
            <Button size="sm">
              <Send size={14} />
              Broadcast
            </Button>
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-cream-dark/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-navy/25" />
            </div>
            <h3 className="text-base font-serif text-navy mb-1">No conversations yet</h3>
            <p className="text-sm text-navy/40 mb-4">Send an SMS to a contact or receive an inbound message to start a conversation.</p>
            <Link href="/sms/broadcast">
              <Button size="sm">
                <Send size={14} />
                Send Broadcast
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-cream-dark/50">
            {conversations.map((conv) => (
              <Link
                key={conv.contact_id}
                href={`/sms/conversations/${conv.contact_id}`}
                className="flex items-center gap-3 p-4 table-row-hover group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center text-xs font-semibold text-navy/60 shrink-0 ring-1 ring-navy/5">
                  {getInitials(conv.first_name, conv.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-navy text-sm group-hover:text-gold-dark transition-colors">
                      {conv.first_name} {conv.last_name}
                    </h3>
                    <span className="text-[10px] text-navy/35 ml-2 shrink-0">
                      {formatDateTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-navy/50 truncate mt-0.5">
                    {conv.direction === 'outbound' && (
                      <span className="text-navy/35">You: </span>
                    )}
                    {conv.last_message || '(empty)'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
