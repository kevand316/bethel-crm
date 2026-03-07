'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContactModal({ open, onClose, onSuccess }: AddContactModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { data: contact, error } = await supabase.from('contacts').insert({
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      tags,
      source: 'manual',
      status: 'active',
    }).select('id').single();

    if (!error && contact) {
      await supabase.from('activity_log').insert({
        contact_id: contact.id,
        type: 'contact_created',
        description: 'Manually added contact',
      });
      setForm({ first_name: '', last_name: '', email: '', phone: '', tags: '' });
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Contact">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              First Name
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              placeholder="Smith"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
            Tags
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            placeholder="resident, vip (comma-separated)"
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-cream-dark">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            <UserPlus size={13} />
            Add Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}
