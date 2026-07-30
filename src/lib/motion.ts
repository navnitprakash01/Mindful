/**
 * Mindful — Global Motion System
 *
 * All Framer Motion variants, spring presets, and easing curves
 * for the entire application. Import from here; never define
 * ad-hoc animation values in components.
 */

import type { Variants, Transition } from 'motion/react';

// ─────────────────────────────────────────────────────────────
// EASING CURVES
// ─────────────────────────────────────────────────────────────

export const ease = {
  /** Apple-like elastic expo out — primary for entrances */
  outExpo: [0.16, 1, 0.3, 1] as const,
  /** Snappy in-out for interactive elements */
  inOutQuint: [0.83, 0, 0.17, 1] as const,
  /** Soft ease for opacity fades */
  gentle: [0.4, 0, 0.2, 1] as const,
  /** Standard ease out */
  out: [0, 0, 0.2, 1] as const,
} as const;

// ─────────────────────────────────────────────────────────────
// SPRING PRESETS
// ─────────────────────────────────────────────────────────────

export const spring = {
  /** Tight snappy spring — buttons, toggles */
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 0.5,
  } satisfies Transition,

  /** Gentle spring — cards, modals */
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  } satisfies Transition,

  /** Bouncy spring — celebrations, checkmarks */
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 20,
    mass: 0.6,
  } satisfies Transition,

  /** Slow deliberate spring — large layouts */
  slow: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 30,
    mass: 1,
  } satisfies Transition,
};

// ─────────────────────────────────────────────────────────────
// DURATION TOKENS
// ─────────────────────────────────────────────────────────────

export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8,
} as const;

// ─────────────────────────────────────────────────────────────
// FADE VARIANTS
// ─────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: ease.gentle },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

// ─────────────────────────────────────────────────────────────
// SLIDE VARIANTS
// ─────────────────────────────────────────────────────────────

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

// ─────────────────────────────────────────────────────────────
// SCALE VARIANTS
// ─────────────────────────────────────────────────────────────

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

export const scalePop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: duration.fast },
  },
};

// ─────────────────────────────────────────────────────────────
// STAGGER CONTAINER + CHILD
// ─────────────────────────────────────────────────────────────

/** Wrap a list in this container to stagger its children in */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

/** Individual item inside a staggerContainer */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.outExpo },
  },
};

/** Faster stagger for dense lists */
export const staggerChildFast: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.outExpo },
  },
};

// ─────────────────────────────────────────────────────────────
// PAGE TRANSITION
// ─────────────────────────────────────────────────────────────

/** Top-level page entry/exit animation */
export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: ease.outExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: {
      duration: 0.25,
      ease: ease.gentle,
    },
  },
};

// ─────────────────────────────────────────────────────────────
// MODAL VARIANTS
// ─────────────────────────────────────────────────────────────

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: ease.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: { duration: duration.fast, ease: ease.gentle },
  },
};

// ─────────────────────────────────────────────────────────────
// UTILITY: indexed stagger (for custom i-based delays)
// ─────────────────────────────────────────────────────────────

/** Returns a fadeUp variant with a custom delay based on index */
export const indexedFadeUp = (i: number): object => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      delay: i * 0.07,
      ease: ease.outExpo,
    },
  },
});

// ─────────────────────────────────────────────────────────────
// MICROINTERACTION HELPERS
// ─────────────────────────────────────────────────────────────

/** Standard hover + press for interactive cards */
export const cardInteraction = {
  whileHover: { y: -4, scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: spring.gentle,
};

/** Standard button press */
export const buttonInteraction = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.96 },
  transition: spring.snappy,
};
