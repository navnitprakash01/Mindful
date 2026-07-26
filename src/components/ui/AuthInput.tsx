import React, { forwardRef, useState, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export interface AuthInputProps extends Omit<HTMLMotionProps<'input'>, 'children'> {
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  className?: string;
}

const AuthInputInner = forwardRef<HTMLInputElement, AuthInputProps>(
  ({
    label,
    type = 'text',
    placeholder,
    error,
    success,
    leftIcon,
    showPasswordToggle = false,
    className = '',
    id,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(type === 'password' ? false : true);
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const inputType = type === 'password' && showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    useEffect(() => {
      setHasValue((props.value as string)?.length > 0);
    }, [props.value]);

    return (
      <div className="relative w-full">
        <label
          htmlFor={id}
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[rgba(232,234,246,0.45)] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFocused || hasValue ? '-top-2.5 text-[10px] text-[#6c72e8]' : 'text-sm'
          }`}
        >
          {label}
        </label>
        
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 text-[rgba(232,234,246,0.35)] transition-colors duration-300 group-focus-within:text-[#6c72e8] pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <motion.input
            ref={ref}
            id={id}
            type={inputType}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setHasValue(e.target.value.length > 0)}
            className={`
              w-full bg-[rgba(255,255,255,0.03)] backdrop-blur-md border rounded-2xl px-4 py-3.5 text-sm text-[rgba(232,234,246,0.90)] placeholder:text-[rgba(232,234,246,0.25)] 
              focus:outline-none focus:border-[rgba(108,114,232,0.50)] focus:bg-[rgba(108,114,232,0.05)] focus:shadow-[0_0_0_3px_rgba(108,114,232,0.12)] 
              transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-11' : 'pl-4'}
              ${showPasswordToggle ? 'pr-12' : 'pr-4'}
              ${error ? 'border-[rgba(242,139,130,0.50)] bg-[rgba(242,139,130,0.04)]' : success ? 'border-[rgba(52,211,153,0.50)] bg-[rgba(52,211,153,0.04)]' : 'border-[rgba(255,255,255,0.08)]'}
              ${isFocused ? 'border-[rgba(108,114,232,0.60)]' : ''}
              ${className}
            `}
            {...props}
          />
          
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 p-1.5 text-[rgba(232,234,246,0.45)] hover:text-[rgba(232,234,246,0.80)] transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {props.isLoading && (
            <Loader2 className="absolute right-4 w-4 h-4 text-[#6c72e8] animate-spin" />
          )}
          
          {error && !props.isLoading && (
            <AlertCircle className="absolute right-4 w-4 h-4 text-[#f28b82]" />
          )}
          
          {success && !props.isLoading && !error && (
            <CheckCircle className="absolute right-4 w-4 h-4 text-[#34d399]" />
          )}
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs text-[#f28b82] pl-1 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

AuthInputInner.displayName = 'AuthInput';

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (props, ref) => <AuthInputInner ref={ref} {...props} />
);