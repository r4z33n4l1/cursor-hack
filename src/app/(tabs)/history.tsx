import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { VerdictPill } from '@/components/ui/VerdictPill';
import type { ScanRecord, Verdict } from '@/engine/types';
import { useHistory } from '@/stores/history';
import { lavender, radii, spacing, type, useTheme } from '@/theme';

type Filter = 'all' | Verdict;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'safe', label: 'Safe' },
  { key: 'caution', label: 'Caution' },
  { key: 'avoid', label: 'Avoid' },
];

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const records = useHistory((s) => s.records);
  const [filter, setFilter] = useState<Filter>('all');

  const sections = useMemo(() => {
    const filtered = filter === 'all' ? records : records.filter((r) => r.verdict === filter);
    const byDay = new Map<string, ScanRecord[]>();
    for (const r of filtered) {
      const label = dayLabel(r.scannedAt);
      byDay.set(label, [...(byDay.get(label) ?? []), r]);
    }
    return [...byDay.entries()].map(([title, data]) => ({ title, data }));
  }, [records, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AuroraBackground style={StyleSheet.absoluteFill} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <Text style={[type.display, { color: colors.textPrimary }]}>History</Text>
            <View style={styles.filters}>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <PressableScale
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? colors.accent : colors.accentSoft,
                      },
                    ]}>
                    <Text
                      style={[
                        type.footnote,
                        { color: active ? '#FFFFFF' : colors.accent, fontWeight: '600' },
                      ]}>
                      {f.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[type.footnote, styles.sectionTitle, { color: colors.textSecondary }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index }) => (
          <Animated.View
            layout={LinearTransition.springify().damping(18).stiffness(180)}
            entering={FadeInDown.delay(Math.min(index, 6) * 40)}>
            <PressableScale
              onPress={() => router.push(`/verdict/${item.barcode}`)}
              style={styles.rowWrap}>
              <GlassCard contentStyle={styles.rowContent}>
                <Text style={styles.rowEmoji}>{item.imageHint ?? '🧴'}</Text>
                <View style={styles.rowText}>
                  <Text style={[type.headline, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[type.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.brand}
                  </Text>
                </View>
                <VerdictPill verdict={item.verdict} size="small" />
              </GlassCard>
            </PressableScale>
          </Animated.View>
        )}
        ListEmptyComponent={
          <GlassCard style={{ marginTop: spacing.l }} contentStyle={styles.emptyCard}>
            <SymbolView name="clock" size={28} tintColor={lavender.lav400} />
            <Text
              style={[
                type.body,
                { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}>
              {filter === 'all'
                ? 'Nothing scanned yet — your product history will collect here.'
                : 'No scans match this filter yet.'}
            </Text>
          </GlassCard>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.gutter, paddingTop: 84, paddingBottom: 120 },
  filters: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.m, marginBottom: spacing.s },
  filterPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  sectionTitle: { marginTop: spacing.m, marginBottom: spacing.xs, letterSpacing: 0.6 },
  rowWrap: { marginBottom: spacing.s },
  rowContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.m, gap: spacing.s },
  rowEmoji: { fontSize: 28 },
  rowText: { flex: 1 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
});
