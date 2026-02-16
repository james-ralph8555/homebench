/**
 * @fileoverview Memory budget manager and large-data guardrails
 *
 * This module provides centralized memory management policies for HomeBench,
 * specifically designed to work within WebAssembly 32-bit memory constraints.
 *
 * Key concepts:
 * - JS Heap: Browser-managed JavaScript heap memory
 * - DuckDB Memory: Memory used by DuckDB WASM module (shares the 4GB limit)
 * - 4GB WASM Limit: Hard ceiling for WebAssembly 32-bit address space
 *
 * Memory zones:
 * - Safe (0-50%): Normal operation, no warnings
 * - Caution (50-75%): Warning displayed, suggest monitoring
 * - Warning (75-90%): Strong warning, suggest data reduction
 * - Critical (90%+): Block large operations, require explicit user action
 */

import { logger } from '@/lib/logger';

// =============================================================================
// MEMORY CONSTANTS
// =============================================================================

/**
 * WebAssembly 32-bit memory limit in bytes
 * This is the hard ceiling for all WASM memory including DuckDB
 */
export const WASM_32BIT_LIMIT = 4 * 1024 * 1024 * 1024; // 4GB

/**
 * Conservative safe memory limit (leave headroom for browser, UI, etc.)
 * DuckDB and data should stay under this to avoid crashes
 */
export const SAFE_MEMORY_LIMIT = 3 * 1024 * 1024 * 1024; // 3GB

/**
 * Memory zone thresholds (as percentages of WASM limit)
 */
export const MEMORY_ZONES = {
  /** Safe zone: 0-50% - normal operation */
  SAFE: 50,
  /** Caution zone: 50-75% - display warning */
  CAUTION: 75,
  /** Warning zone: 75-90% - strong warning */
  WARNING: 90,
  /** Critical zone: 90%+ - block operations */
  CRITICAL: 90,
} as const;

/**
 * File size thresholds for preflight checks
 */
export const FILE_SIZE_THRESHOLDS = {
  /** Small files: no warning needed */
  SMALL: 100 * 1024 * 1024, // 100MB
  /** Medium files: caution warning */
  MEDIUM: 500 * 1024 * 1024, // 500MB
  /** Large files: strong warning */
  LARGE: 1 * 1024 * 1024 * 1024, // 1GB
  /** Very large files: require confirmation */
  VERY_LARGE: 2 * 1024 * 1024 * 1024, // 2GB
  /** Maximum file size (4GB limit) */
  MAX: WASM_32BIT_LIMIT,
} as const;

/**
 * Query result thresholds for preflight checks
 */
export const QUERY_RESULT_THRESHOLDS = {
  /** Safe row count for rendering */
  SAFE_ROWS: 10000,
  /** Rows that trigger pagination recommendation */
  PAGINATION_ROWS: 50000,
  /** Rows that trigger strong warning */
  WARNING_ROWS: 100000,
  /** Rows that may cause performance issues */
  MAX_SAFE_ROWS: 500000,
  /** Estimated bytes per row (conservative) */
  BYTES_PER_ROW: 256,
} as const;

// =============================================================================
// MEMORY ZONE TYPES
// =============================================================================

export type MemoryZone = 'safe' | 'caution' | 'warning' | 'critical';

export interface MemoryStatus {
  /** Current memory zone */
  readonly zone: MemoryZone;
  /** JS heap usage (if available) */
  readonly jsHeapUsed: number | null;
  /** JS heap limit (if available) */
  readonly jsHeapLimit: number | null;
  /** Percentage of WASM limit used (estimated) */
  readonly wasmUsagePercent: number;
  /** Whether memory API is available */
  readonly memoryApiAvailable: boolean;
  /** Human-readable description */
  readonly description: string;
  /** Recommended actions (if any) */
  readonly recommendations: readonly string[];
}

export interface FilePreflightResult {
  /** Whether the file can be safely loaded */
  readonly allowed: boolean;
  /** Warning level */
  readonly level: 'none' | 'info' | 'warning' | 'error';
  /** User-facing message */
  readonly message: string;
  /** Technical details */
  readonly details?: string;
  /** Whether user confirmation is required */
  readonly requiresConfirmation: boolean;
}

