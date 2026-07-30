import React, { memo } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { fadeUp } from '../../lib/motion';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * ErrorState — premium error state with retry support.
 * Used in data-fetching areas when network/server errors occur.
 */
const ErrorStateInner: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  compact = false,
  className = '',
}) => {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center text-center gap-4 ${
        compact ? 'py-10 px-6' : 'py-16 px-8'
      } rounded-[28px] bg-[rgba(242,139,130,0.04)] border border-[rgba(242,139,130,0.15)] ${className}`}
      role="alert"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-[rgba(242,139,130,0.10)] border border-[rgba(242,139,130,0.20)] flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-[#f28b82]" />
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.85)]">{title}</h4>
        <p className="text-sm text-[rgba(232,234,246,0.45)] leading-relaxed font-body-md max-w-xs">
          {message}
        </p>
      </div>

      {/* Retry */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-[rgba(242,139,130,0.10)] text-[#f28b82] border border-[rgba(242,139,130,0.25)] hover:bg-[rgba(242,139,130,0.18)] hover:border-[rgba(242,139,130,0.40)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </motion.div>
  );
};

export const ErrorState = memo(ErrorStateInner);
ErrorState.displayName = 'ErrorState';
