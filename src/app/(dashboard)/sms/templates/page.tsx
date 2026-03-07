'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SmsTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { MessageSquare, Plus, Trash2, Edit2 } from 'lucide-react';

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

  const handleSave = async () => {
    if (!form.name.trim()) return;
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
        org_id: 1,
      });
    }

    setSaving(false);
    setShowModal(false);
    setForm({ name: '', body: '' });
    setEditingId(null);
    fetchTemplates();
  };

  const handleEdit = (template: SmsTemplate) => {
    setEditingId(template.id);
    setForm({ name: template.name, body: template.body || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('sms_templates').delete().eq('id', id);
    fetchTemplates();
  };

  const charCount = form.body.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">SMS Templates</h1>
          <p className="text-sm text-navy/60 mt-1">Create reusable SMS message templates</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', body: '' });
            setShowModal(true);
          }}
        >
          <Plus size={14} />
          New Template
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy/40">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No SMS templates"
            description="Create your first SMS template to speed up messaging."
            action={
              <Button size="sm" onClick={() => setShowModal(true)}>
                <Plus size={14} />
                New Template
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-cream-dark">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-start justify-between p-4 hover:bg-cream/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-navy">{template.name}</h3>
                  <p className="text-sm text-navy/60 mt-1 truncate">
                    {template.body || '(empty)'}
                  </p>
                  <p className="text-xs text-navy/40 mt-1">
                    Created {formatDate(template.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            <label className="block text-sm font-medium text-navy mb-1">Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Welcome SMS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              placeholder="Hi {{first_name}}, welcome to Bethel Residency!"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex gap-1">
                {['first_name', 'last_name'].map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, body: form.body + `{{${field}}}` })
                    }
                    className="px-2 py-0.5 text-xs bg-gold/10 text-gold-dark rounded hover:bg-gold/20 transition-colors"
                  >
                    {`{{${field}}}`}
                  </button>
                ))}
              </div>
              <span className="text-xs text-navy/40">
                {charCount} chars &middot; {smsSegments} segment{smsSegments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
