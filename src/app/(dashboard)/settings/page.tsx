'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Settings, User, Key, Bell, Copy, Check, Database, Mail, MessageSquare, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email });
      }
    };
    getUser();
  }, [supabase]);

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
