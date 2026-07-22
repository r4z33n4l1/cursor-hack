/**
 * AuroraBackground — the ambient layer (spec §6.7). Three large radial
 * lavender blobs drift very slowly over the canvas color. Felt, not seen:
 * ~8% blob opacity in light mode, a touch stronger in dark.
 *
 * Cheap by construction: three Circle draws, positions driven on the UI
 * thread by three looping timing animations; the only per-frame work is
 * one small vec per blob inside a derived value.
 */

import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { lavender, useTheme } from '@/theme';

export interface AuroraBackgroundProps {
  style?: StyleProp<ViewStyle>;
  /** Pause the drift (e.g. off-screen, Reduce Motion). Blobs stay visible. */
  paused?: boolean;
}

interface BlobSpec {
  color: string;
  /** Start / end centers as fractions of width & height. */
  from: [number, number];
  to: [number, number];
  /** Radius as a fraction of the larger screen dimension. */
  radius: number;
  /** Loop duration in ms (one direction; the loop auto-reverses). */
  duration: number;
  /** Opacity in [light, dark] mode. */
  opacity: [number, number];
}

const BLOBS: BlobSpec[] = [
  {
    color: lavender.lav200,
    from: [0.15, 0.1],
    to: [0.75, 0.3],
    radius: 0.55,
    duration: 26000,
    opacity: [0.09, 0.16],
  },
  {
    color: lavender.lav300,
    from: [0.9, 0.55],
    to: [0.35, 0.8],
    radius: 0.45,
    duration: 22000,
    opacity: [0.07, 0.13],
  },
  {
    color: lavender.lav100,
    from: [0.4, 0.95],
    to: [0.1, 0.5],
    radius: 0.5,
    duration: 30000,
    opacity: [0.1, 0.18],
  },
];

function useDrift(duration: number, paused: boolean): SharedValue<number> {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [progress, duration, paused]);

  return progress;
}

function Blob({
  spec,
  width,
  height,
  dark,
  paused,
}: {
  spec: BlobSpec;
  width: number;
  height: number;
  dark: boolean;
  paused: boolean;
}) {
  const progress = useDrift(spec.duration, paused);

  const fromX = spec.from[0] * width;
  const fromY = spec.from[1] * height;
  const toX = spec.to[0] * width;
  const toY = spec.to[1] * height;

  const center = useDerivedValue(() => {
    const t = progress.value;
    return vec(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t);
  });

  const radius = spec.radius * Math.max(width, height);
  const opacity = dark ? spec.opacity[1] : spec.opacity[0];

  return (
    <Circle c={center} r={radius} opacity={opacity}>
      <RadialGradient
        c={center}
        r={radius}
        colors={[spec.color, `${spec.color}00`]}
      />
    </Circle>
  );
}

export function AuroraBackground({ style, paused = false }: AuroraBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const { scheme, colors } = useTheme();
  const dark = scheme === 'dark';

  return (
    <Canvas
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }, style]}
    >
      {BLOBS.map((spec, index) => (
        <Blob
          key={index}
          spec={spec}
          width={width}
          height={height}
          dark={dark}
          paused={paused}
        />
      ))}
    </Canvas>
  );
}

export default AuroraBackground;
