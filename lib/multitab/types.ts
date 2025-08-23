/**
 * @fileoverview Type definitions for multi-tab DuckDB coordination
 * 
 * Defines the message types and interfaces for leader-client communication,
 * streaming query execution, and crash recovery in HomeBench.
 */

// =============================================================================
// MESSAGE PROTOCOL TYPES
// =============================================================================

/**
 * SQL query request from client to leader
 */
export type SqlRequest =
  | { id: string; type: 'sql'; sql: string; args?: any[]; mode: 'ro'|'rw'; fmt?: 'arrow'|'json'; chunkRows?: number }
  | { id: string; type: 'cancel' };

/**
 * SQL query response from leader to client
 */
export type SqlResponse =
  | { id: string; ok: true; meta?: any }
  | { id: string; ok: true; chunk?: ArrayBuffer }       // Arrow chunk
  | { id: string; ok: true; rows?: any[]; done?: true } // JSON chunk or done
  | { id: string; ok: false; error: string };

/**
 * Control plane messages over BroadcastChannel
 */
export type ControlMessage =
  | { type: 'hb' } // heartbeat from leader
  | { type: 'connect' } // client requesting connection
  | { type: 'connect_ack' } // leader acknowledging connection
  | { type: 'query'; payload: SqlRequest } // query from client to leader  
  | { type: 'query_response'; [key: string]: any }; // query responses from leader

// =============================================================================
// STREAMING INTERFACES
// =============================================================================

/**
 * Options for streaming query execution
 */
export interface StreamQueryOptions {
  sql: string;
  args?: any[];
  mode?: 'ro' | 'rw';
  fmt?: 'arrow' | 'json';
  chunkRows?: number;
  onArrowChunk?: (buf: ArrayBuffer) => void;
  onJsonChunk?: (rows: any[]) => void;
  onProgress?: (processed: number) => void;
}

/**
 * Query execution result metadata
 */
export interface QueryMetadata {
  rowCount?: number;
  columnCount?: number;
  duration: number;
  memoryUsed?: number;
}

// =============================================================================
// LEADER-CLIENT STATE
// =============================================================================

/**
 * Database connection state in multi-tab environment
 */
export interface MultiTabDatabaseState {
  isLeader: boolean;
  isConnected: boolean;
  connectionId?: string;
  lastHeartbeat: number;
}

/**
 * Pending query request tracking
 */
export interface PendingQuery {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  onChunk?: (chunk: any) => void;
  abortController: AbortController;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Multi-tab system configuration
 */
export interface MultiTabConfig {
  lockName: string;
  channelName: string;
  heartbeatInterval: number;
  heartbeatGracePeriods: number;
  maxChunkSize: number;
  defaultChunkRows: number;
}

/**
 * Default configuration for HomeBench
 */
export const DEFAULT_MULTITAB_CONFIG: MultiTabConfig = {
  lockName: 'homebench:duckdb',
  channelName: 'homebench:duckdb',
  heartbeatInterval: 1500, // 1.5 seconds
  heartbeatGracePeriods: 3, // 4.5 seconds timeout
  maxChunkSize: 2 * 1024 * 1024, // 2MB chunks for Arrow IPC
  defaultChunkRows: 20000, // Rows per JSON chunk
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Multi-tab specific error types
 */
export class MultiTabError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MultiTabError';
  }
}

export class LeaderConnectionError extends MultiTabError {
  constructor(message: string = 'No leader connection available') {
    super(message, 'LEADER_CONNECTION_ERROR');
  }
}

export class QueryCancelledError extends MultiTabError {
  constructor(message: string = 'Query was cancelled') {
    super(message, 'QUERY_CANCELLED');
  }
}

export class LeaderCrashError extends MultiTabError {
  constructor(message: string = 'Leader tab crashed, retrying with new leader') {
    super(message, 'LEADER_CRASH');
  }
}