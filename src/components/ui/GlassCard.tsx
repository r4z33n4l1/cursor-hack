/**
 * GlassCard — rounded-24 glass surface with a hairline border and the
 * app's single soft ambient shadow. The shadow lives on an outer view so
 * the glass can clip its children.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { hairline, radii, shadow, useTheme } from '@/theme';

import { Glass } from './Glass';
import type { GlassProps } from './Glass';

export interface GlassCardProps extends GlassProps {
  /** Style for the outer (shadow) wrapper — margins, width, etc. */
  style?: StyleProp<ViewStyle>;
  /** Style for the inner glass surface — padding, alignment. */
  contentStyle?: StyleProp<ViewStyle>;
}

export function GlassCard({
  children,
  style,
  contentStyle,
  intensity,
  tint,
  interactive,
}: GlassCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.shadow, style]}>
      <Glass
        intensity={intensity}
        tint={tint}
        interactive={interactive}
        style={[styles.card, { borderColor: colors.glassBorder }, contentStyle]}
      >
        {children}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    ...shadow.soft,
    borderRadius: radii.card,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: hairline,
    borderCurve: 'continuous',
  },
});

export default GlassCard;
