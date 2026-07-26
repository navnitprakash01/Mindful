import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(232,234,246,0.45)] pl-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {leftIcon && (
            <div className="absolute left-4 text-[rgba(232,234,246,0.35)] pointer-events-none group-focus-within:text-[#6c72e8] transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[rgba(255,255,255,0.04)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3 text-sm text-[rgba(232,234,246,0.90)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[rgba(108,114,232,0.50)] focus:bg-[rgba(108,114,232,0.05)] focus:shadow-[0_0_0_3px_rgba(108,114,232,0.12)] transition-all duration-200 ${
              leftIcon ? 'pl-11' : ''
            } ${rightIcon ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 text-[rgba(232,234,246,0.35)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span className="text-xs text-[#f28b82] pl-1 flex items-center gap-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(232,234,246,0.45)] pl-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-[rgba(255,255,255,0.04)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 text-sm text-[rgba(232,234,246,0.90)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[rgba(108,114,232,0.50)] focus:bg-[rgba(108,114,232,0.05)] focus:shadow-[0_0_0_3px_rgba(108,114,232,0.12)] transition-all duration-200 resize-none ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-[#f28b82] pl-1">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
