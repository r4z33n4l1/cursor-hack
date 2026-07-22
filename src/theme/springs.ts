/**
 * Motion tokens. Physics, not durations: springs for movement,
 * short timed fades for color/opacity only.
 */

import { Easing } from 'react-native-reanimated';
import type { EasingFunctionFactory, WithSpringConfig } from 'react-native-reanimated';

/** Default spring for most movement (morphs, cards, layout shifts). */
export const calm: WithSpringConfig = {
  damping: 18,
  stiffness: 180,
  mass: 1,
};

/** Chips, buttons, press feedback — quick with a small overshoot. */
export const snappy: WithSpringConfig = {
  damping: 22,
  stiffness: 320,
  mass: 1,
};

/** Sheets and large surfaces — settles without bounce. */
export const gentle: WithSpringConfig = {
  damping: 26,
  stiffness: 120,
  mass: 1,
};

export const springs = { calm, snappy, gentle } as const;

export type SpringName = keyof typeof springs;

/** Timing durations (ms) — for fades and color cross-fades only. */
export const durations = {
  /** Micro fades: press tints, dots. */
  micro: 180,
  /** Standard fades: toasts, chips, cross-fades. */
  standard: 260,
  /** Screen-level fades: fade-through to camera. */
  screen: 420,
} as const;

/** The one easing curve for timed animations. */
export const easing: EasingFunctionFactory = Easing.bezier(0.2, 0, 0, 1);

export const timing = {
  micro: { duration: durations.micro, easing },
  standard: { duration: durations.standard, easing },
  screen: { duration: durations.screen, easing },
} as const;
