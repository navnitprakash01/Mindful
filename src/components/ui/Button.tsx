import React, { memo } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const ButtonComponent = memo(({ 
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6c72e8]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:opacity-40 disabled:cursor-not-allowed select-none overflow-hidden';

  const variantClasses = {
    primary:
      'bg-[#6c72e8] text-white hover:bg-[#5055c8] shadow-[0_4px_20px_rgba(108,114,232,0.35)] hover:shadow-[0_6px_28px_rgba(108,114,232,0.50)] active:shadow-[0_2px_12px_rgba(108,114,232,0.25)]',
    secondary:
      'bg-[rgba(232,121,154,0.15)] text-[#f4a8c0] border border-[rgba(232,121,154,0.25)] hover:bg-[rgba(232,121,154,0.22)] hover:border-[rgba(232,121,154,0.40)]',
    outline:
      'border border-[rgba(255,255,255,0.14)] text-[rgba(232,234,246,0.80)] hover:border-[rgba(108,114,232,0.50)] hover:text-[#c0c4ea] hover:bg-[rgba(108,114,232,0.08)]',
    ghost:
      'text-[rgba(232,234,246,0.60)] hover:text-[rgba(232,234,246,0.90)] hover:bg-[rgba(255,255,255,0.06)]',
    glass:
      'bg-[rgba(255,255,255,0.06)] backdrop-blur-md border border-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.85)] hover:bg-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.18)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.30)]',
    danger:
      'bg-[rgba(242,139,130,0.12)] text-[#f28b82] border border-[rgba(242,139,130,0.25)] hover:bg-[rgba(242,139,130,0.20)] hover:border-[rgba(242,139,130,0.40)]',
  };

  const sizeClasses = {
    sm: 'text-xs px-4 py-1.5 gap-1.5 tracking-wide',
    md: 'text-sm px-5 py-2.5 gap-2 tracking-wide',
    lg: 'text-base px-8 py-3.5 gap-2.5 tracking-wide',
  };

  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: props.disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {/* Shimmer overlay on primary buttons */}
      {variant === 'primary' && !props.disabled && (
        <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
          }}
        />
      )}
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  );
});

ButtonComponent.displayName = 'Button';

export const Button = ButtonComponent;
