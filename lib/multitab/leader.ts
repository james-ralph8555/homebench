/**
 * @fileoverview Multi-tab DuckDB leader implementation
 * 
 * The leader tab is responsible for:
 * - Spawning and managing the DuckDB worker
 * - Opening the OPFS-backed database with write access
 * - Accepting client connections and providing dedicated DuckDB connections
 * - Serializing writes while allowing concurrent reads
 * - Streaming query results via Arrow IPC or JSON
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import { logger } from '@/lib/logger';
import { SqlRequest, SqlResponse, DEFAULT_MULTITAB_CONFIG, PendingQuery, QueryCancelledError } from './types';

// =============================================================================
// LEADER STATE
// =============================================================================

let db: duckdb.AsyncDuckDB | null = null;
let isOpfsSupported = false;
const connectionPool = new Map<MessagePort, any>();
let writeQueue = Promise.resolve();

// =============================================================================
// LEADER INITIALIZATION
// =============================================================================

/**
 * Set the leader's DuckDB instance (called by DuckDBManager)
 * This avoids circular dependency issues
 */
export function setLeaderDatabase(dbInstance: duckdb.AsyncDuckDB, opfsSupported: boolean): void {
  db = dbInstance;
  isOpfsSupported = opfsSupported;
  logger.info(`Leader DuckDB set (OPFS: ${isOpfsSupported ? 'enabled' : 'disabled'})`);
}

/**
 * Initialize the leader system (called after database is set)
 */
export async function initializeLeader(): Promise<void> {
  logger.info('Leader system ready');
  
  if (!db) {
    throw new Error('Leader database not set - call setLeaderDatabase first');
  }
}

// =============================================================================
// CLIENT CONNECTION HANDLING
// =============================================================================

/**
 * Handle a new client connection by giving them a dedicated DuckDB connection
 */
export async function handleClientConnection(port: MessagePort): Promise<void> {
  if (!db) {
    throw new Error('Leader DuckDB not initialized');
  }
  
  try {
    // Create dedicated connection for this client
    const connection = await db.connect();
    connectionPool.set(port, connection);
    
    // Wire up the message port for this client
    setupClientMessageHandling(port, connection);
    
    logger.info(`Client connected (${connectionPool.size} active connections)`);
  } catch (error) {
    logger.error('Failed to create client connection:', error);
    throw error;
  }
}

/**
 * Set up message handling for a client connection
 */
function setupClientMessageHandling(port: MessagePort, connection: any): void {
  const pendingQueries = new Map<string, AbortController>();
  
  port.onmessage = async (event: MessageEvent<SqlRequest>) => {
    const request = event.data;
    
    try {
      if (request.type === 'cancel') {
        // Handle query cancellation
        const abortController = pendingQueries.get(request.id);
        if (abortController) {
          abortController.abort();
          pendingQueries.delete(request.id);
        }
        return;
      }
      
      // Handle SQL query
      if (request.type === 'sql') {
        const abortController = new AbortController();
        pendingQueries.set(request.id, abortController);
        
        try {
          const isWrite = request.mode === 'rw';
          const format = request.fmt ?? 'arrow';
          const chunkRows = request.chunkRows ?? DEFAULT_MULTITAB_CONFIG.defaultChunkRows;
          
          // Serialize writes to preserve order; reads can run concurrently
          if (isWrite) {
            await writeMutex(async () => {
              await executeAndStream(port, connection, request, format, chunkRows, abortController);
            });
          } else {
            await executeAndStream(port, connection, request, format, chunkRows, abortController);
          }
        } finally {
          pendingQueries.delete(request.id);
        }
      }
    } catch (error: any) {
      const response: SqlResponse = {
        id: request.id,
        ok: false,
        error: error?.message || String(error)
      };
      port.postMessage(response);
    }
  };
  
  // Handle client disconnection
  port.onmessageerror = () => cleanupClientConnection(port);
  
  // Start the port
  port.start();
}

/**
 * Execute query and stream results back to client
 */
async function executeAndStream(
  port: MessagePort,
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  format: 'arrow' | 'json',
  chunkRows: number,
  abortController: AbortController
): Promise<void> {
  // Send initial acknowledgment
  port.postMessage({ id: request.id, ok: true } as SqlResponse);
  
  try {
    if (format === 'arrow') {
      await streamArrowResults(port, connection, request, abortController);
    } else {
      await streamJsonResults(port, connection, request, chunkRows, abortController);
    }
    
    // Send completion signal
    port.postMessage({ id: request.id, ok: true, done: true } as any);
    
  } catch (error: any) {
    if (abortController.signal.aborted) {
      throw new QueryCancelledError();
    }
    throw error;
  }
}

