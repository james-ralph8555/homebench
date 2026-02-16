/**
 * @fileoverview Runtime capability detection and compatibility mode contract
 *
 * This module provides a unified interface for detecting browser capabilities
 * required by HomeBench and determining the compatibility mode.
 *
 * Compatibility modes:
 * - `full`: All required capabilities are available, all features work
 * - `degraded`: Some optional capabilities are missing, core features work
 * - `unsupported`: Required capabilities are missing, application cannot function
 */

import { logger } from '@/lib/logger';

// =============================================================================
// CAPABILITY MODE TYPES
// =============================================================================

/**
 * Compatibility mode indicates how well the browser supports HomeBench features
 *
 * - `full`: All capabilities available, optimal experience
 * - `degraded`: Core features work, some optional features limited/disabled
 * - `unsupported`: Critical capabilities missing, application cannot run
 */
export type CapabilityMode = 'full' | 'degraded' | 'unsupported';

/**
 * Individual capability check result
 */
export interface CapabilityCheck {
  /** Human-readable name of the capability */
  readonly name: string;
  /** Whether the capability is available */
  readonly available: boolean;
  /** Whether this capability is required for basic functionality */
  readonly required: boolean;
  /** Additional details about the capability (e.g., version, specific feature) */
  readonly details?: string;
  /** Reason why capability is not available (if unavailable) */
  readonly reason?: string;
}

/**
 * Complete capability report for the current browser environment
 */
export interface CapabilityReport {
  /** Overall compatibility mode */
  readonly mode: CapabilityMode;
  /** Individual capability checks */
  readonly capabilities: Readonly<Record<string, CapabilityCheck>>;
  /** User-friendly description of what works/doesn't work */
  readonly description: string;
  /** List of missing required capabilities (if any) */
  readonly missingRequired: readonly string[];
  /** List of missing optional capabilities (if any) */
  readonly missingOptional: readonly string[];
}

// =============================================================================
// CAPABILITY DEFINITIONS
// =============================================================================

/**
 * All capabilities to check, with their detection logic
 */
const CAPABILITIES: Record<string, () => Omit<CapabilityCheck, 'name'>> = {
  // Required capabilities
  opfs: () => {
    const hasNavigator = 'navigator' in globalThis;
    const hasStorage = hasNavigator && 'storage' in navigator;
    const hasGetDirectory = hasStorage && typeof navigator.storage.getDirectory === 'function';

    if (!hasNavigator) {
      return { available: false, required: true, reason: 'navigator object not available' };
    }
    if (!hasStorage) {
      return { available: false, required: true, reason: 'navigator.storage not available' };
    }
    if (!hasGetDirectory) {
      return {
        available: false,
        required: true,
        reason: 'navigator.storage.getDirectory not supported (requires Chrome 86+, Firefox 111+, Safari 15.2+)'
      };
    }
    return { available: true, required: true };
  },

  webAssembly: () => {
    const hasWasm = typeof WebAssembly === 'object' && WebAssembly !== null;
    if (!hasWasm) {
      return { available: false, required: true, reason: 'WebAssembly not supported' };
    }
    return { available: true, required: true };
  },

  webAssemblyStreaming: () => {
    const hasStreaming = typeof WebAssembly.compileStreaming === 'function';
    return {
      available: hasStreaming,
      required: false,
      details: hasStreaming ? 'Streaming compilation enabled' : 'Falling back to non-streaming compilation',
    };
  },

  broadcastChannel: () => {
    const hasBroadcastChannel = typeof BroadcastChannel === 'function';
    return {
      available: hasBroadcastChannel,
      required: true,
      reason: hasBroadcastChannel ? undefined : 'BroadcastChannel not supported (required for multi-tab)',
    };
  },

  localStorage: () => {
    try {
      const testKey = '__homebench_capability_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { available: true, required: true };
    } catch (e) {
      return {
        available: false,
        required: true,
        reason: `localStorage not accessible: ${(e as Error).message}`,
      };
    }
  },

  indexedDb: () => {
    const hasIndexedDB = 'indexedDB' in globalThis && typeof indexedDB.open === 'function';
    return {
      available: hasIndexedDB,
      required: true,
      reason: hasIndexedDB ? undefined : 'IndexedDB not supported',
    };
  },

  // Optional capabilities
  sharedArrayBuffer: () => {
    const hasSAB = typeof SharedArrayBuffer === 'function';
    return {
      available: hasSAB,
      required: false,
      details: hasSAB ? 'Available for threading' : 'Not available (requires COOP/COEP headers)',
      reason: hasSAB ? undefined : 'Requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers',
    };
  },

  coopCoep: () => {
    const hasSAB = typeof SharedArrayBuffer === 'function';
    // We infer COOP/COEP from SharedArrayBuffer availability
    // since SAB is only available with proper headers
    return {
      available: hasSAB,
      required: false,
      details: hasSAB ? 'COOP/COEP headers present' : 'COOP/COEP headers not set',
    };
  },

  worker: () => {
    const hasWorker = typeof Worker === 'function';
    return {
      available: hasWorker,
      required: true,
      reason: hasWorker ? undefined : 'Web Workers not supported',
    };
  },

  fetch: () => {
    const hasFetch = typeof fetch === 'function';
    return {
      available: hasFetch,
      required: true,
      reason: hasFetch ? undefined : 'Fetch API not supported',
    };
  },

  requestAnimationFrame: () => {
    const hasRAF = typeof requestAnimationFrame === 'function';
    return {
      available: hasRAF,
      required: true,
      reason: hasRAF ? undefined : 'requestAnimationFrame not supported',
    };
  },

  secureContext: () => {
    const isSecure = globalThis.location?.protocol === 'https:' ||
                     globalThis.location?.hostname === 'localhost' ||
                     globalThis.location?.hostname === '127.0.0.1';
    return {
      available: isSecure,
      required: true,
      reason: isSecure ? undefined : 'OPFS requires secure context (HTTPS or localhost)',
    };
  },
};

