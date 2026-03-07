'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Mail,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/email/campaigns', label: 'Email', icon: Mail },
  { href: '/sms/conversations', label: 'SMS', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'h-screen bg-navy text-white flex flex-col transition-all duration-300 ease-in-out sticky top-0 shadow-xl',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'border-b border-white/[0.06] flex items-center',
        collapsed ? 'px-3 py-4 justify-center' : 'px-5 py-5 justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <span className="text-gold font-serif text-sm font-bold">B</span>
            </div>
            <div>
              <h1 className="text-sm font-serif text-gold tracking-wide">Bethel CRM</h1>
              <p className="text-[9px] text-white/25 uppercase tracking-widest">Residency</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
            <span className="text-gold font-serif text-sm font-bold">B</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-navy border-2 border-cream-dark shadow-md flex items-center justify-center text-white/60 hover:text-white hover:bg-navy-light transition-all z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium relative group',
                active
                  ? 'bg-gold/15 text-gold shadow-sm'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-navy-light text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-lg z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2.5 pb-4 pt-2 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 w-full group relative',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1 bg-navy-light text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-lg z-50 pointer-events-none">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
