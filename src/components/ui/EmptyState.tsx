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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-cream-dark flex items-center justify-center mb-4">
        <Icon size={28} className="text-navy/40" />
      </div>
      <h3 className="text-lg font-serif text-navy mb-1">{title}</h3>
      <p className="text-sm text-navy/60 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
