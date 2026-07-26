import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[rgba(13,15,26,0.60)] backdrop-blur-[12px]"
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full ${maxWidthClasses[maxWidth]} bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.08)] rounded-[36px] shadow-[0_40px_100px_rgba(0,0,0,0.60)] p-6 md:p-8 z-10 my-auto`}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(13,15,26,0.95) 100%)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6 border-b border-[rgba(255,255,255,0.06)] pb-4">
              <div>
                {title && (
                  <h3 id="modal-title" className="font-display-lg text-2xl md:text-3xl text-[rgba(232,234,246,0.90)]">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-[rgba(232,234,246,0.40)] mt-1.5 font-body-md">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 text-[rgba(232,234,246,0.40)] hover:text-[#c0c4ea] rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
