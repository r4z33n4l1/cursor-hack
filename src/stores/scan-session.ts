/**
 * Ephemeral handoff between the analyzing screen and the verdict screen.
 * Not persisted — history keeps the durable record; verdict re-runs the
 * engine locally when opened from history.
 */

import type { AnalysisResult } from '@/engine/types';

let lastResult: AnalysisResult | null = null;

export function stashAnalysis(result: AnalysisResult): void {
  lastResult = result;
}

export function takeAnalysis(barcode: string): AnalysisResult | null {
  if (lastResult && lastResult.product.barcode === barcode) return lastResult;
  return null;
}
