'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { formatDateTime, getInitials } from '@/lib/utils';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
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

export default function SmsConversationsPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    // Get all contacts that have SMS messages
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">SMS Conversations</h1>
          <p className="text-sm text-navy/60 mt-1">View and manage SMS threads</p>
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

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy/40">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Send an SMS to a contact or receive an inbound message to start a conversation."
          />
        ) : (
          <div className="divide-y divide-cream-dark">
            {conversations.map((conv) => (
              <Link
                key={conv.contact_id}
                href={`/sms/conversations/${conv.contact_id}`}
                className="flex items-center gap-3 p-4 hover:bg-cream/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-sm font-medium text-navy shrink-0">
                  {getInitials(conv.first_name, conv.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-navy text-sm">
                      {conv.first_name} {conv.last_name}
                    </h3>
                    <span className="text-xs text-navy/40">
                      {formatDateTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-navy/60 truncate mt-0.5">
                    {conv.direction === 'outbound' && (
                      <span className="text-navy/40">You: </span>
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
