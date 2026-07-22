/**
 * Lazy bridge to the verdict engine (src/engine) and the seed data (src/data),
 * which are built by a concurrent workstream. Everything is loaded at first
 * use behind runtime guards so the services layer typechecks — and degrades
 * gracefully — even if those modules are still landing.
 *
 * Once `src/engine/index.ts` exports `analyze`, this bridge simply forwards
 * to it; the guarded fallback never runs.
 */

import type { AnalysisResult, Product, Stage, StageResult } from '@/engine/types';
import { STAGES } from '@/engine/types';
import type { WeeklyTip } from './api';

/** Metro provides CommonJS require at runtime; declare it module-locally. */
declare const require: (id: string) => unknown;

type AnalyzeFn = (product: Product, scannedStage: Stage) => AnalysisResult;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

let engineAnalyze: AnalyzeFn | null | undefined;

function loadEngineAnalyze(): AnalyzeFn | null {
  if (engineAnalyze !== undefined) return engineAnalyze;
  try {
    const mod = require('@/engine');
    const fn = (mod as { analyze?: unknown } | null | undefined)?.analyze;
    engineAnalyze = typeof fn === 'function' ? (fn as AnalyzeFn) : null;
  } catch {
    engineAnalyze = null;
  }
  return engineAnalyze;
}

/** True once src/engine/index.ts exists and exports `analyze`. */
export function isEngineAvailable(): boolean {
  return loadEngineAnalyze() !== null;
}

/**
 * Run the engine's `analyze(product, scannedStage)`. If the engine module
 * is not present yet, returns an honest all-unknown result so the scan flow
 * still completes instead of crashing.
 */
export function runEngineAnalyze(product: Product, scannedStage: Stage): AnalysisResult {
  const analyze = loadEngineAnalyze();
  if (analyze) return analyze(product, scannedStage);

  const perStage = {} as Record<Stage, StageResult>;
  for (const stage of STAGES) {
    perStage[stage] = {
      stage,
      verdict: 'unknown',
      findings: [],
      unmatched: [...product.ingredients],
    };
  }
  return {
    product,
    scannedStage,
    perStage,
    reasoning: [],
    analyzedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Seed products
// ---------------------------------------------------------------------------

let seedProducts: Product[] | undefined;

/** Seed product catalog (~120 hand-curated products). Empty if not landed yet. */
export function getSeedProducts(): Product[] {
  if (seedProducts !== undefined) return seedProducts;
  try {
    const raw = require('@/data/products.seed.json');
    const list = Array.isArray(raw) ? raw : (raw as { products?: unknown } | null | undefined)?.products;
    seedProducts = Array.isArray(list)
      ? (list.filter(isProductLike) as Product[])
      : [];
  } catch {
    seedProducts = [];
  }
  return seedProducts;
}

function isProductLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<Product>;
  return typeof p.barcode === 'string' && typeof p.name === 'string' && Array.isArray(p.ingredients);
}

/** Barcode → seed product, or null. */
export function findSeedProduct(barcode: string): Product | null {
  const trimmed = barcode.trim();
  return getSeedProducts().find((p) => p.barcode === trimmed) ?? null;
}

// ---------------------------------------------------------------------------
// Weekly tips
// ---------------------------------------------------------------------------

let weeklyTips: Map<number, WeeklyTip> | undefined;

/**
 * Tip for a pregnancy week. Tolerant of either seed shape:
 * `[{ week, title, body }, ...]` or `{ "22": { title, body }, ... }`.
 */
export function findWeeklyTip(week: number): WeeklyTip | null {
  if (weeklyTips === undefined) {
    weeklyTips = new Map<number, WeeklyTip>();
    try {
      const raw = require('@/data/tips.weekly.json');
      const rawList = Array.isArray(raw)
        ? raw
        : (raw as { tips?: unknown } | null | undefined)?.tips;
      if (Array.isArray(rawList)) {
        for (const entry of rawList) {
          const tip = normalizeTip(entry, (entry as { week?: unknown } | null)?.week);
          if (tip) weeklyTips.set(tip.week, tip.value);
        }
      } else if (typeof raw === 'object' && raw !== null) {
        for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
          const tip = normalizeTip(entry, key);
          if (tip) weeklyTips.set(tip.week, tip.value);
        }
      }
    } catch {
      // No tips seed yet — every lookup returns null.
    }
  }
  return weeklyTips.get(Math.round(week)) ?? null;
}

function normalizeTip(entry: unknown, weekRaw: unknown): { week: number; value: WeeklyTip } | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const { title, body } = entry as { title?: unknown; body?: unknown };
  const week = typeof weekRaw === 'number' ? weekRaw : Number.parseInt(String(weekRaw), 10);
  if (!Number.isFinite(week)) return null;
  if (typeof title !== 'string' || typeof body !== 'string') return null;
  return { week, value: { title, body } };
}
