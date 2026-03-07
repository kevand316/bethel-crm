'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Contact } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
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
  Filter,
  X,
} from 'lucide-react';

const PAGE_SIZE = 25;

function ContactRowSkeleton() {
  return (
    <tr className="border-b border-cream-dark/50">
      <td className="px-4 py-3"><div className="skeleton w-4 h-4 rounded" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton w-28 h-4" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="skeleton w-36 h-3" /></td>
      <td className="px-4 py-3"><div className="skeleton w-24 h-3" /></td>
      <td className="px-4 py-3"><div className="skeleton w-16 h-5 rounded-full" /></td>
      <td className="px-4 py-3"><div className="skeleton w-14 h-5 rounded-full" /></td>
      <td className="px-4 py-3"><div className="skeleton w-16 h-3" /></td>
      <td className="px-4 py-3"><div className="skeleton w-20 h-3" /></td>
    </tr>
  );
}

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
  const [showFilters, setShowFilters] = useState(false);

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
    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterSource) query = query.eq('source', filterSource);
    if (filterTag) query = query.contains('tags', JSON.stringify([filterTag]));

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
        if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tags.add(t));
      });
      setAllTags(Array.from(tags).sort());
    }
  }, [supabase]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  const allSources = useMemo(() => {
    return ['manual', 'intake_form', 'csv_import', 'sms'];
  }, []);

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
    if (next.has(id)) next.delete(id); else next.add(id);
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
  const hasActiveFilters = filterTag || filterStatus || filterSource;

  const clearFilters = () => {
    setFilterTag('');
    setFilterStatus('');
    setFilterSource('');
    setSearch('');
    setPage(0);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="green">Active</Badge>;
      case 'unsubscribed': return <Badge variant="gray">Unsubscribed</Badge>;
      case 'bounced': return <Badge variant="red">Bounced</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-gold" />
            <h1 className="text-2xl font-serif text-navy">Contacts</h1>
          </div>
          <p className="text-sm text-navy/50">
            {totalCount} total contact{totalCount !== 1 ? 's' : ''}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkTagModal(true)}>
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

      {/* Search & Filter Bar */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-8 py-2.5 border border-cream-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-cream placeholder-navy/30 transition-all"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/30 hover:text-navy transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              showFilters || hasActiveFilters
                ? 'bg-gold/10 border-gold/30 text-gold-dark'
                : 'bg-white border-cream-dark text-navy/60 hover:border-navy/20'
            }`}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-cream-dark animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filterTag}
                onChange={(e) => { setFilterTag(e.target.value); setPage(0); }}
                className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 min-w-[140px]"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
              </select>
              <select
                value={filterSource}
                onChange={(e) => { setFilterSource(e.target.value); setPage(0); }}
                className="px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 min-w-[140px]"
              >
                <option value="">All Sources</option>
                {allSources.map((src) => (
                  <option key={src} value={src}>{src.replace('_', ' ')}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gold-dark hover:text-gold font-medium flex items-center gap-1 transition-colors"
                >
                  <X size={12} />
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="card p-3 mb-4 flex items-center gap-3 animate-scale-in" style={{ background: 'var(--color-gold-50)', borderColor: 'rgba(201,168,76,0.2)' }}>
          <span className="text-sm font-medium text-navy">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setShowBulkTagModal(true)}>
            <Tag size={13} />
            Add Tag
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-navy/50 hover:text-navy ml-auto transition-colors"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark bg-cream/40">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === contacts.length && contacts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-navy/30 accent-gold"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider cursor-pointer select-none hover:text-navy transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Name <SortIcon field="name" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider">Source</th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-navy/50 uppercase tracking-wider cursor-pointer select-none hover:text-navy transition-colors"
                  onClick={() => toggleSort('created_at')}
                >
                  <span className="inline-flex items-center gap-1">
                    Added <SortIcon field="created_at" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <ContactRowSkeleton key={i} />
                  ))}
                </>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-20 text-center">
                      <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mx-auto mb-4">
                        <Users size={24} className="text-navy/25" />
                      </div>
                      <h3 className="text-base font-serif text-navy mb-1">
                        {search || hasActiveFilters ? 'No contacts match your filters' : 'No contacts yet'}
                      </h3>
                      <p className="text-sm text-navy/40 mb-4">
                        {search || hasActiveFilters
                          ? 'Try adjusting your search or filters.'
                          : 'Add your first contact or import a CSV to get started.'}
                      </p>
                      {!search && !hasActiveFilters && (
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setShowCsvModal(true)}>
                            <Upload size={14} />
                            Import CSV
                          </Button>
                          <Button size="sm" onClick={() => setShowAddModal(true)}>
                            <Plus size={14} />
                            Add Contact
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={cn(
                      'border-b border-cream-dark/50 table-row-hover group',
                      selectedIds.has(contact.id) && 'bg-gold-50/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded border-navy/30 accent-gold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center text-xs font-semibold text-navy/60 shrink-0 ring-1 ring-navy/5">
                          {getInitials(contact.first_name, contact.last_name)}
                        </div>
                        <span className="font-medium text-navy group-hover:text-gold-dark transition-colors">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-navy/60">{contact.email || '—'}</td>
                    <td className="px-4 py-3 text-navy/60">{contact.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(contact.tags) ? contact.tags : []).slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gold/10 text-gold-dark"
                          >
                            {tag}
                          </span>
                        ))}
                        {Array.isArray(contact.tags) && contact.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-cream-dark text-navy/40">
                            +{contact.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(contact.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-navy/40">{contact.source || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-navy/40">{formatDate(contact.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-cream-dark bg-cream/30">
            <p className="text-xs text-navy/40">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-cream-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = page < 3 ? i : page + i - 2;
                if (pageNum < 0 || pageNum >= totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      page === pageNum
                        ? 'bg-navy text-white'
                        : 'text-navy/60 hover:bg-cream-dark'
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-cream-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddContactModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); fetchContacts(); fetchTags(); }}
      />
      <CsvImportModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={() => { setShowCsvModal(false); fetchContacts(); fetchTags(); }}
      />
      <BulkTagModal
        open={showBulkTagModal}
        onClose={() => setShowBulkTagModal(false)}
        contactIds={Array.from(selectedIds)}
        onSuccess={() => { setShowBulkTagModal(false); setSelectedIds(new Set()); fetchContacts(); fetchTags(); }}
      />
    </div>
  );
}
