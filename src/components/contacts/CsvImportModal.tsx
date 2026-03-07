'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Papa from 'papaparse';
import { Upload, CheckCircle, FileSpreadsheet } from 'lucide-react';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type CsvRow = Record<string, string>;

const CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'tags'];

export default function CsvImportModal({ open, onClose, onSuccess }: CsvImportModalProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [importCount, setImportCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setCsvHeaders(results.meta.fields || []);

        const autoMap: Record<string, string> = {};
        (results.meta.fields || []).forEach((header) => {
          const normalized = header.toLowerCase().replace(/[\s-]/g, '_');
          if (CONTACT_FIELDS.includes(normalized)) {
            autoMap[normalized] = header;
          } else if (normalized === 'firstname' || normalized === 'first') {
            autoMap['first_name'] = header;
          } else if (normalized === 'lastname' || normalized === 'last') {
            autoMap['last_name'] = header;
          }
        });
        setMapping(autoMap);
        setStep('map');
      },
    });
  };

  const handleImport = async () => {
    setLoading(true);

    const contacts = csvData.map((row) => ({
      first_name: mapping.first_name ? row[mapping.first_name] || null : null,
      last_name: mapping.last_name ? row[mapping.last_name] || null : null,
      email: mapping.email ? row[mapping.email] || null : null,
      phone: mapping.phone ? row[mapping.phone] || null : null,
      tags: mapping.tags
        ? (row[mapping.tags] || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      source: 'csv_import',
      status: 'active' as const,
    }));

    let imported = 0;
    for (let i = 0; i < contacts.length; i += 100) {
      const batch = contacts.slice(i, i + 100);
      const { error } = await supabase.from('contacts').insert(batch);
      if (!error) imported += batch.length;
    }

    setImportCount(imported);
    setStep('preview');
    setLoading(false);

    if (imported > 0) {
      setTimeout(() => {
        onSuccess();
        resetState();
      }, 2000);
    }
  };

  const resetState = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setStep('upload');
    setImportCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Contacts from CSV" size="lg">
      {step === 'upload' && (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-cream-dark flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-navy/30" />
          </div>
          <h3 className="text-sm font-medium text-navy mb-1">Upload a CSV file</h3>
          <p className="text-xs text-navy/40 mb-5 max-w-xs mx-auto">
            You&apos;ll be able to map columns to contact fields in the next step.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={13} />
            Choose CSV File
          </Button>
        </div>
      )}

      {step === 'map' && (
        <div>
          <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-cream/50 rounded-xl">
            <FileSpreadsheet size={14} className="text-gold" />
            <span className="text-xs text-navy/60">
              Found <strong className="text-navy">{csvData.length}</strong> rows. Map your CSV columns to contact fields:
            </span>
          </div>
          <div className="space-y-3 mb-6">
            {CONTACT_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-4">
                <label className="w-28 text-xs font-semibold text-navy/50 uppercase tracking-wider">
                  {field.replace('_', ' ')}
                </label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field]: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                >
                  <option value="">-- Skip --</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview first 3 rows */}
          <div className="bg-cream/50 rounded-xl p-4 mb-5 border border-cream-dark/50">
            <p className="text-[10px] font-semibold text-navy/40 uppercase tracking-wider mb-2">Preview (first 3 rows)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {CONTACT_FIELDS.filter((f) => mapping[f]).map((f) => (
                      <th key={f} className="text-left px-2 py-1.5 text-navy/50 font-semibold uppercase tracking-wider text-[10px]">
                        {f.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-cream-dark/30">
                      {CONTACT_FIELDS.filter((f) => mapping[f]).map((f) => (
                        <td key={f} className="px-2 py-1.5 text-navy text-xs">
                          {row[mapping[f]] || <span className="text-navy/20">--</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-cream-dark">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" onClick={handleImport} loading={loading}>
              <Upload size={13} />
              Import {csvData.length} Contacts
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-base font-serif text-navy mb-1">Import Complete</h3>
          <p className="text-sm text-navy/50">
            Successfully imported {importCount} contacts.
          </p>
        </div>
      )}
    </Modal>
  );
}
