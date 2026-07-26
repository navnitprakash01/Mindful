import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2, ArrowRight } from 'lucide-react';

export interface AuthButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'glass' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const AuthButtonInner = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    className = '',
    fullWidth = true,
    disabled,
    ...props
  }, ref) => {
    const isDisabled = disabled || isLoading;

    const variantStyles = {
      primary: `
        bg-[#6c72e8] text-white
        hover:bg-[#5055c8] active:bg-[#4a50c8]
        shadow-[0_4px_20px_rgba(108,114,232,0.35)] hover:shadow-[0_8px_30px_rgba(108,114,232,0.50)]
      `,
      secondary: `
        bg-[rgba(232,121,154,0.15)] text-[#f4a8c0] border border-[rgba(232,121,154,0.25)]
        hover:bg-[rgba(232,121,154,0.22)] hover:border-[rgba(232,121,154,0.40)]
      `,
      glass: `
        bg-[rgba(255,255,255,0.06)] backdrop-blur-md border border-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.85)]
        hover:bg-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.18)]
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.30)]
      `,
      subtle: `
        text-[rgba(232,234,246,0.60)] hover:text-[rgba(232,234,246,0.90)]
        hover:bg-[rgba(255,255,255,0.06)]
      `,
    };

    const sizeStyles = {
      sm: 'text-xs px-4 py-2 gap-1.5 tracking-wide',
      md: 'text-sm px-6 py-3 gap-2 tracking-wide',
      lg: 'text-base px-8 py-4 gap-2.5 tracking-wide',
    };

    const baseStyles = `
      relative inline-flex items-center justify-center font-semibold rounded-full
      transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6c72e8]/40
      focus-visible:ring-offset-1 focus-visible:ring-offset-transparent
      disabled:opacity-40 disabled:cursor-not-allowed select-none
      ${fullWidth ? 'w-full' : ''}
    `;

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={isDisabled}
        {...props}
      >
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {leftIcon && !isLoading && <span className="flex-shrink-0">{leftIcon}</span>}
              <span>{children}</span>
              {rightIcon && !isLoading && <span className="flex-shrink-0">{rightIcon}</span>}
              {!rightIcon && !isLoading && !leftIcon && (
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              )}
            </>
          )}
        </span>
        
        {variant === 'primary' && !isDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-full overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
              }}
            />
          </motion.div>
        )}
      </motion.button>
    );
  }
);

AuthButtonInner.displayName = 'AuthButton';

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  (props, ref) => <AuthButtonInner ref={ref} {...props} />
);