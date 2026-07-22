/**
 * VerdictPill — the badge: colored dot + label on the verdict's soft
 * tinted background. Calm by design; Avoid is coral, never alarm red.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Verdict } from '@/engine/types';
import { radii, spacing, type, useTheme, verdictColors } from '@/theme';

const LABELS: Record<Verdict, string> = {
  safe: 'Safe',
  caution: 'Caution',
  avoid: 'Avoid',
  unknown: 'Unknown',
};

export interface VerdictPillProps {
  verdict: Verdict;
  /** Override the default label (e.g. "Avoid for now"). */
  label?: string;
  size?: 'small' | 'regular';
  style?: StyleProp<ViewStyle>;
}

export function VerdictPill({ verdict, label, size = 'regular', style }: VerdictPillProps) {
  const { colors } = useTheme();
  const color = verdictColors[verdict];
  const small = size === 'small';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Verdict: ${label ?? LABELS[verdict]}`}
      style={[
        styles.pill,
        small ? styles.pillSmall : styles.pillRegular,
        { backgroundColor: colors.verdictTint(verdict) },
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          small && styles.dotSmall,
          { backgroundColor: color.base },
        ]}
      />
      <Text
        allowFontScaling={false}
        style={[small ? styles.labelSmall : styles.label, { color: color.base }]}
      >
        {label ?? LABELS[verdict]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  pillRegular: {
    paddingVertical: 6,
    paddingHorizontal: spacing.s,
    gap: 6,
  },
  pillSmall: {
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: type.headline.fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelSmall: {
    fontFamily: type.caption.fontFamily,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '600',
    letterSpacing: type.caption.letterSpacing,
  },
});

export default VerdictPill;
