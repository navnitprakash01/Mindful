import React, { memo } from 'react';
import { motion } from 'motion/react';
import { scaleIn, staggerContainer, staggerChild } from '../../lib/motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'glass';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

/**
 * EmptyState — premium zeroth-state component.
 * Used when lists, archives, or data sections have no content.
 */
const EmptyStateInner: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-12 px-6' : 'py-20 px-8'
      } rounded-[32px] bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.08)] ${className}`}
    >
      {/* Icon */}
      <motion.div
        variants={scaleIn}
        className={`${
          compact ? 'w-12 h-12 mb-4' : 'w-16 h-16 mb-6'
        } rounded-2xl bg-[rgba(108,114,232,0.08)] border border-[rgba(108,114,232,0.15)] flex items-center justify-center text-[rgba(192,196,234,0.60)] shadow-[0_0_24px_rgba(108,114,232,0.08)]`}
      >
        {icon}
      </motion.div>

      {/* Text */}
      <motion.div variants={staggerChild} className="space-y-2 max-w-xs">
        <h3 className={`font-display-lg ${compact ? 'text-xl' : 'text-2xl'} text-[rgba(232,234,246,0.85)]`}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[rgba(232,234,246,0.45)] leading-relaxed font-body-md">
            {description}
          </p>
        )}
      </motion.div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          variants={staggerChild}
          className="flex flex-col sm:flex-row items-center gap-3 mt-6"
        >
          {action && (
            <button
              onClick={action.onClick}
              className={
                action.variant === 'primary' || !action.variant
                  ? 'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#6c72e8] text-white hover:bg-[#5055c8] shadow-[0_4px_20px_rgba(108,114,232,0.35)] hover:shadow-[0_6px_28px_rgba(108,114,232,0.50)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]'
                  : 'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.85)] border border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.10)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] backdrop-blur-md'
              }
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm font-medium text-[rgba(232,234,246,0.40)] hover:text-[rgba(232,234,246,0.70)] transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export const EmptyState = memo(EmptyStateInner);
EmptyState.displayName = 'EmptyState';
