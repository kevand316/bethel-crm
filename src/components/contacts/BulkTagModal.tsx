'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Tag } from 'lucide-react';

interface BulkTagModalProps {
  open: boolean;
  onClose: () => void;
  contactIds: string[];
  onSuccess: () => void;
}

export default function BulkTagModal({ open, onClose, contactIds, onSuccess }: BulkTagModalProps) {
  const supabase = createClient();
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) return;

    setLoading(true);

    for (const id of contactIds) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('tags')
        .eq('id', id)
        .single();

      if (contact) {
        const currentTags = Array.isArray(contact.tags) ? contact.tags : [];
        if (!currentTags.includes(tag.trim())) {
          await supabase
            .from('contacts')
            .update({ tags: [...currentTags, tag.trim()] })
            .eq('id', id);
        }
      }
    }

    setTag('');
    setLoading(false);
    onSuccess();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Tag ${contactIds.length} Contacts`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-cream/50 rounded-xl">
          <Tag size={14} className="text-gold" />
          <p className="text-xs text-navy/60">
            Add a tag to <strong className="text-navy">{contactIds.length}</strong> selected contact{contactIds.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
            Tag Name
          </label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            placeholder="e.g., vip, follow-up"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-cream-dark">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={loading}>
            <Tag size={13} />
            Apply Tag
          </Button>
        </div>
      </form>
    </Modal>
  );
}
