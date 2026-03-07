'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Button from '@/components/ui/Button';
import EmailEditor from '@/components/email/EmailEditor';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

export default function EditEmailTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const templateId = params.id as string;

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const fetchTemplate = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (data) {
      setName(data.name);
      setSubject(data.subject || '');
      setHtmlBody(data.html_body || '');
    }
    setFetching(false);
  }, [templateId, supabase]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async () => {
    if (!name.trim()) return alert('Template name is required');
    setLoading(true);

    await supabase
      .from('email_templates')
      .update({
        name: name.trim(),
        subject: subject.trim() || null,
        html_body: htmlBody,
      })
      .eq('id', templateId);

    setLoading(false);
    router.push('/email/templates');
  };

  if (fetching) {
    return <div className="text-center py-12 text-navy/40">Loading template...</div>;
  }

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
        <h1 className="text-2xl font-serif text-navy">Edit Template</h1>
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
            Save Changes
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Email Body</label>
            <EmailEditor content={htmlBody} onChange={setHtmlBody} />
          </div>
        </div>
      )}
    </div>
  );
}
