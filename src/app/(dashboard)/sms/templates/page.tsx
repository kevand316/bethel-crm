'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SmsTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { FileText, Plus, Trash2, Edit2, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';

export default function SmsTemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', body: '' });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('sms_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', body: '' });
    setShowModal(true);
  };

  const openEdit = (t: SmsTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, body: t.body || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase
        .from('sms_templates')
        .update({ name: form.name.trim(), body: form.body })
        .eq('id', editingId);
    } else {
      await supabase.from('sms_templates').insert({
        name: form.name.trim(),
        body: form.body,
      });
    }
    setSaving(false);
    setShowModal(false);
    setForm({ name: '', body: '' });
    setEditingId(null);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('sms_templates').delete().eq('id', id);
    fetchTemplates();
  };

  const charCount = form.body.length;
  const segments = Math.ceil(charCount / 160) || 1;
  const mergeFields = ['{{first_name}}', '{{last_name}}', '{{email}}'];

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">SMS Templates</h1>
          </div>
          <p className="text-sm text-navy/50">Create reusable message templates for SMS broadcasts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sms/conversations">
            <Button variant="outline" size="sm">
              <MessageSquare size={14} />
              Conversations
            </Button>
          </Link>
          <Link href="/sms/broadcast">
            <Button variant="outline" size="sm">
              <Send size={14} />
              Broadcast
            </Button>
          </Link>
          <Button size="sm" onClick={openNew}>
            <Plus size={14} />
            New Template
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-cream-dark/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-2 flex-1">
                  <div className="skeleton w-8 h-8 rounded-lg" />
                  <div>
                    <div className="skeleton w-32 h-4 mb-2" />
                    <div className="skeleton w-64 h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="skeleton w-16 h-8 rounded-lg" />
                  <div className="skeleton w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-navy/25" />
            </div>
            <h3 className="text-base font-serif text-navy mb-1">No SMS templates</h3>
            <p className="text-sm text-navy/40 mb-4">Create templates to speed up your SMS broadcasts.</p>
            <Button size="sm" onClick={openNew}>
              <Plus size={14} />
              New Template
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-cream-dark/50">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-5 table-row-hover group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                      <MessageSquare size={14} className="text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-navy text-sm group-hover:text-gold-dark transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-navy/40 mt-0.5 truncate max-w-md">
                        {template.body || '(empty)'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-[10px] text-navy/30">{formatDate(template.created_at)}</span>
                  <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                    <Edit2 size={13} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm({ name: '', body: '' });
        }}
        title={editingId ? 'Edit SMS Template' : 'New SMS Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              Template Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Welcome Message"
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              Message Body
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={5}
              placeholder="Hi {{first_name}}, welcome to Bethel Residency!"
              className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                {mergeFields.map((field) => (
                  <button
                    key={field}
                    onClick={() => setForm({ ...form, body: form.body + field })}
                    className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gold/10 text-gold-dark hover:bg-gold/20 transition-colors"
                  >
                    {field}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-navy/35">
                {charCount} chars &middot; {segments} segment{segments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {editingId ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
