import React, { memo } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'sage' | 'lavender' | 'rose' | 'slate' | 'outline' | 'pro' | 'amber';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

const BadgeInner: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  onClick,
}) => {
  const variantClasses = {
    sage: 'bg-[rgba(52,211,153,0.10)] text-[#6ee7b7] border-[rgba(52,211,153,0.20)]',
    lavender: 'bg-[rgba(192,196,234,0.12)] text-[#c0c4ea] border-[rgba(192,196,234,0.25)]',
    rose: 'bg-[rgba(232,121,154,0.12)] text-[#f4a8c0] border-[rgba(232,121,154,0.25)]',
    slate: 'bg-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.55)] border-[rgba(255,255,255,0.08)]',
    outline: 'bg-transparent border border-[rgba(255,255,255,0.15)] text-[rgba(232,234,246,0.55)]',
    pro: 'bg-gradient-to-r from-[rgba(251,191,36,0.20)] via-[rgba(232,121,154,0.20)] to-[rgba(192,196,234,0.20)] text-[#fbbf24] font-semibold border-[rgba(251,191,36,0.30)]',
    amber: 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.25)]',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2.5 py-0.5 rounded-full gap-1',
    md: 'text-[11px] px-3 py-1 rounded-full gap-1.5',
  };

  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
      className={`inline-flex items-center font-medium border tracking-[0.06em] uppercase backdrop-blur-sm select-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6c72e8]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
        onClick ? 'cursor-pointer hover:opacity-80 hover:scale-105 active:scale-95' : ''
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Badge = memo(BadgeInner);
Badge.displayName = 'Badge';
