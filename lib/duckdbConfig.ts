/**
 * @fileoverview Single source of truth for DuckDB WASM runtime configuration
 *
 * This module centralizes all DuckDB-related configuration including:
 * - Version number (synced with package.json dependency)
 * - Asset paths for WASM and worker files
 * - Bundle definitions for different browser capabilities
 *
 * All consumers should import from this module to ensure consistency.
 * The version should be updated when upgrading @duckdb/duckdb-wasm.
 */

// =============================================================================
// VERSION CONFIGURATION
// =============================================================================

/**
 * DuckDB WASM version
 *
 * This should match the version in package.json's @duckdb/duckdb-wasm dependency.
 * Update this when upgrading the npm package.
 */
export const DUCKDB_VERSION = '1.29.1-dev269.0';

/**
 * Base URL for all DuckDB static assets
 *
 * Assets are served from public/duckdb/{version}/ during development
 * and from the same path in production builds.
 */
export const DUCKDB_BASE_URL = `/duckdb/${DUCKDB_VERSION}`;

// =============================================================================
// ASSET PATHS
// =============================================================================

/**
 * Individual asset paths for DuckDB WASM bundles
 *
 * Three bundles are available:
 * - MVP: Smaller, no threading support, works everywhere
 * - EH: Enhanced with SIMD, better performance, no special headers required
 * - COI: Cross-Origin Isolation with threading support, requires COOP/COEP headers
 */
export const DUCKDB_ASSETS = {
  /** MVP WASM module - smaller, no threading */
  MVP_WASM: `${DUCKDB_BASE_URL}/duckdb-mvp.wasm`,
  /** MVP worker script */
  MVP_WORKER: `${DUCKDB_BASE_URL}/duckdb-browser-mvp.worker.js`,
  /** EH WASM module - enhanced with SIMD */
  EH_WASM: `${DUCKDB_BASE_URL}/duckdb-eh.wasm`,
  /** EH worker script */
  EH_WORKER: `${DUCKDB_BASE_URL}/duckdb-browser-eh.worker.js`,
  /** COI WASM module - threading support (requires COOP/COEP) */
  COI_WASM: `${DUCKDB_BASE_URL}/duckdb-coi.wasm`,
  /** COI worker script */
  COI_WORKER: `${DUCKDB_BASE_URL}/duckdb-browser-coi.worker.js`,
  /** COI pthread worker script for threading */
  COI_PTHREAD_WORKER: `${DUCKDB_BASE_URL}/duckdb-browser-coi.pthread.worker.js`,
} as const;

/**
 * Asset filenames (without path) for copy scripts
 */
export const DUCKDB_ASSET_FILES = {
  MVP: ['duckdb-mvp.wasm', 'duckdb-browser-mvp.worker.js'] as const,
  EH: ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js'] as const,
  COI: ['duckdb-coi.wasm', 'duckdb-browser-coi.worker.js', 'duckdb-browser-coi.pthread.worker.js'] as const,
} as const;

/**
 * All DuckDB asset files that need to be copied
 */
export const ALL_DUCKDB_ASSET_FILES = [
  ...DUCKDB_ASSET_FILES.MVP,
  ...DUCKDB_ASSET_FILES.EH,
  ...DUCKDB_ASSET_FILES.COI,
] as const;

// =============================================================================
// BUNDLE CONFIGURATION
// =============================================================================

/**
 * DuckDB bundle type
 */
export type DuckDBBundleType = 'mvp' | 'eh' | 'coi';

/**
 * Bundle configuration for use with @duckdb/duckdb-wasm's selectBundle
 *
 * This object can be passed directly to duckdb.selectBundle()
 * to automatically choose the best bundle for the current browser.
 *
 * For capability-gated threading, use selectBundleByCapability() instead.
 */
export const DUCKDB_BUNDLES = {
  mvp: {
    mainModule: DUCKDB_ASSETS.MVP_WASM,
    mainWorker: DUCKDB_ASSETS.MVP_WORKER,
    pthreadWorker: null,
  },
  eh: {
    mainModule: DUCKDB_ASSETS.EH_WASM,
    mainWorker: DUCKDB_ASSETS.EH_WORKER,
    pthreadWorker: null,
  },
  coi: {
    mainModule: DUCKDB_ASSETS.COI_WASM,
    mainWorker: DUCKDB_ASSETS.COI_WORKER,
    pthreadWorker: DUCKDB_ASSETS.COI_PTHREAD_WORKER,
  },
} as const;

// =============================================================================
// PRELOAD CONFIGURATION
// =============================================================================

/**
 * Assets recommended for preload in the HTML head
 *
 * Preloading the EH bundle is recommended for most users as it provides
 * better performance. The MVP bundle serves as a fallback.
 */
export const PRELOAD_ASSETS = {
  WASM: DUCKDB_ASSETS.EH_WASM,
  WORKER: DUCKDB_ASSETS.EH_WORKER,
} as const;

/**
 * Get the destination directory for copied DuckDB assets
 */
export function getDuckDbPublicPath(): string {
  return `public/duckdb/${DUCKDB_VERSION}`;
}

// =============================================================================
// CAPABILITY-GATED BUNDLE SELECTION
// =============================================================================

/**
 * DuckDB bundle configuration with optional threading support
 */
export interface DuckDBBundleConfig {
  mainModule: string;
  mainWorker: string;
  pthreadWorker: string | null;
}

/**
 * Result of bundle selection with threading capability info
 */
export interface BundleSelectionResult {
  /** Selected bundle type */
  bundleType: DuckDBBundleType;
  /** The bundle configuration */
  bundle: DuckDBBundleConfig;
  /** Whether threading is enabled */
  threadingEnabled: boolean;
  /** Reason for the selection */
  reason: string;
}

/**
 * Select the appropriate DuckDB bundle based on browser capabilities
 *
 * Threading (COI bundle) requires:
 * - SharedArrayBuffer available (implies COOP/COEP headers present)
 * - Cross-origin isolated context
 *
 * Falls back gracefully:
 * - COI bundle with threading if all prerequisites met
 * - EH bundle (SIMD, no threading) if SIMD supported but no COOP/COEP
 * - MVP bundle as final fallback
 *
 * @param hasThreadingCapabilities - Whether the browser supports threading (SAB + COOP/COEP)
 * @returns Bundle selection result with type and configuration
 */
export function selectBundleByCapability(hasThreadingCapabilities: boolean): BundleSelectionResult {
  if (hasThreadingCapabilities) {
    return {
      bundleType: 'coi',
      bundle: DUCKDB_BUNDLES.coi,
      threadingEnabled: true,
      reason: 'COI bundle with threading enabled (COOP/COEP headers present, SharedArrayBuffer available)',
    };
  }

  // Check for SIMD support (EH bundle)
  // SIMD is available in most modern browsers without special headers
  const hasSimd = typeof WebAssembly !== 'undefined' &&
    WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));

  if (hasSimd) {
    return {
      bundleType: 'eh',
      bundle: DUCKDB_BUNDLES.eh,
      threadingEnabled: false,
      reason: 'EH bundle with SIMD (no COOP/COEP headers, threading unavailable)',
    };
  }

  return {
    bundleType: 'mvp',
    bundle: DUCKDB_BUNDLES.mvp,
    threadingEnabled: false,
    reason: 'MVP bundle (no SIMD support, no threading)',
  };
}
