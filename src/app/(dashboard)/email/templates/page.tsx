'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { EmailTemplate } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { FileText, Plus, Trash2, Edit2, Mail } from 'lucide-react';

function TemplateSkeleton() {
  return (
    <div className="flex items-center justify-between p-5">
      <div className="flex-1">
        <div className="skeleton w-40 h-4 mb-2" />
        <div className="skeleton w-64 h-3" />
      </div>
      <div className="flex items-center gap-2">
        <div className="skeleton w-16 h-8 rounded-lg" />
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

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
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">Email Templates</h1>
          </div>
          <p className="text-sm text-navy/50">Create and manage reusable email templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/email/campaigns">
            <Button variant="outline" size="sm">
              <Mail size={14} />
              Campaigns
            </Button>
          </Link>
          <Link href="/email/templates/new">
            <Button size="sm">
              <Plus size={14} />
              New Template
            </Button>
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-cream-dark/50">
            {[1, 2, 3, 4].map((i) => (
              <TemplateSkeleton key={i} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-navy/25" />
            </div>
            <h3 className="text-base font-serif text-navy mb-1">No email templates</h3>
            <p className="text-sm text-navy/40 mb-4">Create your first email template to start sending broadcasts.</p>
            <Link href="/email/templates/new">
              <Button size="sm">
                <Plus size={14} />
                New Template
              </Button>
            </Link>
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
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-navy text-sm group-hover:text-gold-dark transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-navy/45 mt-0.5 truncate">
                        Subject: {template.subject || '(no subject)'} &middot; Created {formatDate(template.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/email/templates/${template.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit2 size={13} />
                      Edit
                    </Button>
                  </Link>
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
    </div>
  );
}
