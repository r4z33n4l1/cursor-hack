/**
 * App settings store. `demoMode` is the hidden toggle (long-press the
 * version number 5×) — it pins fake-network latency low, disables the
 * random slow-analysis path, skips live lookups, and unlocks the scan
 * simulator on the scan screen.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { DEMO_MODE, LIVE_OFF_ENABLED } from '@/services/flags';

export interface SettingsState {
  hapticsEnabled: boolean;
  /** User-facing switch for the live Open Food Facts fallthrough. */
  liveLookupsEnabled: boolean;
  /** Hidden dev toggle. */
  demoMode: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  setLiveLookupsEnabled: (enabled: boolean) => void;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      liveLookupsEnabled: LIVE_OFF_ENABLED,
      demoMode: DEMO_MODE,

      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setLiveLookupsEnabled: (enabled) => set({ liveLookupsEnabled: enabled }),
      setDemoMode: (enabled) => set({ demoMode: enabled }),
      toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
    }),
    {
      name: 'expecta.settings',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
