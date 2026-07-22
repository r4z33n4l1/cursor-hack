/**
 * Scan history store. Newest-first, capped, with consecutive-duplicate
 * collapsing so a jittery camera re-firing the same barcode doesn't spam
 * the list.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ScanRecord } from '@/engine/types';
import { zustandStorage } from '@/lib/storage';

/** Max records kept (oldest fall off). */
const MAX_RECORDS = 200;

/** A rescan of the same barcode within this window replaces the last entry. */
const DEDUPE_WINDOW_MS = 2 * 60 * 1000;

export interface HistoryState {
  records: ScanRecord[];
  /**
   * Prepend a scan. If the newest record is the same barcode scanned within
   * the last 2 minutes, it is replaced (fresh verdict/stage/timestamp) rather
   * than duplicated.
   */
  addScan: (record: ScanRecord) => void;
  /** Remove one record by id (swipe-to-delete). */
  removeScan: (id: string) => void;
  clear: () => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],

      addScan: (record) =>
        set((state) => {
          const newest = state.records[0];
          const isDuplicate =
            newest !== undefined &&
            newest.barcode === record.barcode &&
            record.scannedAt - newest.scannedAt < DEDUPE_WINDOW_MS;
          const rest = isDuplicate ? state.records.slice(1) : state.records;
          return { records: [record, ...rest].slice(0, MAX_RECORDS) };
        }),

      removeScan: (id) =>
        set((state) => ({ records: state.records.filter((r) => r.id !== id) })),

      clear: () => set({ records: [] }),
    }),
    {
      name: 'expecta.history',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
