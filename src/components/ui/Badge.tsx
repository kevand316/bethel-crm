'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'green' | 'red' | 'gray';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  removable = false,
  onRemove,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-cream-dark text-navy/70',
    gold: 'bg-gold/10 text-gold-dark border border-gold/15',
    navy: 'bg-navy/8 text-navy border border-navy/10',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    red: 'bg-red-50 text-red-600 border border-red-100',
    gray: 'bg-gray-50 text-gray-500 border border-gray-100',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {children}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors ml-0.5"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
