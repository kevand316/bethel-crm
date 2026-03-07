'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

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

    // Get current tags for each contact, then add the new tag
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
        <p className="text-sm text-navy/60">
          Add a tag to {contactIds.length} selected contact{contactIds.length !== 1 ? 's' : ''}.
        </p>
        <div>
          <label className="block text-sm font-medium text-navy mb-1">Tag Name</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="e.g., vip, follow-up"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Apply Tag</Button>
        </div>
      </form>
    </Modal>
  );
}
