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
 * Two bundles are available:
 * - MVP: Smaller, no threading support, works everywhere
 * - EH: Enhanced with SIMD, better performance, requires no special headers
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
} as const;

/**
 * Asset filenames (without path) for copy scripts
 */
export const DUCKDB_ASSET_FILES = {
  MVP: ['duckdb-mvp.wasm', 'duckdb-browser-mvp.worker.js'] as const,
  EH: ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js'] as const,
} as const;

/**
 * All DuckDB asset files that need to be copied
 */
export const ALL_DUCKDB_ASSET_FILES = [
  ...DUCKDB_ASSET_FILES.MVP,
  ...DUCKDB_ASSET_FILES.EH,
] as const;

// =============================================================================
// BUNDLE CONFIGURATION
// =============================================================================

/**
 * DuckDB bundle type
 */
export type DuckDBBundleType = 'mvp' | 'eh';

/**
 * Bundle configuration for use with @duckdb/duckdb-wasm's selectBundle
 *
 * This object can be passed directly to duckdb.selectBundle()
 * to automatically choose the best bundle for the current browser.
 */
export const DUCKDB_BUNDLES = {
  mvp: {
    mainModule: DUCKDB_ASSETS.MVP_WASM,
    mainWorker: DUCKDB_ASSETS.MVP_WORKER,
  },
  eh: {
    mainModule: DUCKDB_ASSETS.EH_WASM,
    mainWorker: DUCKDB_ASSETS.EH_WORKER,
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
