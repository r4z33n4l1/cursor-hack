/**
 * ExpectaAPI — the single seam between the app and the "backend".
 *
 * V1 ships LocalExpectaAPI (seed DB + local engine + fake network physics).
 * A future RemoteExpectaAPI implements the exact same contract over HTTP/SSE;
 * no screen ever knows the difference.
 */

import type { AnalysisResult, Product, Stage } from '@/engine/types';
import { USE_REMOTE_API } from './flags';

/** Metro provides CommonJS require at runtime; declare it module-locally. */
declare const require: (id: string) => unknown;

/**
 * Progress events emitted by the analysis pipeline, in order:
 * identified → parsing → crossref → verdict.
 * A real backend would emit the same shapes over SSE/WebSocket.
 */
export type AnalysisEvent =
  | { type: 'identified'; product: Product }
  | { type: 'parsing'; ingredientCount: number }
  | { type: 'crossref'; matchedCount: number; sources: string[] }
  | { type: 'verdict'; result: AnalysisResult };

/** A week's insight-card content. */
export interface WeeklyTip {
  title: string;
  body: string;
}

export interface ExpectaAPI {
  /**
   * Analyze a barcode for a stage. Yields pipeline events as "the server"
   * works, then returns the full result — or null if the product could not
   * be resolved (unknown barcode, no live match).
   *
   * Cancel-safe: consumers may stop iterating at any point (user backs out
   * of the scan); abandoned delays resolve harmlessly.
   */
  analyze(barcode: string, stage: Stage): AsyncGenerator<AnalysisEvent, AnalysisResult | null>;

  /** Substring search over name/brand, latency-simulated. */
  searchProducts(query: string): Promise<Product[]>;

  /** Direct barcode lookup (no pipeline theater). */
  getProduct(barcode: string): Promise<Product | null>;

  /** Stage-specific insight card content for a pregnancy week (1–40). */
  getWeeklyTip(week: number): Promise<WeeklyTip | null>;
}

let instance: ExpectaAPI | null = null;

/**
 * Factory for the app-wide API instance. Remote impl is selectable via the
 * USE_REMOTE_API flag — it exists to prove the seam, not to be called.
 * (The impl modules only import types from this file, so the runtime
 * import graph stays acyclic.)
 */
export function getAPI(): ExpectaAPI {
  if (!instance) {
    // Lazy imports keep module init order safe and let tree-shaking drop
    // whichever impl the flag never selects.
    if (USE_REMOTE_API) {
      const { RemoteExpectaAPI } = jitRequire<typeof import('./remote-api')>(() => require('./remote-api'));
      instance = new RemoteExpectaAPI();
    } else {
      const { LocalExpectaAPI } = jitRequire<typeof import('./local-api')>(() => require('./local-api'));
      instance = new LocalExpectaAPI();
    }
  }
  return instance;
}

/** Typed wrapper around Metro's CommonJS require. */
function jitRequire<T>(load: () => unknown): T {
  return load() as T;
}
