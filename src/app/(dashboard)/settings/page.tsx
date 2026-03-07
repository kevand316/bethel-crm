'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Button from '@/components/ui/Button';
import { Settings, User, Key, Bell } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

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
      setPasswordForm({ current: '', new: '', confirm: '' });
    }

    setPasswordLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-navy">Settings</h1>
        <p className="text-sm text-navy/60 mt-1">Manage your account and CRM configuration</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account Info */}
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-navy/60" />
            <h2 className="text-lg font-serif text-navy">Account</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-navy/60 mb-1">Email</label>
              <p className="text-sm text-navy font-medium">{user?.email || 'Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-navy/60" />
            <h2 className="text-lg font-serif text-navy">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="Confirm new password"
                required
              />
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMessage}
              </p>
            )}
            <Button type="submit" size="sm" loading={passwordLoading}>
              Update Password
            </Button>
          </form>
        </div>

        {/* Integration Status */}
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-navy/60" />
            <h2 className="text-lg font-serif text-navy">Integrations</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-cream-dark">
              <div>
                <p className="text-sm font-medium text-navy">Supabase</p>
                <p className="text-xs text-navy/50">Database & Authentication</p>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Connected</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-cream-dark">
              <div>
                <p className="text-sm font-medium text-navy">Resend</p>
                <p className="text-xs text-navy/50">Email sending</p>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-cream-dark text-navy/60">
                Configure in .env
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-cream-dark">
              <div>
                <p className="text-sm font-medium text-navy">Twilio</p>
                <p className="text-xs text-navy/50">SMS send & receive</p>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-cream-dark text-navy/60">
                Configure in .env
              </span>
            </div>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="bg-white rounded-xl border border-cream-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-navy/60" />
            <h2 className="text-lg font-serif text-navy">Webhook URLs</h2>
          </div>
          <p className="text-sm text-navy/60 mb-3">
            Configure these URLs in your Resend and Twilio dashboards:
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Resend Webhook (Email Events)</label>
              <code className="block text-sm bg-cream p-2 rounded-lg text-navy break-all">
                https://crm.bethelresidency.com/api/email/webhook
              </code>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Twilio SMS Webhook (Inbound SMS)</label>
              <code className="block text-sm bg-cream p-2 rounded-lg text-navy break-all">
                https://crm.bethelresidency.com/api/sms/webhook
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
