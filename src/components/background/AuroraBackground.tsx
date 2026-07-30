import React, { memo, useEffect, useRef } from 'react';

interface AuroraBackgroundProps {
  /** 0–1 — controls overall opacity of the aurora layer */
  intensity?: number;
  className?: string;
}

/**
 * AuroraBackground — Soft, calm animated background layer.
 *
 * Uses only CSS animations + SVG filters for zero JS animation overhead.
 * The blobs drift slowly using CSS keyframes defined in index.css.
 * Respects prefers-reduced-motion by stopping the animation.
 */
const AuroraBackgroundInner: React.FC<AuroraBackgroundProps> = ({
  intensity = 0.6,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && containerRef.current) {
      containerRef.current.style.animation = 'none';
      containerRef.current.querySelectorAll('[data-aurora-blob]').forEach((el) => {
        (el as HTMLElement).style.animation = 'none';
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ opacity: intensity, zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Primary indigo blob — top-left */}
      <div
        data-aurora-blob
        className="aurora-blob"
        style={{
          width: '80vw',
          height: '80vw',
          maxWidth: 900,
          maxHeight: 900,
          top: '-20%',
          left: '-15%',
          background: 'radial-gradient(circle, rgba(108,114,232,0.22) 0%, transparent 65%)',
          animationDuration: '18s',
          animationDelay: '0s',
        }}
      />

      {/* Secondary rose blob — top-right */}
      <div
        data-aurora-blob
        className="aurora-blob"
        style={{
          width: '60vw',
          height: '60vw',
          maxWidth: 700,
          maxHeight: 700,
          top: '-10%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(232,121,154,0.14) 0%, transparent 65%)',
          animationDuration: '22s',
          animationDelay: '-6s',
          animationDirection: 'reverse',
        }}
      />

      {/* Tertiary teal blob — center-bottom */}
      <div
        data-aurora-blob
        className="aurora-blob"
        style={{
          width: '50vw',
          height: '50vw',
          maxWidth: 600,
          maxHeight: 600,
          bottom: '5%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 65%)',
          animationDuration: '26s',
          animationDelay: '-12s',
        }}
      />

      {/* Accent violet blob — bottom-left */}
      <div
        data-aurora-blob
        className="aurora-blob"
        style={{
          width: '40vw',
          height: '40vw',
          maxWidth: 500,
          maxHeight: 500,
          bottom: '-5%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 65%)',
          animationDuration: '20s',
          animationDelay: '-3s',
          animationDirection: 'alternate-reverse',
        }}
      />

      {/* Subtle grain overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          opacity: 0.5,
        }}
      />
    </div>
  );
};

export const AuroraBackground = memo(AuroraBackgroundInner);
AuroraBackground.displayName = 'AuroraBackground';
