import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WELLNESS_QUOTES, TRANSITIONS } from './auth.constants';

export const QuoteRotator: React.FC = () => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % WELLNESS_QUOTES.length);
    }, 9000); // 9 seconds between quotes

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-20 flex items-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.8, ease: TRANSITIONS.SLIDE.ease }}
          className="text-lg md:text-xl font-medium tracking-normal leading-relaxed text-[#FAFAFA]/90"
        >
          &ldquo;{WELLNESS_QUOTES[index]}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
};
