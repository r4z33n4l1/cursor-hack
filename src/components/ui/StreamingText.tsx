/**
 * StreamingText — reveals a string word-by-word like an LLM response
 * (spec §6.5). Words appear on a jittered ~30–45ms cadence, each fading
 * in and rising 4px on the UI thread. Tap anywhere to complete instantly.
 * All timers are cleaned up on unmount and on text change.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations, easing, type, useTheme } from '@/theme';

export interface StreamingTextProps {
  text: string;
  /** Called once the full text is visible (streamed or tapped-to-complete). */
  onDone?: () => void;
  /** Base delay per word; each word jitters ±10ms around it. */
  wordDelayMs?: number;
  /** Text style applied to every word. Defaults to themed `body`. */
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

const JITTER_MS = 10;

const Word = memo(function Word({
  word,
  textStyle,
}: {
  word: string;
  textStyle: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: durations.micro * 0.67, easing });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 4 * (1 - progress.value) }],
  }));

  return <Animated.Text style={[textStyle, animatedStyle]}>{word} </Animated.Text>;
});

export function StreamingText({
  text,
  onDone,
  wordDelayMs = 38,
  textStyle,
  style,
}: StreamingTextProps) {
  const { colors } = useTheme();
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [visibleCount, setVisibleCount] = useState(0);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const firedRef = useRef(false);

  // Restart the stream whenever the text changes.
  useEffect(() => {
    firedRef.current = false;
    setVisibleCount(0);
  }, [words]);

  useEffect(() => {
    if (visibleCount >= words.length) {
      if (words.length > 0 && !firedRef.current) {
        firedRef.current = true;
        onDoneRef.current?.();
      }
      return;
    }
    const jitter = (Math.random() * 2 - 1) * JITTER_MS;
    const delay = Math.max(16, wordDelayMs + jitter);
    const timer = setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, words.length));
    }, delay);
    return () => clearTimeout(timer);
  }, [visibleCount, words, wordDelayMs]);

  const completeNow = useCallback(() => {
    setVisibleCount(words.length);
  }, [words]);

  const resolvedTextStyle: StyleProp<TextStyle> = [
    styles.word,
    { color: colors.textPrimary },
    textStyle,
  ];

  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={text}
      onPress={completeNow}
      style={[styles.container, style]}
    >
      {words.slice(0, visibleCount).map((word, index) => (
        <Word key={`${index}-${word}`} word={word} textStyle={resolvedTextStyle} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    fontWeight: type.body.fontWeight,
  },
});

export default StreamingText;
