import React, { memo } from 'react';

// ─────────────────────────────────────────────────────────────
// SKELETON VARIANTS
// ─────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  className?: string;
}

/** Single shimmer block */
const SkeletonBlock: React.FC<SkeletonBaseProps> = ({ className = '' }) => (
  <div
    className={`animate-shimmer rounded-2xl bg-[rgba(255,255,255,0.04)] ${className}`}
    aria-hidden="true"
  />
);

/** Text line skeleton */
export const SkeletonText: React.FC<SkeletonBaseProps & { lines?: number }> = memo(
  ({ lines = 3, className = '' }) => (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer h-3.5 rounded-full bg-[rgba(255,255,255,0.04)]"
          style={{ width: i === lines - 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  )
);
SkeletonText.displayName = 'SkeletonText';

/** Card skeleton */
export const SkeletonCard: React.FC<SkeletonBaseProps> = memo(({ className = '' }) => (
  <div
    className={`rounded-[32px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6 md:p-8 space-y-4 ${className}`}
    aria-hidden="true"
  >
    {/* Header row */}
    <div className="flex items-center gap-3">
      <div className="animate-shimmer w-10 h-10 rounded-2xl bg-[rgba(255,255,255,0.04)]" />
      <div className="flex-1 space-y-2">
        <div className="animate-shimmer h-3.5 rounded-full bg-[rgba(255,255,255,0.04)] w-1/3" />
        <div className="animate-shimmer h-2.5 rounded-full bg-[rgba(255,255,255,0.04)] w-1/2" />
      </div>
    </div>
    {/* Body */}
    <SkeletonText lines={3} />
    {/* Footer */}
    <div className="animate-shimmer h-9 rounded-full bg-[rgba(255,255,255,0.04)] w-1/3" />
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

/** Horizontal list row skeleton */
export const SkeletonListRow: React.FC<SkeletonBaseProps> = memo(({ className = '' }) => (
  <div
    className={`flex items-center gap-4 p-4 rounded-2xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)] ${className}`}
    aria-hidden="true"
  >
    <div className="animate-shimmer w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.04)] flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="animate-shimmer h-3.5 rounded-full bg-[rgba(255,255,255,0.04)] w-2/5" />
      <div className="animate-shimmer h-2.5 rounded-full bg-[rgba(255,255,255,0.04)] w-3/5" />
    </div>
    <div className="animate-shimmer w-20 h-8 rounded-full bg-[rgba(255,255,255,0.04)]" />
  </div>
));
SkeletonListRow.displayName = 'SkeletonListRow';

/** Stat card skeleton */
export const SkeletonStat: React.FC<SkeletonBaseProps> = memo(({ className = '' }) => (
  <div
    className={`rounded-[32px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6 space-y-3 ${className}`}
    aria-hidden="true"
  >
    <div className="animate-shimmer w-10 h-10 rounded-2xl bg-[rgba(255,255,255,0.04)]" />
    <div className="animate-shimmer h-8 rounded-full bg-[rgba(255,255,255,0.04)] w-1/3" />
    <div className="animate-shimmer h-3 rounded-full bg-[rgba(255,255,255,0.04)] w-2/3" />
  </div>
));
SkeletonStat.displayName = 'SkeletonStat';

// ─────────────────────────────────────────────────────────────
// FULL PAGE SKELETON — for Suspense fallbacks
// ─────────────────────────────────────────────────────────────

export const SkeletonPage: React.FC<{ cols?: number }> = memo(({ cols = 2 }) => (
  <div
    className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-6"
    role="status"
    aria-label="Loading content"
  >
    {/* Header area */}
    <div className="space-y-3 mb-8">
      <div className="animate-shimmer h-4 rounded-full bg-[rgba(255,255,255,0.04)] w-24" />
      <div className="animate-shimmer h-11 rounded-2xl bg-[rgba(255,255,255,0.04)] w-2/5" />
      <div className="animate-shimmer h-4 rounded-full bg-[rgba(255,255,255,0.04)] w-3/5" />
    </div>

    {/* Grid of skeletons */}
    <div
      className={`grid gap-5 ${
        cols === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : cols === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1'
      }`}
    >
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
));
SkeletonPage.displayName = 'SkeletonPage';

export { SkeletonBlock };
