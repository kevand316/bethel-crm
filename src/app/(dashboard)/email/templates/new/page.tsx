'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import EmailEditor from '@/components/email/EmailEditor';
import { ArrowLeft, Eye, Edit2, Save } from 'lucide-react';
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
    });

    if (!error) {
      router.push('/email/templates');
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <Link
        href="/email/templates"
        className="inline-flex items-center gap-1 text-xs text-navy/40 hover:text-navy transition-colors mb-4"
      >
        <ArrowLeft size={14} />
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
            {showPreview ? <Edit2 size={13} /> : <Eye size={13} />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave} loading={loading}>
            <Save size={13} />
            Save Template
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className="card p-8">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-cream-dark">
              <span className="text-xs font-semibold text-navy/40 uppercase tracking-wider">Subject:</span>
              <span className="text-sm text-navy">{subject || '(no subject)'}</span>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlBody || '<p class="text-navy/40">No content yet</p>' }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="e.g., Welcome Email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="e.g., Welcome to Bethel Residency, {{first_name}}!"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
              Email Body
            </label>
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
