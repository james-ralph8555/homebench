/**
 * @fileoverview Typed protocol definitions for multi-tab coordination
 *
 * This module defines the complete message protocol for leader-client communication
 * using discriminated unions and type guards for type-safe message handling.
 */

// =============================================================================
// MESSAGE TYPE DISCRIMINATORS
// =============================================================================

/** Control plane message types (leader election, heartbeats, connections) */
export type ControlMessageType = 'heartbeat' | 'connect' | 'connect_ack' | 'disconnect';

/** Query message types (SQL execution and results) */
export type QueryMessageType = 'sql_request' | 'sql_response' | 'sql_cancel';

/** All protocol message type discriminators */
export type MessageType = ControlMessageType | QueryMessageType;

// =============================================================================
// MESSAGE BASE TYPES
// =============================================================================

/** Base interface for all protocol messages */
interface BaseMessage<T extends MessageType> {
  readonly type: T;
  readonly timestamp: number;
  readonly senderId: string;
}

/** Base interface for messages requiring a correlation ID */
interface CorrelatedMessage<T extends MessageType> extends BaseMessage<T> {
  readonly requestId: string;
}

// =============================================================================
// CONTROL PLANE MESSAGES
// =============================================================================

/** Leader heartbeat broadcast */
export interface HeartbeatMessage extends BaseMessage<'heartbeat'> {
  readonly leaderId: string;
  readonly dbReady: boolean;
  readonly clientCount: number;
}

/** Client connection request */
export interface ConnectMessage extends BaseMessage<'connect'> {
  readonly clientId: string;
  readonly protocolVersion: number;
}

/** Leader acknowledgment of client connection */
export interface ConnectAckMessage extends BaseMessage<'connect_ack'> {
  readonly leaderId: string;
  readonly clientId: string;
  readonly accepted: boolean;
  readonly rejectReason?: string;
}

/** Client disconnect notification */
export interface DisconnectMessage extends BaseMessage<'disconnect'> {
  readonly clientId: string;
  readonly reason?: string;
}

/** Union of all control plane messages */
export type ControlMessage =
  | HeartbeatMessage
  | ConnectMessage
  | ConnectAckMessage
  | DisconnectMessage;

// =============================================================================
// QUERY PROTOCOL MESSAGES
// =============================================================================

/** Query format options */
export type QueryFormat = 'arrow' | 'json';

/** Query execution mode */
export type QueryMode = 'ro' | 'rw';

/** SQL query request from client to leader */
export interface SqlRequestMessage extends CorrelatedMessage<'sql_request'> {
  readonly sql: string;
  readonly args?: readonly unknown[];
  readonly mode: QueryMode;
  readonly fmt: QueryFormat;
  readonly chunkRows?: number;
}

/** SQL query acknowledgment */
export interface SqlAckMessage extends CorrelatedMessage<'sql_response'> {
  readonly status: 'accepted';
}

/** Arrow IPC chunk response */
export interface SqlArrowChunkMessage extends CorrelatedMessage<'sql_response'> {
  readonly status: 'chunk';
  readonly fmt: 'arrow';
  readonly chunk: ArrayBuffer;
  readonly chunkIndex: number;
  readonly totalChunks?: number;
}

/** JSON rows chunk response */
export interface SqlJsonChunkMessage extends CorrelatedMessage<'sql_response'> {
  readonly status: 'chunk';
  readonly fmt: 'json';
  readonly rows: readonly unknown[];
  readonly chunkIndex: number;
  readonly hasMore: boolean;
}

/** Query completion response */
export interface SqlCompleteMessage extends CorrelatedMessage<'sql_response'> {
  readonly status: 'complete';
  readonly rowCount?: number;
  readonly duration?: number;
}

/** Query error response */
export interface SqlErrorMessage extends CorrelatedMessage<'sql_response'> {
  readonly status: 'error';
  readonly error: string;
  readonly errorCode?: string;
}

/** Query cancellation request */
export interface SqlCancelMessage extends CorrelatedMessage<'sql_cancel'> {
  readonly reason?: string;
}

/** Union of all SQL response variants */
export type SqlResponseMessage =
  | SqlAckMessage
  | SqlArrowChunkMessage
  | SqlJsonChunkMessage
  | SqlCompleteMessage
  | SqlErrorMessage;

/** Union of all query protocol messages */
export type QueryMessage =
  | SqlRequestMessage
  | SqlResponseMessage
  | SqlCancelMessage;

// =============================================================================
// PROTOCOL MESSAGE UNION
// =============================================================================

/** All protocol messages that can be sent over the channel */
export type ProtocolMessage = ControlMessage | QueryMessage;

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// =============================================================================