/**
 * Stream query results as Arrow IPC buffers
 */
async function streamArrowResults(
  port: MessagePort,
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  abortController: AbortController
): Promise<void> {
  try {
    // Execute query and get Arrow result
    const result = request.args && request.args.length > 0
      ? await connection.query(request.sql, request.args)
      : await connection.query(request.sql);
    
    if (abortController.signal.aborted) {
      throw new QueryCancelledError();
    }
    
    // Convert to Arrow table and serialize
    const arrowTable = result;
    const ipcBuffer = arrowTable.serialize();
    
    // Stream large buffers in chunks to avoid memory issues
    const maxChunkSize = DEFAULT_MULTITAB_CONFIG.maxChunkSize;
    const totalSize = ipcBuffer.byteLength;
    
    for (let offset = 0; offset < totalSize; offset += maxChunkSize) {
      if (abortController.signal.aborted) {
        throw new QueryCancelledError();
      }
      
      const chunkSize = Math.min(maxChunkSize, totalSize - offset);
      const chunk = ipcBuffer.slice(offset, offset + chunkSize);
      
      // Send chunk as transferable ArrayBuffer
      port.postMessage(
        { id: request.id, ok: true, chunk } as SqlResponse,
        [chunk]
      );
    }
  } catch (error: any) {
    // DuckDB-specific error handling
    if (error?.message?.includes('cancelled')) {
      throw new QueryCancelledError();
    }
    throw error;
  }
}

/**
 * Stream query results as JSON row batches
 */
async function streamJsonResults(
  port: MessagePort,
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  chunkRows: number,
  abortController: AbortController
): Promise<void> {
  try {
    // For large result sets, use pagination to avoid memory issues
    // Wrap the user query to enable stable pagination
    const baseQuery = `SELECT * FROM (${request.sql}) t`;
    
    let offset = 0;
    let hasMoreRows = true;
    
    while (hasMoreRows) {
      if (abortController.signal.aborted) {
        throw new QueryCancelledError();
      }
      
      // Get a page of results
      const pageQuery = `${baseQuery} LIMIT ${chunkRows} OFFSET ${offset}`;
      const pageArgs = request.args ?? [];
      
      const result = pageArgs.length > 0
        ? await connection.query(pageQuery, pageArgs)
        : await connection.query(pageQuery);
      
      const rows = result.toArray();
      
      if (rows.length === 0) {
        hasMoreRows = false;
        break;
      }
      
      // Send this batch of rows
      port.postMessage({
        id: request.id,
        ok: true,
        rows
      } as SqlResponse);
      
      offset += rows.length;
      hasMoreRows = rows.length === chunkRows; // More rows if we got a full page
    }
  } catch (error: any) {
    if (error?.message?.includes('cancelled')) {
      throw new QueryCancelledError();
    }
    throw error;
  }
}

// =============================================================================
// WRITE SERIALIZATION
// =============================================================================

/**
 * Simple mutex to serialize write operations
 * This ensures writes are executed in order while allowing concurrent reads
 */
async function writeMutex<T>(fn: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let resolve!: () => void;
  
  writeQueue = new Promise(r => (resolve = r));
  
  try {
    await previous;
    return await fn();
  } finally {
    resolve();
  }
}

// =============================================================================
// CONNECTION CLEANUP
// =============================================================================

/**
 * Clean up a client connection when they disconnect
 */
function cleanupClientConnection(port: MessagePort): void {
  const connection = connectionPool.get(port);
  if (connection) {
    connection.close().catch(logger.warn);
    connectionPool.delete(port);
    
    logger.info(`Client disconnected (${connectionPool.size} active connections)`);
  }
  
  try {
    port.close();
  } catch {}
}

/**
 * Handle query messages coming via BroadcastChannel (instead of MessagePort)
 */
