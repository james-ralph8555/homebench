/**
 * @fileoverview Type definitions for multi-tab DuckDB coordination
 *
 * Re-exports protocol types and provides additional non-protocol types
 * for configuration, state management, and error handling.
 */

// Re-export protocol types
export type {
  // Message types
  ProtocolMessage,
  ControlMessage,
  QueryMessage,
  ControlMessageType,
  QueryMessageType,
  MessageType,
  // Control plane
  HeartbeatMessage,
  ConnectMessage,
  ConnectAckMessage,
  DisconnectMessage,
  // Query protocol
  SqlRequestMessage,
  SqlResponseMessage,
  SqlAckMessage,
  SqlArrowChunkMessage,
  SqlJsonChunkMessage,
  SqlCompleteMessage,
  SqlErrorMessage,
  SqlCancelMessage,
  QueryFormat,
  QueryMode,
  // Legacy compatibility
  SqlRequest,
  SqlResponse,
} from './protocol';

export {
  // Type guards
  isControlMessage,
  isQueryMessage,
  isHeartbeat,
  isConnect,
  isConnectAck,
  isSqlRequest,
  isSqlResponse,
  isSqlCancel,
  isArrowChunk,
  isJsonChunk,
  isComplete,
  isError,
  // Factories
  generateMessageId,
  generateSenderId,
  createHeartbeat,
  createConnect,
  createConnectAck,
  createDisconnect,
  createSqlRequest,
  createSqlAck,
  createArrowChunk,
  createJsonChunk,
  createComplete,
  createError,
  createCancel,
  // Adapters
  adaptLegacyRequest,
  toLegacyResponse,
  // Constants
  PROTOCOL_VERSION,
  DEFAULT_CHANNEL_NAME,
  DEFAULT_LOCK_NAME,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_GRACE_PERIODS,
  MAX_CHUNK_SIZE_BYTES,
  DEFAULT_CHUNK_ROWS,
} from './protocol';

import type { SqlRequest, SqlResponse } from './protocol';

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