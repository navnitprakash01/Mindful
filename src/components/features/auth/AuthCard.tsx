import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthTabs } from './AuthTabs';
import { AuthForm } from './AuthForm';
import { GoogleButton } from './GoogleButton';
import { AuthMode } from './auth.types';
import { TRANSITIONS } from './auth.constants';
import { supabase } from '../../../lib/supabase';

interface AuthCardProps {
  onCancel: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onCancel }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue with Google right now.';
      console.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center px-6 lg:px-16 bg-[#09090B]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: TRANSITIONS.SLIDE.ease }}
        className="w-full max-w-[460px] lg:max-w-[500px] bg-[#111114] rounded-[24px] p-8 lg:p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_25px_60px_-10px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/5"
      >
        <AuthTabs mode={mode} onModeChange={setMode} />
        
        <div className="relative overflow-hidden min-h-[300px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'signin' ? 20 : -20 }}
              transition={{ duration: 0.35, ease: TRANSITIONS.SLIDE.ease }}
            >
              <AuthForm mode={mode} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8">
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-[rgba(255,255,255,0.06)]" />
            <span className="flex-shrink-0 mx-4 text-[11px] font-medium tracking-wider text-[#A1A1AA] uppercase">
              Or continue with
            </span>
            <div className="flex-grow border-t border-[rgba(255,255,255,0.06)]" />
          </div>

          <GoogleButton isLoading={isGoogleLoading} onClick={handleGoogleSignIn} />
        </div>
        
        <p className="mt-8 text-center text-[12px] text-[#A1A1AA]">
          By continuing, you agree to our{' '}
          <a href="#" className="text-[#FAFAFA] hover:underline">Terms of Service</a> and{' '}
          <a href="#" className="text-[#FAFAFA] hover:underline">Privacy Policy</a>.
        </p>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] font-medium text-[#8B5CF6] hover:text-[#FAFAFA] transition-colors"
          >
            Back to home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
