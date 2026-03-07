'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Contact } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import AddContactModal from '@/components/contacts/AddContactModal';
import CsvImportModal from '@/components/contacts/CsvImportModal';
import BulkTagModal from '@/components/contacts/BulkTagModal';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Upload,
  Tag,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 25;

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortField, setSortField] = useState<'name' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    if (filterSource) {
      query = query.eq('source', filterSource);
    }

    if (filterTag) {
      query = query.contains('tags', JSON.stringify([filterTag]));
    }

    if (sortField === 'name') {
      query = query.order('first_name', { ascending: sortDir === 'asc' });
    } else {
      query = query.order('created_at', { ascending: sortDir === 'asc' });
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;
    setContacts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [search, filterTag, filterStatus, filterSource, sortField, sortDir, page, supabase]);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('tags');
    if (data) {
      const tags = new Set<string>();
      data.forEach((c) => {
        if (Array.isArray(c.tags)) {
          c.tags.forEach((t: string) => tags.add(t));
        }
      });
      setAllTags(Array.from(tags).sort());
    }
  }, [supabase]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleSort = (field: 'name' | 'created_at') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="green">Active</Badge>;
      case 'unsubscribed':
        return <Badge variant="gray">Unsubscribed</Badge>;
      case 'bounced':
        return <Badge variant="red">Bounced</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-navy">Contacts</h1>
          <p className="text-sm text-navy/60 mt-1">{totalCount} total contacts</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkTagModal(true)}
            >
              <Tag size={14} />
              Tag ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowCsvModal(true)}>
            <Upload size={14} />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-cream-dark p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-4 py-2 border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream"
            />
          </div>
          <select
            value={filterTag}
            onChange={(e) => { setFilterTag(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">All Sources</option>
            <option value="manual">Manual</option>
            <option value="intake_form">Intake Form</option>
            <option value="csv_import">CSV Import</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy/40">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first contact manually, import a CSV, or wait for intake form submissions."
            action={
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus size={14} />
                Add Contact
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === contacts.length && contacts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-navy/30"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-navy/70 cursor-pointer select-none"
                      onClick={() => toggleSort('name')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Name <SortIcon field="name" />
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-navy/70">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-navy/70">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-navy/70">Tags</th>
                    <th className="px-4 py-3 text-left font-medium text-navy/70">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-navy/70">Source</th>
                    <th
                      className="px-4 py-3 text-left font-medium text-navy/70 cursor-pointer select-none"
                      onClick={() => toggleSort('created_at')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Added <SortIcon field="created_at" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={cn(
                        'border-b border-cream-dark/50 hover:bg-cream/30 transition-colors',
                        selectedIds.has(contact.id) && 'bg-gold/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          className="rounded border-navy/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-3 hover:text-gold-dark transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-medium text-navy">
                            {getInitials(contact.first_name, contact.last_name)}
                          </div>
                          <span className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-navy/70">{contact.email || '—'}</td>
                      <td className="px-4 py-3 text-navy/70">{contact.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(contact.tags) &&
                            contact.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="gold">{tag}</Badge>
                            ))}
                          {Array.isArray(contact.tags) && contact.tags.length > 3 && (
                            <Badge variant="gray">+{contact.tags.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(contact.status)}</td>
                      <td className="px-4 py-3 text-navy/70 capitalize">{contact.source?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-navy/70">{formatDate(contact.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-cream-dark">
                <span className="text-sm text-navy/60">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-cream-dark disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-navy/70">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-cream-dark disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddContactModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchContacts();
          fetchTags();
        }}
      />
      <CsvImportModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={() => {
          setShowCsvModal(false);
          fetchContacts();
          fetchTags();
        }}
      />
      <BulkTagModal
        open={showBulkTagModal}
        onClose={() => setShowBulkTagModal(false)}
        contactIds={Array.from(selectedIds)}
        onSuccess={() => {
          setShowBulkTagModal(false);
          setSelectedIds(new Set());
          fetchContacts();
          fetchTags();
        }}
      />
    </div>
  );
}
