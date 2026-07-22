/**
 * RemoteExpectaAPI — the future production client. Exists to prove the seam:
 * it implements the exact same ExpectaAPI contract the UI already consumes,
 * so swapping the backend in later is a one-flag change (see flags.ts).
 *
 * Not deployed in V1. Every method throws if actually invoked.
 */

import type { AnalysisResult, Product, Stage } from '@/engine/types';
import type { AnalysisEvent, ExpectaAPI, WeeklyTip } from './api';

/** Future production base URL. */
export const REMOTE_API_BASE_URL = 'https://api.expecta.app/v1';

const NOT_DEPLOYED =
  'RemoteExpectaAPI is not deployed. Flip USE_REMOTE_API off in src/services/flags.ts (V1 is local-only).';

export class RemoteExpectaAPI implements ExpectaAPI {
  // TODO(v2): open an SSE/WebSocket stream at
  //   POST `${REMOTE_API_BASE_URL}/analyze` { barcode, stage }
  // and re-emit server events 1:1 as AnalysisEvent — the analyzing screen
  // already renders exactly this stream from LocalExpectaAPI.
  // eslint-disable-next-line require-yield
  async *analyze(_barcode: string, _stage: Stage): AsyncGenerator<AnalysisEvent, AnalysisResult | null> {
    throw new Error(NOT_DEPLOYED);
  }

  // TODO(v2): GET `${REMOTE_API_BASE_URL}/products?q=` with debounce handled
  // server-side; response shape is Product[] straight from the resolver
  // waterfall (OFF/OBF → commercial UPC).
  async searchProducts(_query: string): Promise<Product[]> {
    throw new Error(NOT_DEPLOYED);
  }

  // TODO(v2): GET `${REMOTE_API_BASE_URL}/products/${barcode}`.
  async getProduct(_barcode: string): Promise<Product | null> {
    throw new Error(NOT_DEPLOYED);
  }

  // TODO(v2): GET `${REMOTE_API_BASE_URL}/tips/${week}`.
  async getWeeklyTip(_week: number): Promise<WeeklyTip | null> {
    throw new Error(NOT_DEPLOYED);
  }
}
