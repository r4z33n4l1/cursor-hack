import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { VerdictPill } from '@/components/ui/VerdictPill';
import { STAGE_LABELS } from '@/engine/types';
import type { ScanRecord } from '@/engine/types';
import { findWeeklyTip } from '@/services/engine-bridge';
import { useHistory } from '@/stores/history';
import { currentStage, currentWeek, useProfile } from '@/stores/profile';
import { lavender, radii, spacing, type, useTheme } from '@/theme';

function greetingFor(hour: number): string {
  if (hour < 5) return 'Hello, night owl';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(ts: number): string {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** Tips are seeded on even weeks — walk down to the nearest one. */
function nearestTip(week: number) {
  for (let w = Math.min(40, Math.max(4, Math.round(week))); w >= 4; w--) {
    const tip = findWeeklyTip(w);
    if (tip) return tip;
  }
  return null;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const profile = useProfile();
  const records = useHistory((s) => s.records);
  const recent = records.slice(0, 3);

  const [hydrated, setHydrated] = useState<boolean>(
    () => useProfile.persist?.hasHydrated?.() ?? true,
  );
  useEffect(() => {
    const unsub = useProfile.persist?.onFinishHydration?.(() => setHydrated(true));
    return () => unsub?.();
  }, []);

  // Breathing glow on the scan button — the screen's one moving focal point.
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.04 }],
    shadowOpacity: 0.35 + breathe.value * 0.25,
  }));

  const stage = currentStage(profile);
  const week = currentWeek(profile);
  const tip = useMemo(() => (week ? nearestTip(week) : null), [week]);

  if (hydrated && !profile.onboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AuroraBackground style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)}>
          <Text style={[type.footnote, { color: colors.textSecondary }]}>
            {greetingFor(new Date().getHours())}
            {profile.name ? `, ${profile.name}` : ''}
          </Text>
          <Text style={[type.display, { color: colors.textPrimary, marginTop: spacing.xxs }]}>
            {stage === 'nursing'
              ? 'Nursing days'
              : stage === 'ttc'
                ? 'Getting ready'
                : week
                  ? `Week ${week}`
                  : 'Today'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18).stiffness(180)}>
          <GlassCard style={styles.card} contentStyle={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[type.caption, { color: colors.accent, letterSpacing: 1.2 }]}>
                {STAGE_LABELS[stage].toUpperCase()}
              </Text>
              {week ? <WeekBar week={week} /> : null}
            </View>
            <Text style={[type.title2, { color: colors.textPrimary, marginTop: spacing.xs }]}>
              {tip?.title ??
                (stage === 'nursing'
                  ? 'Every feed counts'
                  : 'Small checks, big peace of mind')}
            </Text>
            <Text style={[type.body, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
              {tip?.body ??
                (stage === 'nursing'
                  ? 'Most everyday products are nursing-friendly — Expecta flags the few that affect milk supply or transfer.'
                  : 'Scan anything you eat, take, or put on your skin — we’ll read the label so you don’t have to.')}
            </Text>
          </GlassCard>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).springify().damping(18).stiffness(180)}
          style={styles.scanWrap}>
          <Animated.View style={[styles.scanGlow, breatheStyle]}>
            <PressableScale
              pressedScale={0.94}
              onPress={() => router.push('/scan')}
              style={[styles.scanButton, { backgroundColor: colors.accent }]}
              accessibilityLabel="Scan a product">
              <SymbolView name="barcode.viewfinder" size={40} tintColor="#FFFFFF" />
            </PressableScale>
          </Animated.View>
          <Text style={[type.footnote, { color: colors.textSecondary, marginTop: spacing.s }]}>
            Scan a product
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify().damping(18).stiffness(180)}>
          <Text style={[type.headline, { color: colors.textPrimary, marginBottom: spacing.s }]}>
            Recent scans
          </Text>
          {recent.length === 0 ? (
            <GlassCard style={styles.card} contentStyle={[styles.cardContent, styles.emptyCard]}>
              <SymbolView name="sparkles" size={28} tintColor={lavender.lav400} />
              <Text
                style={[
                  type.body,
                  { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
                ]}>
                Scan your first product and the answer lives here.
              </Text>
            </GlassCard>
          ) : (
            recent.map((record) => <RecentRow key={record.id} record={record} />)
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function WeekBar({ week }: { week: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.weekBar, { backgroundColor: colors.accentSoft }]}>
      <View
        style={[
          styles.weekFill,
          { backgroundColor: colors.accent, width: `${Math.min(100, (week / 40) * 100)}%` },
        ]}
      />
    </View>
  );
}

function RecentRow({ record }: { record: ScanRecord }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push(`/verdict/${record.barcode}`)}
      style={styles.rowWrap}>
      <GlassCard contentStyle={styles.rowContent}>
        <Text style={styles.rowEmoji}>{record.imageHint ?? '🧴'}</Text>
        <View style={styles.rowText}>
          <Text style={[type.headline, { color: colors.textPrimary }]} numberOfLines={1}>
            {record.productName}
          </Text>
          <Text style={[type.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
            {record.brand} · {relativeTime(record.scannedAt)}
          </Text>
        </View>
        <VerdictPill verdict={record.verdict} size="small" />
      </GlassCard>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 84,
    paddingBottom: 120,
    gap: spacing.l,
  },
  card: { width: '100%' },
  cardContent: { padding: spacing.l },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekBar: { height: 6, width: 96, borderRadius: radii.pill, overflow: 'hidden' },
  weekFill: { height: '100%', borderRadius: radii.pill },
  scanWrap: { alignItems: 'center', paddingVertical: spacing.s },
  scanGlow: {
    shadowColor: lavender.lavGlowSolid,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  scanButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  rowWrap: { marginBottom: spacing.s },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    gap: spacing.s,
  },
  rowEmoji: { fontSize: 28 },
  rowText: { flex: 1 },
});