/**
 * Legacy SqlRequest type for backward compatibility
 * @deprecated Use SqlRequestMessage instead
 */
export type SqlRequest =
  | { id: string; type: 'sql'; sql: string; args?: unknown[]; mode: QueryMode; fmt?: QueryFormat; chunkRows?: number }
  | { id: string; type: 'cancel' };

/**
 * Legacy SqlResponse type for backward compatibility
 * @deprecated Use SqlResponseMessage variants instead
 */
export type SqlResponse =
  | { id: string; ok: true; meta?: unknown }
  | { id: string; ok: true; chunk?: ArrayBuffer }
  | { id: string; ok: true; rows?: unknown[]; done?: boolean }
  | { id: string; ok: false; error: string };

// =============================================================================
// TYPE GUARDS
// =============================================================================

/** Check if message is a control plane message */
export function isControlMessage(msg: ProtocolMessage): msg is ControlMessage {
  return ['heartbeat', 'connect', 'connect_ack', 'disconnect'].includes(msg.type);
}

/** Check if message is a query protocol message */
export function isQueryMessage(msg: ProtocolMessage): msg is QueryMessage {
  return ['sql_request', 'sql_response', 'sql_cancel'].includes(msg.type);
}

/** Check if message is a heartbeat */
export function isHeartbeat(msg: ProtocolMessage): msg is HeartbeatMessage {
  return msg.type === 'heartbeat';
}

/** Check if message is a connection request */
export function isConnect(msg: ProtocolMessage): msg is ConnectMessage {
  return msg.type === 'connect';
}

/** Check if message is a connection acknowledgment */
export function isConnectAck(msg: ProtocolMessage): msg is ConnectAckMessage {
  return msg.type === 'connect_ack';
}

/** Check if message is a SQL request */
export function isSqlRequest(msg: ProtocolMessage): msg is SqlRequestMessage {
  return msg.type === 'sql_request';
}

/** Check if message is a SQL response */
export function isSqlResponse(msg: ProtocolMessage): msg is SqlResponseMessage {
  return msg.type === 'sql_response';
}

/** Check if message is a SQL cancel */
export function isSqlCancel(msg: ProtocolMessage): msg is SqlCancelMessage {
  return msg.type === 'sql_cancel';
}

/** Check if response is an Arrow chunk */
export function isArrowChunk(msg: SqlResponseMessage): msg is SqlArrowChunkMessage {
  return msg.status === 'chunk' && msg.fmt === 'arrow';
}

/** Check if response is a JSON chunk */
export function isJsonChunk(msg: SqlResponseMessage): msg is SqlJsonChunkMessage {
  return msg.status === 'chunk' && msg.fmt === 'json';
}

/** Check if response is complete */
export function isComplete(msg: SqlResponseMessage): msg is SqlCompleteMessage {
  return msg.status === 'complete';
}

/** Check if response is an error */
export function isError(msg: SqlResponseMessage): msg is SqlErrorMessage {
  return msg.status === 'error';
}

// =============================================================================
// MESSAGE FACTORIES
// =============================================================================

/** Generate a unique message ID */
export function generateMessageId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

/** Generate a unique sender ID for this tab */
export function generateSenderId(): string {
  return `tab-${crypto.randomUUID()}`;
}

/** Create a heartbeat message */
export function createHeartbeat(
  leaderId: string,
  dbReady: boolean,
  clientCount: number
): HeartbeatMessage {
  return {
    type: 'heartbeat',
    timestamp: Date.now(),
    senderId: leaderId,
    leaderId,
    dbReady,
    clientCount,
  };
}

/** Create a connect message */
export function createConnect(clientId: string, protocolVersion = 1): ConnectMessage {
  return {
    type: 'connect',
    timestamp: Date.now(),
    senderId: clientId,
    clientId,
    protocolVersion,
  };
}

/** Create a connect acknowledgment */
export function createConnectAck(
  leaderId: string,
  clientId: string,
  accepted: boolean,
  rejectReason?: string
): ConnectAckMessage {
  return {
    type: 'connect_ack',
    timestamp: Date.now(),
    senderId: leaderId,
    leaderId,
    clientId,
    accepted,
    rejectReason,
  };
}

/** Create a disconnect message */
export function createDisconnect(clientId: string, reason?: string): DisconnectMessage {
  return {
    type: 'disconnect',
    timestamp: Date.now(),
    senderId: clientId,
    clientId,
    reason,
  };
}

