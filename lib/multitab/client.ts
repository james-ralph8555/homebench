/**
 * @fileoverview Multi-tab DuckDB client implementation
 * 
 * Client tabs connect to the leader and send query requests through
 * a dedicated MessagePort connection. They receive streaming results
 * and handle leader failover/reconnection.
 */

import { 
  SqlRequest, 
  SqlResponse, 
  StreamQueryOptions, 
  PendingQuery, 
  LeaderConnectionError,
  QueryCancelledError,
  LeaderCrashError
} from './types';
// Note: ArrowTable import will be handled at runtime to avoid bundling issues

// =============================================================================
// CLIENT STATE
// =============================================================================

let port: MessagePort | null = null;
let connectionRequestor: ((callback: (port: MessagePort) => void) => void) | null = null;
let inflightQueries = new Map<string, PendingQuery>();
let isReconnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Initialize the client connection system
 */
export async function initializeClient(
  requestConnection: (callback: (port: MessagePort) => void) => void
): Promise<void> {
  console.log('📡 Initializing client connection...');
  
  connectionRequestor = requestConnection;
  
  try {
    await attemptConnection();
    console.log('✓ Client connection initialized');
  } catch (error) {
    console.warn('Client connection failed, using fallback mode:', error);
    // For now, just continue without a real connection
    // Queries will fail gracefully and show appropriate errors
  }
}

/**
 * Attempt to connect to the leader
 */
async function attemptConnection(): Promise<void> {
  if (!connectionRequestor) {
    throw new LeaderConnectionError('Connection requestor not set');
  }
  
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new LeaderConnectionError('Connection timeout'));
    }, 5000);
    
    connectionRequestor!((receivedPort: MessagePort) => {
      clearTimeout(timeout);
      port = receivedPort;
      setupPortHandling();
      isReconnecting = false;
      reconnectAttempts = 0;
      resolve();
    });
  });
}

/**
 * Set up message handling for the leader connection
 */
function setupPortHandling(): void {
  if (!port) return;
  
  console.log('📡 Client setting up port message handling');
  
  port.onmessage = (event: MessageEvent<SqlResponse>) => {
    const response = event.data;
    const pendingQuery = inflightQueries.get(response.id);
    
    if (!pendingQuery) {
      // Ignore responses for cancelled or unknown queries
      return;
    }
    
    try {
      if (response.ok) {
        // Handle different response types
        if ('chunk' in response && response.chunk) {
          // Arrow chunk
          pendingQuery.onChunk?.(response.chunk);
        } else if ('rows' in response && response.rows) {
          // JSON rows chunk
          pendingQuery.onChunk?.(response.rows);
        } else if ('done' in response && response.done) {
          // Query completion
          pendingQuery.resolve(null);
          inflightQueries.delete(response.id);
        }
        // Initial acknowledgment is ignored
      } else {
        // Query error
        const error = new Error(response.error || 'Query failed');
        pendingQuery.reject(error);
        inflightQueries.delete(response.id);
      }
    } catch (error) {
      pendingQuery.reject(error);
      inflightQueries.delete(response.id);
    }
  };
  
  port.onmessageerror = () => {
    handleConnectionLoss();
  };
  
  port.start();
}

/**
 * Handle connection loss and attempt reconnection
 */
async function handleConnectionLoss(): Promise<void> {
  console.warn('📡 Lost connection to leader, attempting reconnection...');
  
  // Mark all in-flight queries as failed
  const crashError = new LeaderCrashError();
  for (const [id, query] of inflightQueries) {
    query.reject(crashError);
  }
  inflightQueries.clear();
  
  // Close current port
  if (port) {
    try {
      port.close();
    } catch {}
    port = null;
  }
  
  // Attempt reconnection with exponential backoff
  if (!isReconnecting && reconnectAttempts < maxReconnectAttempts) {
    isReconnecting = true;
    reconnectAttempts++;
    
    const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
    
    setTimeout(async () => {
      try {
        await attemptConnection();
        console.log('✓ Reconnected to new leader');
      } catch (error) {
        console.error(`Failed to reconnect (attempt ${reconnectAttempts}):`, error);
        if (reconnectAttempts < maxReconnectAttempts) {
          await handleConnectionLoss(); // Retry
        } else {
          console.error('Max reconnection attempts reached');
        }
      }
    }, backoffDelay);
  }
}

// =============================================================================
// QUERY EXECUTION
// =============================================================================

/**
 * Execute a streaming query against the leader
 */