export interface QueryPreflightResult {
  /** Whether the query should proceed */
  readonly allowed: boolean;
  /** Estimated memory usage in bytes */
  readonly estimatedMemory: number;
  /** Estimated row count (if available) */
  readonly estimatedRows?: number;
  /** Warning level */
  readonly level: 'none' | 'info' | 'warning' | 'error';
  /** User-facing message */
  readonly message: string;
  /** Recommended actions */
  readonly recommendations: readonly string[];
}

// =============================================================================
// MEMORY BUDGET MANAGER CLASS
// =============================================================================

/**
 * Memory Budget Manager
 *
 * Centralizes all memory-related policies and provides:
 * - Current memory status detection
 * - File upload preflight checks
 * - Query result size preflight checks
 * - Clear JS heap vs DuckDB memory distinction
 */
class MemoryBudgetManager {
  private static instance: MemoryBudgetManager | null = null;

  private constructor() {}

  public static getInstance(): MemoryBudgetManager {
    if (!MemoryBudgetManager.instance) {
      MemoryBudgetManager.instance = new MemoryBudgetManager();
    }
    return MemoryBudgetManager.instance;
  }

  // ---------------------------------------------------------------------------
  // MEMORY STATUS DETECTION
  // ---------------------------------------------------------------------------

  /**
   * Get current memory status
   *
   * Uses performance.memory API when available (Chrome/Edge only).
   * Falls back to conservative estimates for other browsers.
   */
  public getMemoryStatus(): MemoryStatus {
    const memoryApi = this.getMemoryApi();

    if (!memoryApi) {
      return {
        zone: 'safe',
        jsHeapUsed: null,
        jsHeapLimit: null,
        wasmUsagePercent: 0,
        memoryApiAvailable: false,
        description: 'Memory monitoring unavailable in this browser',
        recommendations: ['Use Chrome or Edge for memory monitoring'],
      };
    }

    const jsHeapUsed = memoryApi.usedJSHeapSize;
    const jsHeapLimit = memoryApi.jsHeapSizeLimit;
    const wasmUsagePercent = (jsHeapUsed / WASM_32BIT_LIMIT) * 100;

    const zone = this.getZoneFromPercent(wasmUsagePercent);
    const description = this.getZoneDescription(zone);
    const recommendations = this.getZoneRecommendations(zone, wasmUsagePercent);

    return {
      zone,
      jsHeapUsed,
      jsHeapLimit,
      wasmUsagePercent,
      memoryApiAvailable: true,
      description,
      recommendations,
    };
  }

