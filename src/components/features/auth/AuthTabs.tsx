import React, { memo } from 'react';
import { motion } from 'motion/react';
import { AuthMode } from './auth.types';
import { TRANSITIONS, COMMON_STYLES } from './auth.constants';

interface AuthTabsProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export const AuthTabs = memo(({ mode, onModeChange }: AuthTabsProps) => {
  return (
    <div 
      className="flex items-center gap-2 mb-8 bg-[#FAFAFA]/[0.03] p-1 rounded-xl border border-[rgba(255,255,255,0.04)]"
      role="tablist"
      aria-orientation="horizontal"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'signin'}
        onClick={() => onModeChange('signin')}
        className={`relative flex-1 py-1.5 text-[14px] font-medium tracking-wide transition-colors duration-200 z-10 rounded-lg ${COMMON_STYLES.FOCUS_RING} ${
          mode === 'signin' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#E4E4E5]'
        }`}
      >
        {mode === 'signin' && (
          <motion.div
            layoutId="auth-tab-active"
            className="absolute inset-0 bg-[#FAFAFA]/10 rounded-lg shadow-sm"
            transition={TRANSITIONS.SPRING}
          />
        )}
        <span className="relative z-20">Sign In</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'register'}
        onClick={() => onModeChange('register')}
        className={`relative flex-1 py-1.5 text-[14px] font-medium tracking-wide transition-colors duration-200 z-10 rounded-lg ${COMMON_STYLES.FOCUS_RING} ${
          mode === 'register' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#E4E4E5]'
        }`}
      >
        {mode === 'register' && (
          <motion.div
            layoutId="auth-tab-active"
            className="absolute inset-0 bg-[#FAFAFA]/10 rounded-lg shadow-sm"
            transition={TRANSITIONS.SPRING}
          />
        )}
        <span className="relative z-20">Create Account</span>
      </button>
    </div>
  );
});

AuthTabs.displayName = 'AuthTabs';