/** Create a SQL request message */
export function createSqlRequest(
  requestId: string,
  senderId: string,
  sql: string,
  options: {
    args?: readonly unknown[];
    mode?: QueryMode;
    fmt?: QueryFormat;
    chunkRows?: number;
  } = {}
): SqlRequestMessage {
  return {
    type: 'sql_request',
    timestamp: Date.now(),
    senderId,
    requestId,
    sql,
    args: options.args,
    mode: options.mode ?? 'ro',
    fmt: options.fmt ?? 'arrow',
    chunkRows: options.chunkRows,
  };
}

/** Create a SQL acknowledgment */
export function createSqlAck(requestId: string, senderId: string): SqlAckMessage {
  return {
    type: 'sql_response',
    timestamp: Date.now(),
    senderId,
    requestId,
    status: 'accepted',
  };
}

/** Create an Arrow chunk response */
export function createArrowChunk(
  requestId: string,
  senderId: string,
  chunk: ArrayBuffer,
  chunkIndex: number,
  totalChunks?: number
): SqlArrowChunkMessage {
  return {
    type: 'sql_response',
    timestamp: Date.now(),
    senderId,
    requestId,
    status: 'chunk',
    fmt: 'arrow',
    chunk,
    chunkIndex,
    totalChunks,
  };
}

/** Create a JSON chunk response */
export function createJsonChunk(
  requestId: string,
  senderId: string,
  rows: readonly unknown[],
  chunkIndex: number,
  hasMore: boolean
): SqlJsonChunkMessage {
  return {
    type: 'sql_response',
    timestamp: Date.now(),
    senderId,
    requestId,
    status: 'chunk',
    fmt: 'json',
    rows,
    chunkIndex,
    hasMore,
  };
}

/** Create a completion response */
export function createComplete(
  requestId: string,
  senderId: string,
  rowCount?: number,
  duration?: number
): SqlCompleteMessage {
  return {
    type: 'sql_response',
    timestamp: Date.now(),
    senderId,
    requestId,
    status: 'complete',
    rowCount,
    duration,
  };
}

/** Create an error response */
export function createError(
  requestId: string,
  senderId: string,
  error: string,
  errorCode?: string
): SqlErrorMessage {
  return {
    type: 'sql_response',
    timestamp: Date.now(),
    senderId,
    requestId,
    status: 'error',
    error,
    errorCode,
  };
}

/** Create a cancel request */
export function createCancel(
  requestId: string,
  senderId: string,
  reason?: string
): SqlCancelMessage {
  return {
    type: 'sql_cancel',
    timestamp: Date.now(),
    senderId,
    requestId,
    reason,
  };
}

// =============================================================================
// LEGACY ADAPTERS
// =============================================================================

/** Convert legacy SqlRequest to new SqlRequestMessage */
export function adaptLegacyRequest(
  legacy: SqlRequest,
  senderId: string
): SqlRequestMessage | SqlCancelMessage | null {
  if (legacy.type === 'cancel') {
    return createCancel(legacy.id, senderId);
  }
  return createSqlRequest(legacy.id, senderId, legacy.sql, {
    args: legacy.args,
    mode: legacy.mode,
    fmt: legacy.fmt,
    chunkRows: legacy.chunkRows,
  });
}

/** Convert SqlResponseMessage to legacy SqlResponse format */
export function toLegacyResponse(msg: SqlResponseMessage): SqlResponse {
  switch (msg.status) {
    case 'accepted':
      return { id: msg.requestId, ok: true, meta: {} };
    case 'chunk':
      if (msg.fmt === 'arrow') {
        return { id: msg.requestId, ok: true, chunk: msg.chunk };
      }
      return { id: msg.requestId, ok: true, rows: msg.rows as unknown[] };
    case 'complete':
      return { id: msg.requestId, ok: true, done: true };
    case 'error':
      return { id: msg.requestId, ok: false, error: msg.error };
  }
}

// =============================================================================
// PROTOCOL CONSTANTS
// =============================================================================

/** Current protocol version */
export const PROTOCOL_VERSION = 1;

/** Default channel name for BroadcastChannel communication */
export const DEFAULT_CHANNEL_NAME = 'homebench:duckdb';

/** Default lock name for Web Locks leader election */
export const DEFAULT_LOCK_NAME = 'homebench:duckdb';

/** Heartbeat interval in milliseconds */
export const HEARTBEAT_INTERVAL_MS = 1500;

/** Number of missed heartbeats before declaring leader dead */
export const HEARTBEAT_GRACE_PERIODS = 3;

/** Maximum Arrow chunk size in bytes */
export const MAX_CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/** Default rows per JSON chunk */
export const DEFAULT_CHUNK_ROWS = 20000;