export function queryStream(options: StreamQueryOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!port) {
      reject(new LeaderConnectionError());
      return;
    }
    
    const queryId = crypto.randomUUID();
    const abortController = new AbortController();
    
    // Handle Arrow streaming
    const handleArrowChunk = options.onArrowChunk ? (chunk: ArrayBuffer) => {
      options.onArrowChunk!(chunk);
    } : undefined;
    
    // Handle JSON streaming
    const handleJsonChunk = options.onJsonChunk ? (rows: any[]) => {
      options.onJsonChunk!(rows);
    } : undefined;
    
    // Determine chunk handler based on format
    const onChunk = options.fmt === 'json' ? handleJsonChunk : handleArrowChunk;
    
    // Track this query
    const pendingQuery: PendingQuery = {
      resolve,
      reject,
      onChunk,
      abortController
    };
    
    inflightQueries.set(queryId, pendingQuery);
    
    // Send query request
    const request: SqlRequest = {
      id: queryId,
      type: 'sql',
      sql: options.sql,
      args: options.args,
      mode: options.mode ?? 'ro',
      fmt: options.fmt ?? 'arrow',
      chunkRows: options.chunkRows
    };
    
    try {
      port.postMessage(request);
    } catch (error) {
      inflightQueries.delete(queryId);
      reject(new LeaderConnectionError('Failed to send query to leader'));
    }
    
    // Handle abortion
    abortController.signal.addEventListener('abort', () => {
      if (port) {
        const cancelRequest: SqlRequest = { id: queryId, type: 'cancel' };
        try {
          port.postMessage(cancelRequest);
        } catch {}
      }
      
      inflightQueries.delete(queryId);
      reject(new QueryCancelledError());
    });
  });
}

/**
 * Execute a simple query and return results as Arrow Table
 */
export async function executeQuery(
  sql: string, 
  args?: any[], 
  mode: 'ro' | 'rw' = 'ro'
): Promise<any> {
  const chunks: ArrayBuffer[] = [];
  let jsonRows: any[] = [];
  let hasJsonFallback = false;
  
  await queryStream({
    sql,
    args,
    mode,
    fmt: 'arrow',
    onArrowChunk: (chunk) => chunks.push(chunk),
    onJsonChunk: (rows) => {
      jsonRows.push(...rows);
      hasJsonFallback = true;
    }
  });
  
  // Handle JSON fallback case
  if (hasJsonFallback && jsonRows.length > 0) {
    // Convert JSON data back to an Arrow Table for compatibility
    const { tableFromArrays } = await import('apache-arrow');
    
    if (jsonRows.length === 0) {
      // Return empty table with no columns
      return tableFromArrays({});
    }
    
    // Extract column names and data from JSON rows
    const firstRow = jsonRows[0];
    const columns: { [key: string]: any[] } = {};
    
    // Initialize columns
    for (const key of Object.keys(firstRow)) {
      columns[key] = [];
    }
    
    // Fill columns with data
    for (const row of jsonRows) {
      for (const key of Object.keys(columns)) {
        columns[key].push(row[key] ?? null);
      }
    }
    
    return tableFromArrays(columns);
  }
  
  // Handle Arrow IPC case
  if (chunks.length === 0) {
    throw new Error('No data returned from query');
  }
  
  // Import Arrow at runtime to avoid bundling issues
  const { tableFromIPC } = await import('apache-arrow');
  
  if (chunks.length === 1) {
    return tableFromIPC(chunks[0]);
  }
  
  // Concatenate multiple chunks
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  
  return tableFromIPC(combined.buffer);
}

/**
 * Execute a query and return results as JSON rows
 */
export async function executeQueryJson(
  sql: string, 
  args?: any[], 
  mode: 'ro' | 'rw' = 'ro'
): Promise<any[]> {
  const allRows: any[] = [];
  
  await queryStream({
    sql,
    args,
    mode,
    fmt: 'json',
    onJsonChunk: (rows) => allRows.push(...rows)
  });
  
  return allRows;
}

/**
 * Cancel a query by ID
 */
export function cancelQuery(queryId: string): void {
  const pendingQuery = inflightQueries.get(queryId);
  if (pendingQuery) {
    pendingQuery.abortController.abort();
  }
}

/**
 * Cancel all in-flight queries
 */
export function cancelAllQueries(): void {
  for (const [id, query] of inflightQueries) {
    query.abortController.abort();
  }
  inflightQueries.clear();
}

// =============================================================================
// CONNECTION STATE
// =============================================================================

/**
 * Get current client connection state
 */
export function getClientState() {
  return {
    isConnected: !!port,
    isReconnecting,
    reconnectAttempts,
    inflightQueryCount: inflightQueries.size,
    maxReconnectAttempts,
  };
}

/**
 * Force reconnection to leader
 */
export async function forceReconnect(): Promise<void> {
  if (port) {
    try {
      port.close();
    } catch {}
    port = null;
  }
  
  isReconnecting = false;
  reconnectAttempts = 0;
  
  await attemptConnection();
}