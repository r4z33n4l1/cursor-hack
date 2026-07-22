/**
 * The Expecta haptic map (spec §6): every meaningful state change has a
 * signature. Thin wrapper over expo-haptics — fire-and-forget, no-op on web,
 * never throws.
 *
 *   button press          → haptics.tap()        (impact: light)
 *   selection change      → haptics.select()     (selection)
 *   stage-slider detent   → haptics.tick()       (impact: soft)
 *   barcode lock-on       → haptics.lockOn()     (impact: rigid)
 *   pipeline stage tick   → haptics.pipelineTick() (impact: light)
 *   verdict Safe          → haptics.verdictSafe()    (notification: success)
 *   verdict Caution       → haptics.verdictCaution() (notification: warning)
 *   verdict Avoid         → haptics.verdictAvoid()   (notification: error — once, never repeated)
 *   verdict Unknown       → haptics.verdictUnknown() (impact: soft — neutral, hopeful)
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { Verdict } from '@/engine/types';

const enabled = Platform.OS !== 'web';

function impact(style: Haptics.ImpactFeedbackStyle): void {
  if (!enabled) return;
  Haptics.impactAsync(style).catch(() => {});
}

function notify(feedbackType: Haptics.NotificationFeedbackType): void {
  if (!enabled) return;
  Haptics.notificationAsync(feedbackType).catch(() => {});
}

export const haptics = {
  /** Standard button press. */
  tap(): void {
    impact(Haptics.ImpactFeedbackStyle.Light);
  },

  /** Picker / segmented-control selection change. */
  select(): void {
    if (!enabled) return;
    Haptics.selectionAsync().catch(() => {});
  },

  /** Slider detent settle (stage slider, due-date wheel). */
  tick(): void {
    impact(Haptics.ImpactFeedbackStyle.Soft);
  },

  /** Barcode lock-on — the frame snaps to the code. */
  lockOn(): void {
    impact(Haptics.ImpactFeedbackStyle.Rigid);
  },

  /** Analyzing-pipeline stage checked off. */
  pipelineTick(): void {
    impact(Haptics.ImpactFeedbackStyle.Light);
  },

  verdictSafe(): void {
    notify(Haptics.NotificationFeedbackType.Success);
  },

  verdictCaution(): void {
    notify(Haptics.NotificationFeedbackType.Warning);
  },

  /** Single error tap — never repeated. She's anxious enough. */
  verdictAvoid(): void {
    notify(Haptics.NotificationFeedbackType.Error);
  },

  verdictUnknown(): void {
    impact(Haptics.ImpactFeedbackStyle.Soft);
  },

  /** Convenience: play the signature for any verdict. */
  verdict(verdict: Verdict): void {
    switch (verdict) {
      case 'safe':
        haptics.verdictSafe();
        break;
      case 'caution':
        haptics.verdictCaution();
        break;
      case 'avoid':
        haptics.verdictAvoid();
        break;
      case 'unknown':
        haptics.verdictUnknown();
        break;
    }
  },
} as const;

export type HapticsMap = typeof haptics;
