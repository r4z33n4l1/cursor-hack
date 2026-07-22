/**
 * Build-time feature flags for the service layer.
 * These are compile-time defaults; user-facing runtime toggles live in
 * `src/stores/settings.ts` (which seeds itself from these values).
 */

/**
 * When true, unknown *food-looking* barcodes fall through to a live
 * Open Food Facts lookup (the one genuinely real network call in V1).
 */
export const LIVE_OFF_ENABLED = true;

/**
 * Demo mode default: pins latency low, disables the random "slow analysis"
 * path, and enables the scan simulator. Toggleable at runtime via the hidden
 * dev menu (settings store).
 */
export const DEMO_MODE = false;

/**
 * Selects the API implementation returned by `getAPI()`.
 * false → LocalExpectaAPI (V1). true → RemoteExpectaAPI (stub, not deployed).
 */
export const USE_REMOTE_API = false;
