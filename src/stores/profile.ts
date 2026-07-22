/**
 * User profile store. Stage is always DERIVED from dueDate / nursing / ttc
 * via the helpers below — never stored raw, so it can't go stale as the
 * pregnancy progresses.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Stage, UserProfile } from '@/engine/types';
import { zustandStorage } from '@/lib/storage';

const FULL_TERM_WEEKS = 40;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_PROFILE: UserProfile = {
  name: undefined,
  dueDate: undefined,
  nursing: false,
  ttc: false,
  onboarded: false,
};

export interface ProfileState extends UserProfile {
  setName: (name: string | undefined) => void;
  /** Setting a due date means "pregnant" — clears nursing/ttc. */
  setDueDate: (dueDate: string | undefined) => void;
  setNursing: (nursing: boolean) => void;
  setTTC: (ttc: boolean) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,

      setName: (name) => set({ name }),

      setDueDate: (dueDate) =>
        set(dueDate !== undefined ? { dueDate, nursing: false, ttc: false } : { dueDate }),

      setNursing: (nursing) => set(nursing ? { nursing: true, ttc: false } : { nursing: false }),

      setTTC: (ttc) => set(ttc ? { ttc: true, nursing: false } : { ttc: false }),

      completeOnboarding: () => set({ onboarded: true }),

      reset: () => set({ ...DEFAULT_PROFILE }),
    }),
    {
      name: 'expecta.profile',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

// ---------------------------------------------------------------------------
// Derived helpers (pure functions — usable from services, screens, tests)
// ---------------------------------------------------------------------------

/**
 * Journey stage right now.
 * nursing → 'nursing'; ttc with no due date → 'ttc'; otherwise trimester
 * from due date (week ≤13 → t1, 14–27 → t2, ≥28 → t3). No signals → 'ttc'.
 */
export function currentStage(profile: UserProfile): Stage {
  if (profile.nursing) return 'nursing';
  if (profile.ttc && !profile.dueDate) return 'ttc';
  const week = weekFromDueDate(profile.dueDate);
  if (week === null) return 'ttc';
  if (week <= 13) return 't1';
  if (week <= 27) return 't2';
  return 't3';
}

/** Current pregnancy week (1–42), or null when not pregnant / no due date. */
export function currentWeek(profile: UserProfile): number | null {
  if (profile.nursing) return null;
  return weekFromDueDate(profile.dueDate);
}

/** Whole days until the due date (negative = overdue), or null. */
export function daysUntilDue(profile: UserProfile): number | null {
  const due = parseDueDate(profile.dueDate);
  if (due === null) return null;
  return Math.ceil((due - Date.now()) / MS_PER_DAY);
}

function weekFromDueDate(dueDate: string | undefined): number | null {
  const due = parseDueDate(dueDate);
  if (due === null) return null;
  const daysLeft = Math.ceil((due - Date.now()) / MS_PER_DAY);
  const week = FULL_TERM_WEEKS - Math.floor(daysLeft / 7);
  return Math.min(Math.max(week, 1), 42);
}

function parseDueDate(dueDate: string | undefined): number | null {
  if (!dueDate) return null;
  const ts = Date.parse(dueDate);
  return Number.isNaN(ts) ? null : ts;
}
