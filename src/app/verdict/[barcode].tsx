import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Glass } from '@/components/ui/Glass';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { StreamingText } from '@/components/ui/StreamingText';
import { VerdictPill } from '@/components/ui/VerdictPill';
import type { AnalysisResult, IngredientFinding, Stage, Verdict } from '@/engine/types';
import { STAGES, STAGE_LABELS } from '@/engine/types';
import { haptics } from '@/lib/haptics';
import { findSeedProduct, runEngineAnalyze } from '@/services/engine-bridge';
import { takeAnalysis } from '@/stores/scan-session';
import { currentStage, useProfile } from '@/stores/profile';
import { spacing, type, useTheme, verdictColors } from '@/theme';

const VERDICT_ICON: Record<Verdict, SymbolViewProps['name']> = {
  safe: 'checkmark.seal.fill',
  caution: 'exclamationmark.circle.fill',
  avoid: 'hand.raised.fill',
  unknown: 'questionmark.circle.fill',
};

const VERDICT_HEADLINE: Record<Verdict, string> = {
  safe: 'Good to go',
  caution: 'Worth a closer look',
  avoid: 'Better to skip',
  unknown: 'We honestly don’t know',
};

const STAGE_SHORT: Record<Stage, string> = {
  ttc: 'Trying',
  t1: 'T1',
  t2: 'T2',
  t3: 'T3',
  nursing: 'Nursing',
};

