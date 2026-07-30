import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pageTransition } from '../../lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Unique key to trigger re-animation on view change */
  transitionKey: string;
  className?: string;
}

/**
 * PageTransition — wraps any view with a consistent fade+slide+blur entrance.
 * Drop this around the top-level div of every view component.
 */
const PageTransitionInner: React.FC<PageTransitionProps> = ({
  children,
  transitionKey,
  className = '',
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const PageTransition = memo(PageTransitionInner);
PageTransition.displayName = 'PageTransition';
