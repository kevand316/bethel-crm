'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Button from '@/components/ui/Button';
import { Tag, Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import Link from 'next/link';

interface TagInfo {
  name: string;
  count: number;
}

export default function TagsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('tags');
    if (data) {
      const countMap: Record<string, number> = {};
      data.forEach((c) => {
        if (Array.isArray(c.tags)) {
          c.tags.forEach((t: string) => {
            countMap[t] = (countMap[t] || 0) + 1;
          });
        }
      });
      setTags(
        Object.entries(countMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleRename = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingTag(null);
      return;
    }
    setSaving(true);

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, tags')
      .contains('tags', JSON.stringify([oldName]));

    if (contacts) {
      for (const contact of contacts) {
        const updatedTags = (contact.tags as string[]).map((t: string) =>
          t === oldName ? trimmed : t
        );
        await supabase.from('contacts').update({ tags: updatedTags }).eq('id', contact.id);
      }
    }

    setSaving(false);
    setEditingTag(null);
    fetchTags();
  };

  const handleDelete = async (tagName: string) => {
    if (!confirm(`Remove tag "${tagName}" from all contacts? This cannot be undone.`)) return;
    setSaving(true);

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, tags')
      .contains('tags', JSON.stringify([tagName]));

    if (contacts) {
      for (const contact of contacts) {
        const updatedTags = (contact.tags as string[]).filter((t: string) => t !== tagName);
        await supabase.from('contacts').update({ tags: updatedTags }).eq('id', contact.id);
      }
    }

    setSaving(false);
    fetchTags();
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    // Tag will show up once applied to contacts from the Contacts page
    setShowNew(false);
    setNewTagName('');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">Tags</h1>
          </div>
          <p className="text-sm text-navy/50">
            {loading ? '—' : `${tags.length} tag${tags.length !== 1 ? 's' : ''} across all contacts`}
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowNew(true); setNewTagName(''); }}>
          <Plus size={14} />
          New Tag
        </Button>
      </div>

      <div className="card overflow-hidden">
        {/* New Tag Inline Form */}
        {showNew && (
          <div className="px-5 py-4 border-b border-cream-dark bg-gold/5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <Tag size={14} className="text-gold-dark" />
              </div>
              <input
                autoFocus
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') { setShowNew(false); setNewTagName(''); }
                }}
                placeholder="Tag name (e.g. vip, follow-up)..."
                className="flex-1 px-3 py-2 border border-cream-dark rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
              />
              <button
                onClick={() => { setShowNew(false); setNewTagName(''); }}
                className="text-navy/30 hover:text-navy transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-navy/40 mt-2 ml-11">
              Tags appear here once applied to at least one contact.{' '}
              <Link href="/contacts" className="text-gold-dark hover:underline">
                Go to Contacts
              </Link>{' '}
              to apply tags.
            </p>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark bg-cream/40">
              <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Tag
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Contacts
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-cream-dark/50">
                  <td className="px-5 py-4">
                    <div className="skeleton w-24 h-6 rounded-full" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="skeleton w-8 h-4" />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="skeleton w-16 h-7 ml-auto rounded-lg" />
                  </td>
                </tr>
              ))
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-3">
                      <Tag size={20} className="text-navy/25" />
                    </div>
                    <p className="text-sm font-serif text-navy mb-1">No tags yet</p>
                    <p className="text-xs text-navy/40">
                      Tags are created when applied to contacts.
                    </p>
                    <div className="mt-4">
                      <Link href="/contacts">
                        <Button size="sm" variant="outline">
                          <Users size={13} />
                          Go to Contacts
                        </Button>
                      </Link>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr
                  key={tag.name}
                  className="border-b border-cream-dark/50 table-row-hover group"
                >
                  <td className="px-5 py-3.5">
                    {editingTag === tag.name ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(tag.name, editValue);
                          if (e.key === 'Escape') setEditingTag(null);
                        }}
                        className="px-2.5 py-1.5 border border-gold/50 rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 w-48"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full bg-gold/10 text-gold-dark">
                        <Tag size={11} />
                        {tag.name}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <Link
                      href={`/contacts`}
                      className="inline-flex items-center gap-1.5 text-sm text-navy/60 hover:text-gold-dark transition-colors"
                    >
                      <Users size={12} />
                      {tag.count}
                    </Link>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    {editingTag === tag.name ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRename(tag.name, editValue)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="p-1.5 rounded-lg hover:bg-cream-dark text-navy/40 hover:text-navy transition-colors"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingTag(tag.name);
                            setEditValue(tag.name);
                          }}
                          className="p-1.5 rounded-lg hover:bg-cream-dark text-navy/40 hover:text-navy transition-colors"
                          title="Rename tag"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.name)}
                          disabled={saving}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-navy/40 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete tag"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
