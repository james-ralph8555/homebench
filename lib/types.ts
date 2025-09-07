/**
 * @fileoverview Core TypeScript type definitions for HomeBench
 * 
 * Shared interfaces and types used across the application to improve
 * type safety and reduce usage of `any` types.
 */

import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { Table as ArrowTable } from 'apache-arrow';

// =============================================================================
// PRIMITIVE AND UTILITY TYPES
// =============================================================================

/**
 * Basic primitive types that can be safely serialized
 */
export type Primitive = string | number | boolean | null | undefined;

/**
 * Parameters that can be passed to SQL queries
 */
export type QueryParameters = unknown[];

/**
 * More restrictive query parameters for cases where we need primitives only
 */
export type PrimitiveQueryParameters = readonly Primitive[];

/**
 * Function to convert unknown errors to string messages
 */
export type ToErrorMessageFn = (error: unknown) => string;

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Enhanced error interface for database operations
 */
export interface DatabaseError extends Error {
  readonly code?: string;
  readonly sqlState?: string;
  readonly detail?: string;
  readonly hint?: string;
}

/**
 * Result of a database query operation
 */
export interface QueryResult<TData = unknown> {
  readonly success: boolean;
  readonly data?: TData;
  readonly rowCount?: number;
  readonly columnCount?: number;
  readonly duration: number;
  readonly error?: DatabaseError | string;
  readonly metadata?: QueryMetadata;
}

/**
 * Metadata about query execution
 */
export interface QueryMetadata {
  readonly executionTime: number;
  readonly planningTime?: number;
  readonly memoryUsage?: number;
  readonly rowsExamined?: number;
  readonly rowsReturned?: number;
}

/**
 * Options for database write operations
 */
export interface WriteOptions {
  readonly description?: string;
  readonly retryAttempts?: number;
  readonly timeoutMs?: number;
}

/**
 * Result of a write operation
 */
export interface WriteResult extends QueryResult<void> {
  readonly rowsAffected?: number;
}

// =============================================================================
// DUCKDB CONNECTION TYPES
// =============================================================================

/**
 * Type alias for DuckDB database instance
 */
export type DuckDatabase = AsyncDuckDB;

/**
 * Type alias for DuckDB connection
 */
export type DuckConnection = AsyncDuckDBConnection;

/**
 * Database connection state information
 */
export interface DatabaseState {
  readonly isConnected: boolean;
  readonly isOpfsSupported: boolean;
  readonly hasWriteAccess: boolean;
  readonly db?: DuckDatabase;
  readonly connectionCount?: number;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'CSV' | 'PARQUET' | 'JSON' | 'DUCKDB';

/**
 * Buffer types for file data
 */
export type ExportBuffer = ArrayBuffer | Uint8Array;

/**
 * Result of an export operation
 */
export interface ExportResult {
  readonly success: boolean;
  readonly data?: ExportBuffer;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly format: ExportFormat;
  readonly error?: DatabaseError | string;
  readonly duration: number;
}

/**
 * Options for export operations
 */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly fileName?: string;
  readonly includeHeaders?: boolean;
  readonly compression?: boolean;
}

// =============================================================================
// DATA VISUALIZATION TYPES
// =============================================================================

/**
 * Row data structure for visualization
 * Using index signature to allow dynamic column access
 */
export interface DataRow {
  readonly [columnName: string]: Primitive;
}

/**
 * Dataset for visualization with metadata
 */
export interface VisualizationDataset {
  readonly rows: readonly DataRow[];
  readonly columnNames: readonly string[];
  readonly columnTypes: Readonly<Record<string, 'numeric' | 'string' | 'datetime' | 'boolean'>>;
  readonly rowCount: number;
}

/**
 * Chart configuration base interface
 */
export interface BaseChartConfig {
  readonly type: string;
  readonly title?: string;
  readonly showLegend?: boolean;
  readonly useWebGL?: boolean;
}

// =============================================================================
// INITIALIZATION AND PROGRESS TYPES
// =============================================================================

/**
 * Database initialization stages
 */
export type InitializationStage = 
  | 'not_started' 
  | 'loading' 
  | 'ready' 
  | 'error';

/**
 * Loading progress information
 */
export interface LoadingProgress {
  readonly stage: 'downloading' | 'compiling' | 'instantiating' | 'connecting' | 'complete';
  readonly message: string;
  readonly progress?: number; // 0-100 percentage
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: LoadingProgress) => void;

/**
 * Recovery notification callback
 */
export type RecoveryCallback = (message: string, type: 'info' | 'warning' | 'error') => void;

/**
 * Commit success callback
 */
export type CommitCallback = (timestamp: Date) => void;

// =============================================================================
// MULTI-TAB COORDINATION TYPES
// =============================================================================

/**
 * Multi-tab role in the system
 */
export type MultiTabRole = 'leader' | 'client';

/**
 * Multi-tab system status
 */
export interface MultiTabStatus {
  readonly initialized: boolean;
  readonly role?: MultiTabRole;
  readonly isConnected?: boolean;
  readonly activeConnections?: number;
  readonly isReconnecting?: boolean;
  readonly inflightQueryCount?: number;
  readonly reconnectAttempts?: number;
  readonly maxReconnectAttempts?: number;
  readonly lastHeartbeat?: number;
}

// =============================================================================
// UTILITY TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 
         ('code' in error || 
          'sqlState' in error || 
          'detail' in error);
}

/**
 * Type guard to check if a value is a primitive
 */
export function isPrimitive(value: unknown): value is Primitive {
  const type = typeof value;
  return value === null || 
         type === 'undefined' || 
         type === 'string' || 
         type === 'number' || 
         type === 'boolean';
}

/**
 * Type guard to check if query parameters are all primitives
 */
export function arePrimitiveParameters(params: unknown[]): params is Primitive[] {
  return params.every(isPrimitive);
}

// =============================================================================
// ARROW TABLE HELPERS
// =============================================================================

/**
 * Type alias for Apache Arrow table
 */
export type DataTable = ArrowTable;

/**
 * Arrow table with additional metadata
 */
export interface EnhancedDataTable {
  readonly table: DataTable;
  readonly columnCount: number;
  readonly rowCount: number;
  readonly memoryUsage?: number;
  readonly createdAt: Date;
}