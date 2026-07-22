/**
 * Demo-mode helpers: the rehearsed hero-product script and a scan simulator
 * so the full scan → analyze → verdict flow plays even when demo lighting
 * (or the iOS simulator's lack of a camera) kills real barcode detection.
 */

import { createJitter, hashSeed, sleep } from './fake-network';
import { findSeedProduct, getSeedProducts } from './engine-bridge';

export interface DemoScriptEntry {
  barcode: string;
  label: string;
}

/** Hero barcodes for the 3-minute demo, in run order (all seed-backed). */
export const DEMO_SCRIPT: DemoScriptEntry[] = [
  { barcode: '0362600014189', label: 'Retinol Serum 0.5% (the cold open — Avoid)' },
  { barcode: '0300450449566', label: 'Tylenol Extra Strength (green relief moment)' },
  { barcode: '0611269991000', label: 'Cold Brew Coffee (caffeine dose math)' },
  { barcode: '0305730154307', label: 'Advil Ibuprofen (verdict flips by trimester)' },
  { barcode: '0362600014196', label: 'Niacinamide Serum (safe skincare swap)' },
  { barcode: '0031604026165', label: 'Prenatal Gummies (safe + encouraged)' },
  { barcode: '0080000513403', label: 'Chunk Light Tuna (mercury caution)' },
  { barcode: '0021130046026', label: 'Double Crème Brie (listeria nuance)' },
];

/**
 * The demo script filtered to entries that actually resolve in the seed DB —
 * never hand the presenter a barcode that dead-ends.
 */
export function getDemoScript(): DemoScriptEntry[] {
  return DEMO_SCRIPT.filter((entry) => findSeedProduct(entry.barcode) !== null);
}

/** Shaped like expo-camera's barcode scanning result, minimally. */
export interface SimulatedBarcodeHit {
  type: 'ean13' | 'upc_a' | 'ean8';
  data: string;
}

/**
 * Fake a camera hit: a short jittered "lock-on" delay (deterministic per
 * barcode, so rehearsals feel identical), then a barcode event the scan
 * screen can feed into its normal detection handler.
 */
export async function simulateScan(barcode: string): Promise<SimulatedBarcodeHit> {
  const jitter = createJitter(hashSeed(`sim:${barcode}`));
  await sleep(Math.max(150, jitter(420, 170)));
  return { type: symbologyFor(barcode), data: barcode };
}

/** Cycle through the demo script (backing "shutter" button on the scan screen). */
let scriptCursor = 0;
export function nextDemoBarcode(): string | null {
  const script = getDemoScript();
  const pool = script.length > 0 ? script.map((e) => e.barcode) : fallbackPool();
  if (pool.length === 0) return null;
  const barcode = pool[scriptCursor % pool.length];
  scriptCursor += 1;
  return barcode;
}

/** Any seed product at all — last resort so the simulator never dead-ends. */
function fallbackPool(): string[] {
  return getSeedProducts()
    .slice(0, 8)
    .map((p) => p.barcode);
}

function symbologyFor(barcode: string): SimulatedBarcodeHit['type'] {
  if (barcode.length === 8) return 'ean8';
  if (barcode.length === 12) return 'upc_a';
  return 'ean13';
}
