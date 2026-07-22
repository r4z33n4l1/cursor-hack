import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/lib/haptics';
import { getAPI } from '@/services/api';
import { stashAnalysis } from '@/stores/scan-session';
import { useHistory } from '@/stores/history';
import { currentStage, useProfile } from '@/stores/profile';
import { lavender, spacing, type, useTheme } from '@/theme';

export default function AnalyzingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const [step, setStep] = useState('Looking up product…');
  const [productName, setProductName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const cancelled = useRef(false);

  // Pulsing orb.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.45 }],
    opacity: 0.5 - pulse.value * 0.45,
  }));

  useEffect(() => {
    if (!barcode) return;
    cancelled.current = false;

    (async () => {
      const stage = currentStage(useProfile.getState());
      const generator = getAPI().analyze(barcode, stage);
      let result = null;
      while (true) {
        const next = await generator.next();
        if (cancelled.current) return;
        if (next.done) {
          result = next.value;
          break;
        }
        const event = next.value;
        haptics.pipelineTick();
        if (event.type === 'identified') {
          setProductName(event.product.name);
          setStep('Product identified');
        } else if (event.type === 'parsing') {
          setStep(`Reading ${event.ingredientCount} ingredients…`);
        } else if (event.type === 'crossref') {
          setStep(`Checking ${event.sources.join(' · ')}`);
        } else {
          setStep('Preparing your verdict…');
        }
      }

      if (!result) {
        setNotFound(true);
        return;
      }

      stashAnalysis(result);
      const stageResult = result.perStage[result.scannedStage];
      useHistory.getState().addScan({
        id: `${result.product.barcode}-${result.analyzedAt}`,
        barcode: result.product.barcode,
        productName: result.product.name,
        brand: result.product.brand,
        category: result.product.category,
        verdict: stageResult.verdict,
        stage: result.scannedStage,
        scannedAt: result.analyzedAt,
        imageHint: result.product.imageHint,
      });
      haptics.verdict(stageResult.verdict);
      router.replace({ pathname: '/verdict/[barcode]', params: { barcode: result.product.barcode } });
    })();

    return () => {
      cancelled.current = true;
    };
  }, [barcode, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AuroraBackground style={StyleSheet.absoluteFill} />

      {notFound ? (
        <Animated.View entering={FadeInDown.springify()} style={styles.center}>
          <GlassCard contentStyle={styles.notFoundCard}>
            <SymbolView name="questionmark.circle" size={40} tintColor={lavender.lav400} />
            <Text style={[type.title2, { color: colors.textPrimary, marginTop: spacing.s }]}>
              We don’t know this one yet
            </Text>
            <Text
              style={[
                type.body,
                { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}>
              This product isn’t in our database yet. It’s been added to our research queue —
              honest answer over a guess, always.
            </Text>
            <PressableScale
              onPress={() => router.replace('/scan')}
              style={[styles.retryButton, { backgroundColor: colors.accent }]}>
              <Text style={[type.headline, { color: '#FFFFFF' }]}>Scan another</Text>
            </PressableScale>
            <PressableScale onPress={() => router.dismissTo('/(tabs)')} style={styles.homeLink}>
              <Text style={[type.footnote, { color: colors.textSecondary }]}>Back home</Text>
            </PressableScale>
          </GlassCard>
        </Animated.View>
      ) : (
        <View style={styles.center}>
          <View style={styles.orbWrap}>
            <Animated.View style={[styles.ring, { borderColor: colors.accent }, ringStyle]} />
            <Animated.View style={[styles.orb, { backgroundColor: colors.accent }, orbStyle]}>
              <SymbolView name="sparkles" size={30} tintColor="#FFFFFF" />
            </Animated.View>
          </View>

          {productName ? (
            <Animated.Text
              entering={FadeIn}
              style={[type.title2, { color: colors.textPrimary, marginTop: spacing.xl }]}
              numberOfLines={1}>
              {productName}
            </Animated.Text>
          ) : null}

          <Animated.Text
            key={step}
            entering={FadeInDown.duration(240)}
            exiting={FadeOut.duration(120)}
            style={[type.body, { color: colors.textSecondary, marginTop: spacing.s }]}>
            {step}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.gutter },
  orbWrap: { alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B79CFF',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
  },
  notFoundCard: { alignItems: 'center', padding: spacing.xl },
  retryButton: {
    marginTop: spacing.l,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.s,
    borderRadius: 999,
  },
  homeLink: { marginTop: spacing.s, padding: spacing.xs },
});
