/**
 * Glass — THE glass wrapper (spec §4.2).
 *
 * One component, zero conditionals at call sites:
 *  - iOS 26+ → true Liquid Glass via expo-glass-effect's GlassView
 *    (system refraction; `interactive` adds the system shimmer/press deform).
 *  - Everywhere else → expo-blur BlurView + a translucent lavender wash
 *    and the same layout, so children render identically in both paths.
 *
 * Never stack Glass on Glass; never place it over plain white.
 */

import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { lavender, useTheme } from '@/theme';

export interface GlassProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur strength for the fallback path (1–100). Ignored by Liquid Glass. */
  intensity?: number;
  /** 'regular' carries the lavender tint; 'clear' is neutral, for over imagery. */
  tint?: 'regular' | 'clear';
  /** Tappable glass — enables the system shimmer on iOS 26+. */
  interactive?: boolean;
}

export function Glass({
  children,
  style,
  intensity = 40,
  tint = 'regular',
  interactive = false,
}: GlassProps) {
  const { scheme, colors } = useTheme();

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle={tint}
        tintColor={tint === 'regular' ? lavender.lavGlow : undefined}
        isInteractive={interactive}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={tint === 'clear' ? Math.round(intensity * 0.6) : intensity}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={[styles.base, style]}
    >
      {tint === 'regular' ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint }]}
        />
      ) : null}
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

export default Glass;
