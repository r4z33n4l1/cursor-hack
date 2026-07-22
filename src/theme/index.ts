/**
 * Theme barrel — `import { useTheme, spacing, springs } from '@/theme'`.
 */

import { useColorScheme } from 'react-native';

import {
  getColors,
  hairline,
  lavender,
  radii,
  shadow,
  spacing,
  type,
  verdictColors,
} from './tokens';
import type { ColorSchemeName, ColorSet } from './tokens';
import { durations, easing, springs, timing } from './springs';

export * from './tokens';
export * from './springs';

export interface Theme {
  scheme: ColorSchemeName;
  colors: ColorSet;
  lavender: typeof lavender;
  verdictColors: typeof verdictColors;
  spacing: typeof spacing;
  radii: typeof radii;
  shadow: typeof shadow;
  hairline: typeof hairline;
  type: typeof type;
  springs: typeof springs;
  timing: typeof timing;
  durations: typeof durations;
  easing: typeof easing;
}

/**
 * Resolves the full token set for the current system color scheme.
 * Cheap enough to call in every component; identity is stable per scheme.
 */
export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const scheme: ColorSchemeName = systemScheme === 'dark' ? 'dark' : 'light';
  return THEMES[scheme];
}

const buildTheme = (scheme: ColorSchemeName): Theme => ({
  scheme,
  colors: getColors(scheme),
  lavender,
  verdictColors,
  spacing,
  radii,
  shadow,
  hairline,
  type,
  springs,
  timing,
  durations,
  easing,
});

const THEMES: Record<ColorSchemeName, Theme> = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};
