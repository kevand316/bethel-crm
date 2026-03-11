'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Settings, User, Key, Bell, Copy, Check, Database, Mail, MessageSquare, ExternalLink, Plus, Trash2, Star } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sender management
  const [senders, setSenders] = useState<{ id: string; name: string; email: string; is_default: boolean }[]>([]);
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);
  const [senderForm, setSenderForm] = useState({ name: '', email: '' });
  const [senderLoading, setSenderLoading] = useState(false);
  const [senderError, setSenderError] = useState('');
  const [sendersReady, setSendersReady] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUser({ email: user.email });
    };
    getUser();
    fetchSenders();
  }, [supabase]);

  const fetchSenders = async () => {
    const res = await fetch('/api/email/senders');
    if (res.ok) {
      const data = await res.json();
      setSenders(data.senders || []);
      setVerifiedDomains(data.verifiedDomains || []);
    }
    setSendersReady(true);
  };

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenderError('');
    if (!senderForm.name.trim() || !senderForm.email.trim()) return;
    setSenderLoading(true);
    const res = await fetch('/api/email/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...senderForm, is_default: senders.length === 0 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSenderError(data.error || 'Failed to add sender');
    } else {
      setSenderForm({ name: '', email: '' });
      fetchSenders();
    }
    setSenderLoading(false);
  };

  const handleDeleteSender = async (id: string) => {
    await fetch('/api/email/senders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSenders();
  };

  const handleSetDefault = async (id: string) => {
    await fetch('/api/email/senders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSenders();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMessage('New passwords do not match.');
      return;
    }

    if (passwordForm.new.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.new,
    });

    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordMessage('Password updated successfully!');
      setPasswordForm({ new: '', confirm: '' });
    }

    setPasswordLoading(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const webhookUrls = [
    {
      id: 'resend',
      label: 'Resend Webhook (Email Events)',
      url: 'https://crm.bethelresidency.com/api/email/webhook',
      description: 'Receives open, click, bounce, and spam events from Resend',
    },
    {
      id: 'twilio',
      label: 'Twilio SMS Webhook (Inbound SMS)',
      url: 'https://crm.bethelresidency.com/api/sms/webhook',
      description: 'Receives inbound SMS messages from Twilio',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={20} className="text-gold" />
        <div>
          <h1 className="text-2xl font-serif text-navy">Settings</h1>
          <p className="text-sm text-navy/50">Manage your account and CRM configuration</p>
        </div>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* Account Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <User size={14} className="text-blue-500" />
            </div>
            <h2 className="text-sm font-semibold text-navy">Account</h2>
          </div>
          <div className="flex items-center justify-between py-3 px-4 bg-cream/50 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm text-navy font-medium">{user?.email || 'Loading...'}</p>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center">
              <Key size={14} className="text-gold-dark" />
            </div>
            <h2 className="text-sm font-semibold text-navy">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="Confirm new password"
                required
              />
            </div>
            {passwordMessage && (
              <div className={`px-3 py-2 rounded-lg text-sm ${
                passwordMessage.includes('success')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passwordMessage}
              </div>
            )}
            <Button type="submit" size="sm" loading={passwordLoading}>
              <Key size={13} />
              Update Password
            </Button>
          </form>
        </div>

        {/* Integration Status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <ExternalLink size={14} className="text-purple-500" />
            </div>
            <h2 className="text-sm font-semibold text-navy">Integrations</h2>
          </div>
          <div className="space-y-0">
            {[
              { name: 'Supabase', desc: 'Database & Authentication', icon: Database, status: 'connected' },
              { name: 'Resend', desc: 'Email sending & tracking', icon: Mail, status: 'env' },
              { name: 'Twilio', desc: 'SMS send & receive', icon: MessageSquare, status: 'env' },
            ].map((integration, i) => (
              <div
                key={integration.name}
                className={`flex items-center justify-between py-3.5 ${
                  i < 2 ? 'border-b border-cream-dark/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cream-dark/50 flex items-center justify-center">
                    <integration.icon size={14} className="text-navy/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{integration.name}</p>
                    <p className="text-xs text-navy/40">{integration.desc}</p>
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <Badge variant="green">Connected</Badge>
                ) : (
                  <span className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-cream-dark text-navy/50">
                    Configure in .env
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sender Email Addresses */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail size={14} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-navy">Sender Email Addresses</h2>
            </div>
          </div>
          <p className="text-xs text-navy/40 mb-4">
            Configure which email addresses appear in the &ldquo;From&rdquo; field when sending. Must be from a domain verified in Resend.
          </p>

          {/* Verified domains from Resend */}
          {verifiedDomains.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4 px-3 py-2.5 bg-green-50 rounded-xl">
              <span className="text-xs font-semibold text-green-700">Verified domains:</span>
              {verifiedDomains.map((d) => (
                <span key={d} className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{d}</span>
              ))}
            </div>
          )}

          {/* Migration notice if table missing */}
          {sendersReady && senders.length === 0 && (
            <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 font-medium mb-1">Setup required</p>
              <p className="text-xs text-amber-600">If senders don&apos;t save, run this in your <a href="https://supabase.com/dashboard" target="_blank" className="underline">Supabase SQL editor</a>:</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="text-[10px] bg-amber-100 px-2 py-1 rounded font-mono text-amber-800 flex-1 break-all">
                  CREATE TABLE IF NOT EXISTS email_senders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY; CREATE POLICY &quot;auth&quot; ON email_senders FOR ALL TO authenticated USING (true);
                </code>
                <button
                  onClick={() => copyToClipboard(`CREATE TABLE IF NOT EXISTS email_senders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY; CREATE POLICY "auth" ON email_senders FOR ALL TO authenticated USING (true);`, 'migration')}
                  className="p-1.5 rounded hover:bg-amber-100 text-amber-600 shrink-0"
                >
                  {copiedField === 'migration' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* Current senders list */}
          {senders.length > 0 && (
            <div className="mb-4 divide-y divide-cream-dark/50 border border-cream-dark rounded-xl overflow-hidden">
              {senders.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{s.name}</p>
                    <p className="text-xs text-navy/40 truncate">{s.email}</p>
                  </div>
                  {s.is_default && (
                    <span className="text-[10px] font-semibold text-gold-dark bg-gold/10 px-2 py-0.5 rounded-full shrink-0">Default</span>
                  )}
                  {!s.is_default && (
                    <button
                      onClick={() => handleSetDefault(s.id)}
                      title="Set as default"
                      className="p-1.5 rounded-lg hover:bg-cream-dark text-navy/30 hover:text-gold-dark transition-colors shrink-0"
                    >
                      <Star size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSender(s.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-navy/30 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add sender form */}
          <form onSubmit={handleAddSender} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={senderForm.name}
                  onChange={(e) => setSenderForm({ ...senderForm, name: e.target.value })}
                  placeholder="Bethel Residency"
                  className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={senderForm.email}
                  onChange={(e) => setSenderForm({ ...senderForm, email: e.target.value })}
                  placeholder="noreply@bethelresidency.com"
                  className="w-full px-3 py-2.5 border border-cream-dark rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
            </div>
            {senderError && <p className="text-xs text-red-500">{senderError}</p>}
            <Button type="submit" size="sm" loading={senderLoading} disabled={!senderForm.name || !senderForm.email}>
              <Plus size={13} />
              Add Sender
            </Button>
          </form>
        </div>

        {/* Webhook URLs */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Bell size={14} className="text-orange-500" />
            </div>
            <h2 className="text-sm font-semibold text-navy">Webhook URLs</h2>
          </div>
          <p className="text-xs text-navy/40 mb-5">
            Configure these URLs in your Resend and Twilio dashboards to receive events.
          </p>
          <div className="space-y-4">
            {webhookUrls.map((webhook) => (
              <div key={webhook.id}>
                <label className="block text-xs font-semibold text-navy/50 uppercase tracking-wider mb-1.5">
                  {webhook.label}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-cream px-3 py-2.5 rounded-xl text-navy/70 border border-cream-dark font-mono break-all">
                    {webhook.url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhook.url, webhook.id)}
                    className="p-2 rounded-lg hover:bg-cream-dark text-navy/40 hover:text-navy transition-all shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedField === webhook.id ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-navy/30 mt-1">{webhook.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
