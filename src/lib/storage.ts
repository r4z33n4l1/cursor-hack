/**
 * Storage adapter — the ONLY file that touches the persistence backend.
 *
 * Trade-off (per spec): AsyncStorage instead of MMKV so the app runs in
 * Expo Go without a dev build. MMKV later is a one-file swap: reimplement
 * these four exports, nothing else changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/** Read + JSON-parse a value. Corrupt or missing data → null, never a throw. */
export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** JSON-stringify + write a value. */
export async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Delete a key. */
export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/**
 * Adapter for zustand's persist middleware:
 * `storage: createJSONStorage(() => zustandStorage)`.
 */
export const zustandStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};
