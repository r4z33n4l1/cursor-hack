/**
 * PressableScale — the app's standard press feedback (spec §6.1):
 * scale to 0.97 with the `snappy` spring on press-in, spring back on
 * release, with an optional light haptic tap. Use for every tappable
 * surface that isn't a system control.
 */

import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale at full press. */
  pressedScale?: number;
  /** Play the light haptic tap on press-in. */
  haptic?: boolean;
}

export function PressableScale({
  children,
  style,
  pressedScale = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withSpring(pressedScale, springs.snappy);
      if (haptic) haptics.tap();
      onPressIn?.(event);
    },
    [scale, pressedScale, haptic, onPressIn],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withSpring(1, springs.snappy);
      onPressOut?.(event);
    },
    [scale, onPressOut],
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default PressableScale;
