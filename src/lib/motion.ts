/**
 * Motion presets used across the redesign.
 *
 * Three primary springs:
 *   - spring     default for entrances, layout shifts, drawer slides
 *   - softSpring slower wobble for big surfaces (modals, sheets)
 *   - snap       quick crisp for taps and small UI
 *
 * Plus two helpers — `listStagger` + `fadeUp` — for staggered list reveals.
 * Use `whileTap={tap}` on every interactive element; switch to `tapHard` for
 * tighter icon-button feedback.
 */

import type { Transition, Variants } from 'framer-motion';

export const spring: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 30,
  mass: 1,
};

export const snap: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 36,
  mass: 0.6,
};

/** Parent variant — stagger children by 60ms. */
export const listStagger: Variants = {
  hidden: {},
  shown: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

/** Child variant — pair with listStagger. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: spring },
};

export const tap = { scale: 0.96 };
export const tapHard = { scale: 0.9 };

/** Backdrop fade timings used by sheets and modals. */
export const backdropIn: Transition = { duration: 0.22, ease: 'easeOut' };
export const backdropOut: Transition = { duration: 0.32, ease: [0.32, 0, 0.32, 1] };