// =============================================================================
// CAPABILITY DETECTION
// =============================================================================

/**
 * Detect all capabilities and generate a capability report
 *
 * This function checks all defined capabilities and determines the
 * overall compatibility mode based on which required capabilities are missing.
 *
 * @returns Capability report with mode, individual checks, and description
 */
export function detectCapabilities(): CapabilityReport {
  const capabilities: Record<string, CapabilityCheck> = {};
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Run all capability checks
  for (const [key, checker] of Object.entries(CAPABILITIES)) {
    const result = checker();
    capabilities[key] = {
      name: key,
      ...result,
    };

    if (!result.available) {
      if (result.required) {
        missingRequired.push(key);
      } else {
        missingOptional.push(key);
      }
    }
  }

  // Determine compatibility mode
  let mode: CapabilityMode;
  let description: string;

  if (missingRequired.length > 0) {
    mode = 'unsupported';
    description = `HomeBench cannot run because required capabilities are missing: ${missingRequired.join(', ')}`;
  } else if (missingOptional.length > 0) {
    mode = 'degraded';
    description = `HomeBench is running with limited features. Optional capabilities not available: ${missingOptional.join(', ')}`;
  } else {
    mode = 'full';
    description = 'All capabilities available. HomeBench is running in full mode.';
  }

  logger.info('Capability detection complete:', { mode, missingRequired, missingOptional });

  return {
    mode,
    capabilities,
    description,
    missingRequired,
    missingOptional,
  } as const;
}

/**
 * Check if a specific capability is available
 *
 * @param capabilityKey - The key of the capability to check
 * @returns Whether the capability is available, or null if capability doesn't exist
 */
export function hasCapability(capabilityKey: string): boolean | null {
  const report = detectCapabilities();
  const capability = report.capabilities[capabilityKey];
  return capability?.available ?? null;
}

/**
 * Get the current compatibility mode
 *
 * @returns The current capability mode
 */
export function getCapabilityMode(): CapabilityMode {
  return detectCapabilities().mode;
}

/**
 * Check if the browser meets minimum requirements for HomeBench
 *
 * @returns true if browser can run HomeBench (full or degraded mode)
 */
export function isBrowserSupported(): boolean {
  const mode = getCapabilityMode();
  return mode === 'full' || mode === 'degraded';
}

/**
 * Get human-readable capability descriptions for UI display
 *
 * @returns Array of capability info for display
 */
export function getCapabilityDescriptions(): Array<{
  key: string;
  name: string;
  available: boolean;
  required: boolean;
  details?: string;
  reason?: string;
}> {
  const report = detectCapabilities();
  return Object.entries(report.capabilities).map(([key, cap]) => ({
    key,
    name: cap.name,
    available: cap.available,
    required: cap.required,
    details: cap.details,
    reason: cap.reason,
  }));
}

/**
 * Capability detector singleton for cached detection results
 *
 * Caches the capability report since capabilities don't change
 * during a session (except in very rare edge cases).
 */
class CapabilityDetector {
  private static instance: CapabilityDetector | null = null;
  private cachedReport: CapabilityReport | null = null;

  private constructor() {}

  public static getInstance(): CapabilityDetector {
    if (!CapabilityDetector.instance) {
      CapabilityDetector.instance = new CapabilityDetector();
    }
    return CapabilityDetector.instance;
  }

  /**
   * Get cached capability report or detect if not yet cached
   */
  public getReport(): CapabilityReport {
    if (!this.cachedReport) {
      this.cachedReport = detectCapabilities();
    }
    return this.cachedReport;
  }

  /**
   * Clear the cached report (useful for testing)
   */
  public clearCache(): void {
    this.cachedReport = null;
  }
}

/**
 * Get the capability report (cached)
 *
 * This is the primary export that should be used throughout the app.
 * It returns a cached report since capabilities don't change during a session.
 */
export function getCapabilityReport(): CapabilityReport {
  return CapabilityDetector.getInstance().getReport();
}
