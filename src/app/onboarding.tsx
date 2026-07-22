import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/lib/haptics';
import { useProfile } from '@/stores/profile';
import { lavender, spacing, type, useTheme } from '@/theme';

/** Due date ~N weeks from now, as an ISO date string. */
function dueDateInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

const TRIMESTERS = [
  { label: 'First trimester', sub: 'Weeks 1–13', dueInWeeks: 32 },
  { label: 'Second trimester', sub: 'Weeks 14–27', dueInWeeks: 19 },
  { label: 'Third trimester', sub: 'Weeks 28–40', dueInWeeks: 7 },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useProfile();
  const [showTrimesters, setShowTrimesters] = useState(false);

  const finish = () => {
    haptics.verdictSafe();
    profile.completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AuroraBackground style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <SymbolView name="heart.fill" size={30} tintColor="#FFFFFF" />
          </View>
          <Text style={[type.display, { color: colors.textPrimary, marginTop: spacing.l }]}>
            Expecta
          </Text>
          <Text
            style={[
              type.body,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
            ]}>
            Scan any product. Know in seconds if it’s right for you and your baby.
          </Text>
        </Animated.View>

        <Animated.View layout={LinearTransition.springify().damping(20)} style={styles.options}>
          {!showTrimesters ? (
            <>
              <OptionCard
                icon="figure.stand"
                title="I’m pregnant"
                sub="Verdicts tuned to your trimester"
                delay={120}
                onPress={() => setShowTrimesters(true)}
              />
              <OptionCard
                icon="moon.stars.fill"
                title="I’m nursing"
                sub="Focused on milk transfer and supply"
                delay={200}
                onPress={() => {
                  useProfile.getState().setNursing(true);
                  finish();
                }}
              />
              <OptionCard
                icon="sparkles"
                title="We’re trying"
                sub="Getting ready for the journey"
                delay={280}
                onPress={() => {
                  useProfile.getState().setTTC(true);
                  finish();
                }}
              />
            </>
          ) : (
            <>
              <Text style={[type.headline, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                Where are you right now?
              </Text>
              {TRIMESTERS.map((t, i) => (
                <OptionCard
                  key={t.label}
                  icon="calendar"
                  title={t.label}
                  sub={t.sub}
                  delay={i * 80}
                  onPress={() => {
                    useProfile.getState().setDueDate(dueDateInWeeks(t.dueInWeeks));
                    finish();
                  }}
                />
              ))}
              <PressableScale onPress={() => setShowTrimesters(false)} style={styles.backLink}>
                <Text style={[type.footnote, { color: colors.textSecondary }]}>Back</Text>
              </PressableScale>
            </>
          )}
        </Animated.View>

        <Text style={[type.caption, styles.legal, { color: colors.textTertiary }]}>
          General information, not medical advice.
        </Text>
      </View>
    </View>
  );
}

function OptionCard({
  icon,
  title,
  sub,
  delay,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  delay: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)}>
      <PressableScale onPress={onPress} style={styles.optionWrap}>
        <GlassCard contentStyle={styles.optionContent}>
          <View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}>
            <SymbolView name={icon as never} size={22} tintColor={lavender.lav500} />
          </View>
          <View style={styles.optionText}>
            <Text style={[type.headline, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[type.footnote, { color: colors.textSecondary }]}>{sub}</Text>
          </View>
          <SymbolView name="chevron.right" size={13} tintColor={colors.textTertiary} />
        </GlassCard>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    paddingTop: 120,
    paddingBottom: 48,
  },
  header: { alignItems: 'center', paddingHorizontal: spacing.l },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B79CFF',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  options: { marginTop: spacing.xxl, gap: spacing.s },
  optionWrap: {},
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  backLink: { alignSelf: 'center', padding: spacing.s },
  legal: { textAlign: 'center', marginTop: 'auto' },
});
