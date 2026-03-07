'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { EmailTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { FileText, Plus, Trash2, Edit2 } from 'lucide-react';

export default function EmailTemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('email_templates').delete().eq('id', id);
    fetchTemplates();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">Email Templates</h1>
          <p className="text-sm text-navy/60 mt-1">Create and manage email templates</p>
        </div>
        <Link href="/email/templates/new">
          <Button size="sm">
            <Plus size={14} />
            New Template
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy/40">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No email templates"
            description="Create your first email template to start sending broadcasts."
            action={
              <Link href="/email/templates/new">
                <Button size="sm">
                  <Plus size={14} />
                  New Template
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-cream-dark">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 hover:bg-cream/30 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-navy">{template.name}</h3>
                  <p className="text-sm text-navy/60 mt-0.5">
                    Subject: {template.subject || '(no subject)'} &middot; Created {formatDate(template.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/email/templates/${template.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit2 size={14} />
                      Edit
                    </Button>
                  </Link>
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
    </div>
  );
}
