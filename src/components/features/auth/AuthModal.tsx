import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthHero } from './AuthHero';
import { AuthCard } from './AuthCard';
import { AuthModalProps } from './auth.types';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { setCurrentView } = useApp();
  const { user, isAuthenticated, isLoading, error } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isAuthenticated && user && !isLoading && !error) {
      onClose();
      setCurrentView('dashboard');
    }
  }, [error, isAuthenticated, isLoading, isOpen, onClose, setCurrentView, user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] bg-[#09090B] flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden font-sans"
          role="dialog"
          aria-modal="true"
        >
          <AuthHero />
          
          <div className="absolute inset-0 lg:hidden pointer-events-none opacity-50 bg-gradient-to-b from-[#8B5CF6]/5 to-[#09090B]" />
          
          <div className="relative w-full lg:w-[45%] h-full flex flex-col z-10">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute top-6 right-6 lg:top-8 lg:right-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#FAFAFA]/70 hover:text-white transition-colors z-50 backdrop-blur-md"
              onClick={onClose}
              aria-label="Close authentication"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>

            <AuthCard onCancel={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
