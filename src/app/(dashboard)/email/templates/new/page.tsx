'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import EmailEditor from '@/components/email/EmailEditor';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

export default function NewEmailTemplatePage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert('Template name is required');
    setLoading(true);

    const { error } = await supabase.from('email_templates').insert({
      name: name.trim(),
      subject: subject.trim() || null,
      html_body: htmlBody,
      org_id: 1,
    });

    if (!error) {
      router.push('/email/templates');
    }
    setLoading(false);
  };

  return (
    <div>
      <Link
        href="/email/templates"
        className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Back to Templates
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-navy">New Email Template</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye size={14} />
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave} loading={loading}>
            Save Template
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <div className="max-w-xl mx-auto">
            <p className="text-sm text-navy/60 mb-2">Subject: {subject || '(no subject)'}</p>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlBody || '<p class="text-navy/40">No content yet</p>' }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="e.g., Welcome Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="e.g., Welcome to Bethel Residency, {{first_name}}!"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1">Email Body</label>
            <EmailEditor
              content={htmlBody}
              onChange={setHtmlBody}
              placeholder="Write your email content here. Use {{first_name}}, {{last_name}}, etc. for personalization."
            />
          </div>
        </div>
      )}
    </div>
  );
}