  /**
   * Get memory API if available
   */
  private getMemoryApi(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null {
    const memory = (performance as any).memory;
    if (memory && typeof memory.usedJSHeapSize === 'number') {
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Determine memory zone from usage percentage
   */
  private getZoneFromPercent(percent: number): MemoryZone {
    if (percent >= MEMORY_ZONES.CRITICAL) return 'critical';
    if (percent >= MEMORY_ZONES.WARNING) return 'warning';
    if (percent >= MEMORY_ZONES.CAUTION) return 'caution';
    return 'safe';
  }

  /**
   * Get human-readable description for memory zone
   */
  private getZoneDescription(zone: MemoryZone): string {
    switch (zone) {
      case 'safe':
        return 'Memory usage is normal';
      case 'caution':
        return 'Memory usage is elevated - monitor large operations';
      case 'warning':
        return 'High memory usage - consider reducing dataset size';
      case 'critical':
        return 'Critical memory usage - large operations blocked';
    }
  }

  /**
   * Get recommendations for memory zone
   */
  private getZoneRecommendations(zone: MemoryZone, percent: number): string[] {
    const recommendations: string[] = [];

    if (zone === 'caution') {
      recommendations.push('Avoid loading very large files');
      recommendations.push('Consider using LIMIT in queries');
    } else if (zone === 'warning') {
      recommendations.push('Reduce dataset size before loading more data');
      recommendations.push('Use LIMIT clauses in queries');
      recommendations.push('Consider exporting and removing unused tables');
    } else if (zone === 'critical') {
      recommendations.push('Save your work and refresh the page');
      recommendations.push('Reduce dataset size immediately');
      recommendations.push('Large file uploads are blocked until memory is freed');
    }

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // FILE PREFLIGHT CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check if a file can be safely loaded
   *
   * @param fileSize - File size in bytes
   * @param fileType - File type (csv, parquet, json, etc.)
   * @returns Preflight result with warnings and requirements
   */
  public checkFileUpload(
    fileSize: number,
    fileType: string
  ): FilePreflightResult {
    const status = this.getMemoryStatus();

    // Critical memory zone: block large uploads
    if (status.zone === 'critical') {
      return {
        allowed: false,
        level: 'error',
        message: 'Memory is critically low. Save your work and refresh before uploading.',
        details: `Current memory usage: ${status.wasmUsagePercent.toFixed(1)}%`,
        requiresConfirmation: false,
      };
    }

    // File exceeds hard limit
    if (fileSize > FILE_SIZE_THRESHOLDS.MAX) {
      return {
        allowed: false,
        level: 'error',
        message: `File too large. Maximum size is ${this.formatSize(FILE_SIZE_THRESHOLDS.MAX)} due to WebAssembly limits.`,
        details: `File size: ${this.formatSize(fileSize)}`,
        requiresConfirmation: false,
      };
    }

    // Estimate memory impact (files typically expand 2-5x in memory)
    const expansionFactor = this.getExpansionFactor(fileType);
    const estimatedMemory = fileSize * expansionFactor;
    const projectedUsage = status.jsHeapUsed
      ? ((status.jsHeapUsed + estimatedMemory) / WASM_32BIT_LIMIT) * 100
      : 0;

    // Very large files with potential memory issues
    if (fileSize > FILE_SIZE_THRESHOLDS.VERY_LARGE) {
      return {
        allowed: true,
        level: 'warning',
        message: `Very large file (${this.formatSize(fileSize)}). May take significant time and memory.`,
        details: `Estimated memory impact: ${this.formatSize(estimatedMemory)}`,
        requiresConfirmation: true,
      };
    }

    // Large files in warning zone
    if (status.zone === 'warning' && fileSize > FILE_SIZE_THRESHOLDS.MEDIUM) {
      return {
        allowed: true,
        level: 'warning',
        message: `Memory is high. This file may cause performance issues.`,
        details: `Current: ${status.wasmUsagePercent.toFixed(1)}%, Projected: ${projectedUsage.toFixed(1)}%`,
        requiresConfirmation: true,
      };
    }

    // Large files
    if (fileSize > FILE_SIZE_THRESHOLDS.LARGE) {
      return {
        allowed: true,
        level: 'info',
        message: `Large file (${this.formatSize(fileSize)}). Consider splitting into smaller files.`,
        details: `Estimated memory impact: ${this.formatSize(estimatedMemory)}`,
        requiresConfirmation: false,
      };
    }

    // Medium files
    if (fileSize > FILE_SIZE_THRESHOLDS.MEDIUM) {
      return {
        allowed: true,
        level: 'info',
        message: `Medium-sized file (${this.formatSize(fileSize)}).`,
        requiresConfirmation: false,
      };
    }

    // Small files: no warning needed
    return {
      allowed: true,
      level: 'none',
      message: '',
      requiresConfirmation: false,
    };
  }

  /**
   * Get memory expansion factor for file type
   *
   * Different formats have different in-memory expansion rates.
   * Parquet is most efficient, CSV/JSON expand significantly.
   */
  private getExpansionFactor(fileType: string): number {
    const type = fileType.toLowerCase();
    if (type === 'parquet') return 1.5; // Efficient columnar format
    if (type === 'json' || type === 'jsonl' || type === 'ndjson') return 5; // JSON parsing overhead
    if (type === 'csv') return 3; // Text parsing overhead
    if (type === 'xlsx') return 4; // Excel parsing overhead
    return 3; // Default conservative estimate
  }

  // ---------------------------------------------------------------------------
  // QUERY PREFLIGHT CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check if a query result can be safely rendered
   *
   * @param estimatedRows - Estimated number of rows (from query planning or sampling)
   * @param columnCount - Number of columns in result
   * @returns Preflight result with recommendations
   */
  public checkQueryResult(
    estimatedRows: number,
    columnCount: number
  ): QueryPreflightResult {
    const status = this.getMemoryStatus();
    const estimatedMemory = estimatedRows * columnCount * QUERY_RESULT_THRESHOLDS.BYTES_PER_ROW;
    const projectedUsage = status.jsHeapUsed
      ? ((status.jsHeapUsed + estimatedMemory) / WASM_32BIT_LIMIT) * 100
      : 0;

    // Critical zone: block large result sets
    if (status.zone === 'critical' && estimatedRows > QUERY_RESULT_THRESHOLDS.SAFE_ROWS) {
      return {
        allowed: false,
        estimatedMemory,
        estimatedRows,
        level: 'error',
        message: 'Memory is critically low. Add LIMIT clause to reduce result size.',
        recommendations: [
          `Add LIMIT ${QUERY_RESULT_THRESHOLDS.SAFE_ROWS} to your query`,
          'Save work and refresh to free memory',
        ],
      };
    }

    // Result would push into critical zone
    if (projectedUsage > MEMORY_ZONES.CRITICAL) {
      return {
        allowed: true,
        estimatedMemory,
        estimatedRows,
        level: 'error',
        message: `This result set (${estimatedRows.toLocaleString()} rows) may cause memory issues.`,
        recommendations: [
          `Add LIMIT ${Math.min(estimatedRows, QUERY_RESULT_THRESHOLDS.SAFE_ROWS).toLocaleString()} to your query`,
          'Use WHERE clauses to filter data',
          'Consider aggregating data instead of returning raw rows',
        ],
      };
    }

    // Very large result sets
    if (estimatedRows > QUERY_RESULT_THRESHOLDS.MAX_SAFE_ROWS) {
      return {
        allowed: true,
        estimatedMemory,
        estimatedRows,
        level: 'warning',
        message: `Very large result set (${estimatedRows.toLocaleString()} rows). Rendering may be slow.`,
        recommendations: [
          `Add LIMIT ${QUERY_RESULT_THRESHOLDS.WARNING_ROWS.toLocaleString()} to your query`,
          'Use pagination or sampling',
          'Consider exporting results instead of displaying',
        ],
      };
    }

    // Large result sets
    if (estimatedRows > QUERY_RESULT_THRESHOLDS.WARNING_ROWS) {
      return {
        allowed: true,
        estimatedMemory,
        estimatedRows,
        level: 'warning',
        message: `Large result set (${estimatedRows.toLocaleString()} rows).`,
        recommendations: [
          `Consider adding LIMIT ${QUERY_RESULT_THRESHOLDS.SAFE_ROWS.toLocaleString()}`,
          'Use filtering to reduce result size',
        ],
      };
    }

    // Moderate result sets
    if (estimatedRows > QUERY_RESULT_THRESHOLDS.PAGINATION_ROWS) {
      return {
        allowed: true,
        estimatedMemory,
        estimatedRows,
        level: 'info',
        message: `Moderate result set (${estimatedRows.toLocaleString()} rows). Pagination recommended.`,
        recommendations: ['Results will be paginated for better performance'],
      };
    }

    // Safe result sets
    return {
      allowed: true,
      estimatedMemory,
      estimatedRows,
      level: 'none',
      message: '',
      recommendations: [],
    };
  }

  // ---------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // ---------------------------------------------------------------------------

  /**
   * Format bytes as human-readable size
   * @param bytes - Size in bytes
   * @param decimals - Number of decimal places (default: 0 for whole numbers)
   */
  public formatSize(bytes: number, decimals: number = 0): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const value = bytes / Math.pow(k, i);
    // Show decimals only for values < 10 in the largest unit, otherwise whole numbers
    const actualDecimals = decimals > 0 || value < 10 ? decimals : 0;

    return parseFloat(value.toFixed(actualDecimals)) + ' ' + sizes[i];
  }

  /**
   * Check if memory monitoring is available
   */
  public isMemoryMonitoringAvailable(): boolean {
    return this.getMemoryApi() !== null;
  }

  /**
   * Get current JS heap usage percentage
   */
  public getJsHeapPercent(): number | null {
    const memory = this.getMemoryApi();
    if (!memory) return null;
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  /**
   * Get current WASM usage percentage (estimated from JS heap)
   */
  public getWasmUsagePercent(): number | null {
    const memory = this.getMemoryApi();
    if (!memory) return null;
    return (memory.usedJSHeapSize / WASM_32BIT_LIMIT) * 100;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const memoryBudgetManager = MemoryBudgetManager.getInstance();

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export function getMemoryStatus(): MemoryStatus {
  return memoryBudgetManager.getMemoryStatus();
}

export function checkFileUpload(fileSize: number, fileType: string): FilePreflightResult {
  return memoryBudgetManager.checkFileUpload(fileSize, fileType);
}

export function checkQueryResult(estimatedRows: number, columnCount: number): QueryPreflightResult {
  return memoryBudgetManager.checkQueryResult(estimatedRows, columnCount);
}

export function formatMemorySize(bytes: number): string {
  return memoryBudgetManager.formatSize(bytes);
}
