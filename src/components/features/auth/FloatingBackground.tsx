import React, { memo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const FloatingBackground = memo(() => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#09090B] pointer-events-none">
      {/* Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay z-10"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      
      {/* Subtle Gradient underlying blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 via-[#09090B] to-[#6366F1]/10" />

      {/* Floating Blob 1 */}
      <motion.div
        animate={shouldReduceMotion ? {} : {
          x: ['0%', '10%', '-5%', '0%'],
          y: ['0%', '-10%', '5%', '0%'],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 35,
          ease: "linear",
          repeat: Infinity,
        }}
        className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#8B5CF6]/[0.05] blur-[120px] mix-blend-screen will-change-transform"
      />

      {/* Floating Blob 2 */}
      <motion.div
        animate={shouldReduceMotion ? {} : {
          x: ['0%', '-8%', '10%', '0%'],
          y: ['0%', '15%', '-5%', '0%'],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 40,
          ease: "linear",
          repeat: Infinity,
        }}
        className="absolute top-[20%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-[#6366F1]/[0.04] blur-[120px] mix-blend-screen will-change-transform"
      />

      {/* Soft Floating Particles */}
      {!shouldReduceMotion && [...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: ['0vh', '-100vh'],
            x: ['0vw', `${(i % 2 === 0 ? 1 : -1) * (10 + i * 5)}vw`],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2,
          }}
          className="absolute bottom-0 w-1 h-1 rounded-full bg-white/10 blur-[1px] will-change-transform"
          style={{
            left: `${15 + i * 15}%`,
          }}
        />
      ))}
    </div>
  );
});

FloatingBackground.displayName = 'FloatingBackground';