export async function handleBroadcastQuery(queryData: any, channel: BroadcastChannel): Promise<void> {
  logger.debug('Leader processing broadcast query:', queryData);
  
  if (!db) {
    throw new Error('Leader DuckDB not initialized');
  }

  const request = queryData as SqlRequest;
  
  try {
    if (request.type === 'cancel') {
      // For now, cancellation is not implemented for broadcast queries
      return;
    }
    
    if (request.type === 'sql') {
      // Create a temporary connection for this query
      const connection = await db.connect();
      
      try {
        const isWrite = request.mode === 'rw';
        const format = request.fmt ?? 'arrow';
        
        // Serialize writes to preserve order
        if (isWrite) {
          await writeMutex(async () => {
            await executeBroadcastQuery(connection, request, format, channel);
          });
        } else {
          await executeBroadcastQuery(connection, request, format, channel);
        }
      } finally {
        await connection.close();
      }
    }
  } catch (error: any) {
    const errorResponse = {
      type: 'query_response',
      id: request.id,
      ok: false,
      error: error?.message || String(error)
    };
    channel.postMessage(errorResponse);
  }
}

/**
 * Execute a query and send results back via BroadcastChannel
 */
async function executeBroadcastQuery(
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  format: 'arrow' | 'json',
  channel: BroadcastChannel
): Promise<void> {
  // Send initial acknowledgment
  channel.postMessage({
    type: 'query_response',
    id: request.id,
    ok: true
  });
  
  try {
    if (format === 'arrow') {
      await streamArrowResultsBroadcast(connection, request, channel);
    } else {
      await streamJsonResultsBroadcast(connection, request, channel);
    }
    
    // Send completion signal
    channel.postMessage({
      type: 'query_response',
      id: request.id,
      ok: true,
      done: true
    });
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Stream Arrow results via BroadcastChannel
 */
async function streamArrowResultsBroadcast(
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  channel: BroadcastChannel
): Promise<void> {
  try {
    logger.debug('Leader executing SQL:', request.sql);
    
    // Execute query and get Arrow result
    const result = request.args && request.args.length > 0
      ? await connection.query(request.sql, request.args)
      : await connection.query(request.sql);
    
    logger.debug('Leader got result:', result, 'numRows:', result.numRows);
    
    // DuckDB-WASM query results are Arrow Tables
    // Get the Arrow IPC buffer using the table's serialize method or internal data
    let ipcBuffer: ArrayBuffer;
    
    try {
      // Try to use the serialize method if available
      if (typeof result.serialize === 'function') {
        ipcBuffer = result.serialize();
      } else {
        // DuckDB-WASM results have internal Arrow data we can access
        // The result should be an Arrow Table with data chunks
        const { RecordBatchStreamWriter } = await import('apache-arrow');
        
        // Create an IPC stream from the table
        const writer = RecordBatchStreamWriter.writeAll(result);
        const chunks: Uint8Array[] = [];
        
        for await (const chunk of writer) {
          chunks.push(chunk);
        }
        
        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        ipcBuffer = combined.buffer;
      }
      
      // Since BroadcastChannel can't transfer ArrayBuffers directly, 
      // we need to copy the data (it gets cloned automatically)
      channel.postMessage({
        type: 'query_response',
        id: request.id,
        ok: true,
        chunk: ipcBuffer
      });
      
    } catch (serializationError) {
      logger.warn('Failed to serialize as Arrow IPC, falling back to JSON:', serializationError);
      
      // Fallback to JSON if Arrow IPC serialization fails
      const jsonData = result.toArray().map((row: any) => row.toJSON());
      
      channel.postMessage({
        type: 'query_response',
        id: request.id,
        ok: true,
        rows: jsonData
      });
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Stream JSON results via BroadcastChannel
 */
async function streamJsonResultsBroadcast(
  connection: any,
  request: Extract<SqlRequest, {type: 'sql'}>,
  channel: BroadcastChannel
): Promise<void> {
  try {
    // Execute query
    const result = request.args && request.args.length > 0
      ? await connection.query(request.sql, request.args)
      : await connection.query(request.sql);
    
    const rows = result.toArray().map((row: any) => row.toJSON());
    
    // Send all rows in one batch for simplicity
    channel.postMessage({
      type: 'query_response',
      id: request.id,
      ok: true,
      rows: rows
    });
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get leader statistics
 */
export function getLeaderStats() {
  return {
    isInitialized: !!db,
    activeConnections: connectionPool.size,
    isOpfsSupported,
    hasWriteAccess: isOpfsSupported,
  };
}
