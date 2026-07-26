import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { AuthMode } from './auth.types';
import { TRANSITIONS, COMMON_STYLES } from './auth.constants';
import { PasswordStrength } from './PasswordStrength';
import { useAuth } from '../../../context/AuthContext';

interface AuthFormProps {
  mode: AuthMode;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const { signIn, signUp, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setIsSuccess(false);
    setIsLoading(false);
    clearError();
  }, [mode, clearError]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      setIsLoading(false);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'register' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      let didSucceed = false;
      if (mode === 'signin') {
        didSucceed = await signIn(email, password);
      } else {
        didSucceed = await signUp(name, email, password);
      }

      if (didSucceed) {
        setIsSuccess(true);
      } else {
        setIsLoading(false);
        setIsSuccess(false);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Authentication failed.';
      setIsLoading(false);
      setIsSuccess(false);
      setError(message);
    }
  };

  const inputClasses = `w-full bg-[#FAFAFA]/[0.025] hover:bg-[#FAFAFA]/[0.035] border border-[rgba(255,255,255,0.07)] rounded-[12px] px-4 py-3 text-[14px] text-[#FAFAFA] placeholder-[#A1A1AA] transition-all duration-200 ${COMMON_STYLES.INPUT_FOCUS_RING}`;
  const labelClasses = "block text-[13px] font-medium text-[#E4E4E5] mb-2";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full" noValidate>
      {mode === 'register' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <label className={labelClasses}>Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            autoComplete="name"
          />
        </motion.div>
      )}

      <div>
        <label className={labelClasses}>Email Address</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses}
          autoComplete="email"
          autoFocus
        />
      </div>

      <div>
        <label className={labelClasses}>Password</label>
        <div className="relative group">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClasses} pr-12`}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {mode === 'register' && <PasswordStrength password={password} />}
      </div>

      {mode === 'signin' && (
        <div className="flex items-center justify-between text-[13px] mt-[-4px]">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded border-[rgba(255,255,255,0.08)] bg-[#FAFAFA]/[0.03] text-[#8B5CF6] focus:ring-[#8B5CF6]/20 focus:ring-offset-0 transition-all cursor-pointer" />
            <span className="text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">Remember me</span>
          </label>
          <a href="#" className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors font-medium">
            Forgot password?
          </a>
        </div>
      )}

      {(error || authError) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/30 text-[13px] font-medium mt-1"
          role="alert"
          aria-live="polite"
        >
          {error || authError}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={isLoading || isSuccess}
        whileHover={{ y: isLoading || isSuccess ? 0 : -1 }}
        whileTap={{ scale: isLoading || isSuccess ? 1 : 0.98 }}
        transition={TRANSITIONS.SPRING}
        className={`w-full relative flex items-center justify-center bg-[#8B5CF6] hover:bg-[#7c50de] text-white font-medium h-[44px] rounded-[12px] text-[15px] transition-colors shadow-[0_2px_12px_rgba(139,92,246,0.30)] hover:shadow-[0_4px_16px_rgba(139,92,246,0.40)] mt-2 disabled:opacity-90 disabled:cursor-wait overflow-hidden z-0 ${COMMON_STYLES.FOCUS_RING}`}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 z-10"
            >
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span>Authenticating securely...</span>
            </motion.div>
          ) : isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 z-10"
            >
              <CheckCircle2 size={18} className="text-white" />
              <span>Welcome back</span>
            </motion.div>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="z-10"
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </motion.span>
          )}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 bg-white/20 z-0"
          />
        )}
      </motion.button>
    </form>
  );
};
