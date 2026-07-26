import React from 'react';
import { motion } from 'motion/react';
import { FloatingBackground } from './FloatingBackground';
import { QuoteRotator } from './QuoteRotator';
import { TRANSITIONS } from './auth.constants';

export const AuthHero = React.memo(() => {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-[55%] h-full p-12 lg:p-20 border-r border-[rgba(255,255,255,0.04)] bg-[#09090B] overflow-hidden">
      <FloatingBackground />
      
      {/* Content wrapper to stay above background */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: TRANSITIONS.SLIDE.ease }}
          className="flex items-center gap-3"
        >
          {/* Elegant Logo Mark */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white blur-[0.5px]" />
          </div>
          <span className="text-xl font-semibold tracking-wide text-white">Mindful</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: TRANSITIONS.SLIDE.ease, delay: 0.2 }}
          className="max-w-md"
        >
          <h1 className="text-4xl 2xl:text-5xl tracking-tight font-semibold text-white leading-[1.1] mb-6">
            Find clarity.<br />
            <span className="text-[#A1A1AA]">One journal at a time.</span>
          </h1>
          <p className="text-lg text-[#FAFAFA]/70 leading-relaxed font-normal">
            AI-powered emotional wellness,<br />
            built for everyday life.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <QuoteRotator />
        </motion.div>
      </div>
    </div>
  );
});

AuthHero.displayName = 'AuthHero';