export default function VerdictScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const profile = useProfile();

  const result: AnalysisResult | null = useMemo(() => {
    if (!barcode) return null;
    const stashed = takeAnalysis(barcode);
    if (stashed) return stashed;
    const product = findSeedProduct(barcode);
    if (!product) return null;
    return runEngineAnalyze(product, currentStage(profile));
  }, [barcode, profile]);

  const [stage, setStage] = useState<Stage>(result?.scannedStage ?? 't2');
  const stageResult = result?.perStage[stage];
  const verdict: Verdict = stageResult?.verdict ?? 'unknown';
  const accent = verdictColors[verdict].base;

  // The whole header washes to the verdict tint as the stage slider scrubs.
  const bg = useSharedValue(colors.verdictTint(verdict));
  useEffect(() => {
    bg.value = withTiming(colors.verdictTint(verdict), { duration: 420 });
  }, [verdict, colors, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  const reasoning = useMemo(() => {
    if (!result || !stageResult) return '';
    if (stage === result.scannedStage && result.reasoning.length > 0) {
      return result.reasoning.join('\n\n');
    }
    const flagged = stageResult.findings.filter(
      (f) => f.verdict === 'avoid' || f.verdict === 'caution',
    );
    if (verdict === 'safe') {
      return `Nothing in ${result.product.name} raises a flag for ${STAGE_LABELS[stage].toLowerCase()}.`;
    }
    if (flagged.length > 0) {
      return flagged[0].rule.summary;
    }
    return 'Not enough ingredient data to make a confident call here.';
  }, [result, stageResult, stage, verdict]);

  if (!result || !stageResult) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.canvas }]}>
        <Text style={[type.body, { color: colors.textSecondary }]}>Product not found.</Text>
        <PressableScale onPress={() => router.back()} style={styles.homeLink}>
          <Text style={[type.headline, { color: colors.accent }]}>Go back</Text>
        </PressableScale>
      </View>
    );
  }

  const { product } = result;

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <PressableScale
            onPress={() => router.dismissTo('/(tabs)')}
            accessibilityLabel="Close verdict">
            <Glass style={styles.circleButton}>
              <SymbolView name="xmark" size={15} tintColor={colors.textPrimary} />
            </Glass>
          </PressableScale>
        </View>

        {/* Verdict hero */}
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.hero}>
          <Text style={styles.heroEmoji}>{product.imageHint ?? '🧴'}</Text>
          <Text style={[type.footnote, { color: colors.textSecondary }]}>{product.brand}</Text>
          <Text style={[type.title1, styles.heroName, { color: colors.textPrimary }]}>
            {product.name}
          </Text>
          <View style={styles.heroVerdict}>
            <SymbolView name={VERDICT_ICON[verdict]} size={26} tintColor={accent} />
            <Text style={[type.title2, { color: accent }]}>{VERDICT_HEADLINE[verdict]}</Text>
          </View>
        </Animated.View>

        {/* Stage slider — the money shot */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <GlassCard contentStyle={styles.sliderContent}>
            <View style={styles.sliderRow}>
              {STAGES.map((s) => {
                const active = s === stage;
                const stageVerdict = result.perStage[s].verdict;
                return (
                  <PressableScale
                    key={s}
                    haptic={false}
                    onPress={() => {
                      haptics.tick();
                      setStage(s);
                    }}
                    style={[
                      styles.stagePill,
                      active && {
                        backgroundColor: verdictColors[stageVerdict].base,
                      },
                    ]}>
                    <Text
                      style={[
                        type.footnote,
                        {
                          fontWeight: '600',
                          color: active ? '#FFFFFF' : colors.textSecondary,
                        },
                      ]}>
                      {STAGE_SHORT[s]}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[type.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
              Verdicts shift with your stage — slide to see how.
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Streaming reasoning */}
        <Animated.View entering={FadeInDown.delay(160).springify().damping(18)}>
          <GlassCard contentStyle={styles.blockContent}>
            <StreamingText
              key={`${stage}-${reasoning.slice(0, 24)}`}
              text={reasoning}
              textStyle={[type.body, { color: colors.textPrimary }]}
            />
          </GlassCard>
        </Animated.View>

        {/* Ingredient findings */}
        {stageResult.findings.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(240).springify().damping(18)}>
            <Text style={[type.headline, styles.sectionTitle, { color: colors.textPrimary }]}>
              What we checked
            </Text>
            <GlassCard contentStyle={styles.listContent}>
              {stageResult.findings.map((finding, i) => (
                <FindingRow
                  key={finding.rule.id}
                  finding={finding}
                  last={i === stageResult.findings.length - 1}
                />
              ))}
              {stageResult.unmatched.length > 0 ? (
                <Text style={[type.caption, { color: colors.textTertiary, marginTop: spacing.s }]}>
                  {stageResult.unmatched.length} minor ingredient
                  {stageResult.unmatched.length > 1 ? 's' : ''} not in our database yet.
                </Text>
              ) : null}
            </GlassCard>
          </Animated.View>
        ) : null}

        {/* Alternatives */}
        {product.alternatives && product.alternatives.length > 0 && verdict !== 'safe' ? (
          <Animated.View entering={FadeInDown.delay(320).springify().damping(18)}>
            <Text style={[type.headline, styles.sectionTitle, { color: colors.textPrimary }]}>
              Safer swap
            </Text>
            {product.alternatives.map((name) => (
              <AlternativeChip key={name} name={name} />
            ))}
          </Animated.View>
        ) : null}

        <Text style={[type.caption, styles.disclaimer, { color: colors.textTertiary }]}>
          Expecta is general information, not medical advice. Always confirm with your provider.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

function FindingRow({ finding, last }: { finding: IngredientFinding; last: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const name = finding.rule.names[0];

  return (
    <Animated.View layout={LinearTransition.springify().damping(20)}>
      <PressableScale
        haptic={false}
        onPress={() => setOpen((o) => !o)}
        style={[styles.findingRow, !last && !open && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={[styles.dot, { backgroundColor: verdictColors[finding.verdict].base }]} />
        <View style={styles.findingText}>
          <Text style={[type.headline, { color: colors.textPrimary }]}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Text>
          <Text style={[type.footnote, { color: colors.textSecondary }]} numberOfLines={open ? 0 : 1}>
            {finding.rule.summary}
          </Text>
          {open ? (
            <>
              <Text style={[type.footnote, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                {finding.rule.detail}
              </Text>
              {finding.rule.maxSafeDose ? (
                <Text style={[type.footnote, { color: colors.accent, marginTop: spacing.xs }]}>
                  {finding.rule.maxSafeDose}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
        <VerdictPill verdict={finding.verdict} size="small" />
      </PressableScale>
    </Animated.View>
  );
}

function AlternativeChip({ name }: { name: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => {
        // Alternatives are stored by product name; jump straight to their verdict.
        const products = require('@/data/products.seed.json') as { name: string; barcode: string }[];
        const match = products.find((p) => p.name === name);
        if (match) router.push({ pathname: '/verdict/[barcode]', params: { barcode: match.barcode } });
      }}
      style={styles.altWrap}>
      <GlassCard contentStyle={styles.altContent}>
        <SymbolView name="arrow.triangle.swap" size={17} tintColor={verdictColors.safe.base} />
        <Text style={[type.headline, { color: colors.textPrimary, flex: 1 }]}>{name}</Text>
        <SymbolView name="chevron.right" size={13} tintColor={colors.textTertiary} />
      </GlassCard>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.gutter, paddingBottom: 64, gap: spacing.m },
  topBar: { paddingTop: 64, flexDirection: 'row' },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hero: { alignItems: 'center', paddingVertical: spacing.m, gap: spacing.xxs },
  heroEmoji: { fontSize: 56, marginBottom: spacing.xs },
  heroName: { textAlign: 'center' },
  heroVerdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  sliderContent: { padding: spacing.m, alignItems: 'center' },
  sliderRow: { flexDirection: 'row', gap: spacing.xxs },
  stagePill: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    minWidth: 56,
    alignItems: 'center',
  },
  blockContent: { padding: spacing.l },
  sectionTitle: { marginBottom: spacing.s, marginTop: spacing.xs },
  listContent: { padding: spacing.m },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    paddingVertical: spacing.s,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  findingText: { flex: 1 },
  altWrap: { marginBottom: spacing.s },
  altContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
  },
  disclaimer: { textAlign: 'center', marginTop: spacing.l, paddingHorizontal: spacing.l },
  homeLink: { marginTop: spacing.m, padding: spacing.s },
});
