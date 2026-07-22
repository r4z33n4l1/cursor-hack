/**
 * Expecta design tokens — "Lavender Glass".
 *
 * The single source of truth for color, space, shape, and type.
 * Supersedes the template tokens in src/constants/theme.ts (kept for
 * template files); new code should import from `@/theme`.
 */

import { Platform } from 'react-native';

import type { Verdict } from '@/engine/types';

// ---------------------------------------------------------------------------
// Lavender scale (the brand)
// ---------------------------------------------------------------------------

export const lavender = {
  lav50: '#F6F4FC',
  lav100: '#EDE8F8',
  lav200: '#DCD2F0',
  lav300: '#C4B2E6',
  lav400: '#A98FDF',
  /** Primary. Buttons, active tab, scan ring. */
  lav500: '#8F6FD8',
  /** Pressed states. */
  lav600: '#755AB8',
  /** Text on lavender tint. */
  lav700: '#5E4399',
  /** #B79CFF @ 35% — Skia glows, aurora, glass tint. */
  lavGlow: 'rgba(183, 156, 255, 0.35)',
  /** The glow hue at full opacity, for callers that set their own alpha. */
  lavGlowSolid: '#B79CFF',
} as const;

// ---------------------------------------------------------------------------
// Verdict colors (calm, desaturated — never alarm red)
// ---------------------------------------------------------------------------

export interface VerdictColor {
  /** Dot, icon, label text. */
  base: string;
  /** Soft pastel surface behind verdict content (light mode). */
  tint: string;
  /** Translucent tint that works on dark surfaces. */
  tintDark: string;
}

export const verdictColors: Record<Verdict, VerdictColor> = {
  safe: {
    base: '#4CAF8D', // sage
    tint: '#EAF6F1',
    tintDark: 'rgba(76, 175, 141, 0.16)',
  },
  caution: {
    base: '#E0A83C', // honey
    tint: '#FBF3E2',
    tintDark: 'rgba(224, 168, 60, 0.16)',
  },
  avoid: {
    base: '#E2726E', // soft coral — never fire-engine red
    tint: '#FBECEB',
    tintDark: 'rgba(226, 114, 110, 0.16)',
  },
  unknown: {
    base: '#8B87A0', // grey-lavender
    tint: '#F1F0F6',
    tintDark: 'rgba(139, 135, 160, 0.16)',
  },
} as const;

// ---------------------------------------------------------------------------
// Mode-resolved palettes
// ---------------------------------------------------------------------------

export type ColorSchemeName = 'light' | 'dark';

export interface ColorSet {
  /** App background (barely-lavender white / near-black plum). */
  canvas: string;
  /** Cards, sheets — where reading happens. */
  elevated: string;
  /** A second elevation step (grouped rows, inputs). */
  elevated2: string;
  /** Headlines, body. */
  textPrimary: string;
  /** Captions, metadata. */
  textSecondary: string;
  /** Placeholders, disabled. */
  textTertiary: string;
  /** Hairline dividers. */
  line: string;
  /** Primary accent for this mode (lav500 light / lav400 dark). */
  accent: string;
  /** Pressed accent. */
  accentPressed: string;
  /** Tinted section background. */
  accentSoft: string;
  /** Hairline border for glass surfaces. */
  glassBorder: string;
  /** Lavender wash layered inside the blur fallback. */
  glassTint: string;
  /** Resolves a verdict's surface tint for this mode. */
  verdictTint: (verdict: Verdict) => string;
}

const light: ColorSet = {
  canvas: '#FBFAFE',
  elevated: '#FFFFFF',
  elevated2: '#F6F4FC',
  textPrimary: '#1C1B22',
  textSecondary: '#6E6A7C',
  textTertiary: '#A8A4B8',
  line: '#ECE9F4',
  accent: lavender.lav500,
  accentPressed: lavender.lav600,
  accentSoft: lavender.lav50,
  glassBorder: 'rgba(220, 210, 240, 0.6)', // lav200 @ 60%
  glassTint: 'rgba(183, 156, 255, 0.08)',
  verdictTint: (verdict) => verdictColors[verdict].tint,
};

const dark: ColorSet = {
  canvas: '#121017',
  elevated: '#1C1A24',
  elevated2: '#26232F',
  textPrimary: '#F4F2FA',
  textSecondary: '#A9A4BC',
  textTertiary: '#6F6A82',
  line: '#2A2734',
  accent: lavender.lav400,
  accentPressed: lavender.lav300,
  accentSoft: 'rgba(183, 156, 255, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.08)', // white @ 8%
  glassTint: 'rgba(183, 156, 255, 0.14)',
  verdictTint: (verdict) => verdictColors[verdict].tintDark,
};

export interface Palette {
  light: ColorSet;
  dark: ColorSet;
}

export const palette: Palette = { light, dark } as const;

export function getColors(scheme: ColorSchemeName): ColorSet {
  return palette[scheme];
}

// ---------------------------------------------------------------------------
// Space, shape, depth
// ---------------------------------------------------------------------------

/** 4-pt grid. Screen gutter is `spacing.gutter`; cards breathe at ≥ 20. */
export const spacing = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  gutter: 20,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  /** Ingredient chips, toasts — fully round. */
  pill: 999,
  /** Buttons. */
  button: 16,
  /** Cards. */
  card: 24,
  /** Scan frame. */
  scanFrame: 28,
  /** Sheet top corners. */
  sheet: 32,
} as const;

/** One soft ambient shadow only — depth comes from glass, blur, and scale. */
export const shadow = {
  soft: {
    shadowColor: 'rgba(30, 20, 60, 1)',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const hairline = 1;

// ---------------------------------------------------------------------------
// Typography — iOS system fonts. Display uses SF Rounded via 'ui-rounded'.
// ---------------------------------------------------------------------------

export const fontFamilies = Platform.select({
  ios: { text: 'system-ui', rounded: 'ui-rounded' },
  default: { text: 'System', rounded: 'System' },
});

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
}

export const type = {
  /** Verdict word, week number. */
  display: {
    fontFamily: fontFamilies.rounded,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  /** Screen titles. */
  title1: {
    fontFamily: fontFamilies.rounded,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  /** Card headers, product names. */
  title2: {
    fontFamily: fontFamilies.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  /** Row titles, buttons. */
  headline: {
    fontFamily: fontFamilies.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  /** Reasoning text. */
  body: {
    fontFamily: fontFamilies.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  /** Secondary body. */
  callout: {
    fontFamily: fontFamilies.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  },
  /** Metadata, sources. */
  footnote: {
    fontFamily: fontFamilies.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  /** Chips, timestamps. */
  caption: {
    fontFamily: fontFamilies.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleName = keyof typeof type;
