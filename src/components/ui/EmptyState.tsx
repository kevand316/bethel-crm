'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-cream-dark flex items-center justify-center mb-4">
        <Icon size={24} className="text-navy/25" />
      </div>
      <h3 className="text-base font-serif text-navy mb-1">{title}</h3>
      <p className="text-sm text-navy/40 max-w-xs mb-5">{description}</p>
      {action}
    </div>
  );
}
