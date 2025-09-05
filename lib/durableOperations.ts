import { DuckDBManager } from './duckdbManager';

/**
 * Multi-tab aware durability operations with streaming support and UI feedback
 */

export interface WriteResult {
  success: boolean;
  rowsAffected?: number;
  error?: string;
  duration: number;
}

// UI callback registry for saving indicators
let savingCallback: ((saving: boolean) => void) | null = null;
let recoveryCallback: ((message: string, type: 'info' | 'warning') => void) | null = null;

/**
 * Register UI callbacks for write operation feedback and recovery notifications
 */
export function registerWriteCallbacks(callbacks: {
  onSavingChange?: (saving: boolean) => void;
  onRecoveryNotification?: (message: string, type: 'info' | 'warning') => void;
}) {
  savingCallback = callbacks.onSavingChange || null;
  recoveryCallback = callbacks.onRecoveryNotification || null;
}

export interface StreamingQueryOptions {
  onArrowChunk?: (chunk: ArrayBuffer) => void;
  onJsonChunk?: (rows: any[]) => void;
  onProgress?: (processed: number) => void;
  format?: 'arrow' | 'json';
  chunkRows?: number;
}

/**
 * Executes a write operation through the multi-tab system with automatic durability and UI feedback
 */
export const executeDurableWrite = async (
  query: string, 
  params: any[] = [],
  options?: {
    description?: string; // Human-readable description for logging
    retryAttempts?: number; // Number of retry attempts for transient failures
  }
): Promise<WriteResult> => {
  const description = options?.description || 'Write operation';
  const retryAttempts = options?.retryAttempts || 2;
  const startTime = performance.now();
  
  // Show saving indicator
  if (savingCallback) {
    savingCallback(true);
  }
  
  try {
    const manager = DuckDBManager.getInstance();
    
    // Wrap the query in a transaction with checkpoint for durability
    const transactionalQuery = `
      BEGIN TRANSACTION;
      ${query};
      COMMIT;
      CHECKPOINT;
    `;
    
    let lastError: Error | null = null;
    
    // Retry loop for handling transient database lock issues
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Execute through multi-tab system as a write operation
        const result = await manager.executeQuery(transactionalQuery, params, 'rw');
        
        const duration = performance.now() - startTime;
        console.log(`✓ ${description} completed in ${duration.toFixed(2)}ms`);
        
        return {
          success: true,
          rowsAffected: result?.numRows,
          duration
        };
      } catch (error: any) {
        lastError = error;
        
        // Check if this is a retryable error (database lock, busy, etc.)
        const isRetryable = /database.*locked|busy|unavailable/i.test(error.message || '');
        
        if (isRetryable && attempt < retryAttempts) {
          const delay = Math.pow(2, attempt) * 500; // Exponential backoff: 500ms, 1s, 2s
          console.warn(`${description} failed (attempt ${attempt + 1}/${retryAttempts + 1}), retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Non-retryable error or max attempts reached
        break;
      }
    }
    
    // If we get here, all attempts failed
    const duration = performance.now() - startTime;
    console.error(`✗ ${description} failed after ${duration.toFixed(2)}ms:`, lastError);
    
    return {
      success: false,
      error: lastError?.message || String(lastError),
      duration
    };
    
  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error(`✗ ${description} failed after ${duration.toFixed(2)}ms:`, error);
    
    return {
      success: false,
      error: error.message || String(error),
      duration
    };
  } finally {
    // Hide saving indicator
    if (savingCallback) {
      savingCallback(false);
    }
  }
};

/**
 * Executes a read query through the multi-tab system
 */
export const executeReadQuery = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  const manager = DuckDBManager.getInstance();
  return manager.executeQuery(query, params, 'ro');
};

/**
 * Executes a streaming read query with chunked results
 */
export const executeStreamingReadQuery = async (
  query: string,
  params: any[] = [],
  options: StreamingQueryOptions = {}
): Promise<void> => {
  const manager = DuckDBManager.getInstance();
  
  return manager.executeStreamingQuery({
    sql: query,
    args: params,
    mode: 'ro',
    fmt: options.format ?? 'arrow',
    chunkRows: options.chunkRows,
    onArrowChunk: options.onArrowChunk,
    onJsonChunk: options.onJsonChunk
  });
};

/**
 * Creates a table from a file with user-friendly feedback
 */
export const createTableFromFile = async (
  tableName: string,
  fileName: string,
  fileExtension: string
): Promise<WriteResult> => {
  let query = '';
  
  switch (fileExtension.toLowerCase()) {
    case 'csv':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}')`;
      break;
    case 'parquet':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_parquet('${fileName}')`;
      break;
    case 'json':
    case 'jsonl':
    case 'ndjson':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${fileName}', maximum_object_size = 104857600)`;
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
  
  return executeDurableWrite(query, [], {
    description: `Loading ${fileName} into table "${tableName}"`,
    retryAttempts: 3 // File operations may need more retries
  });
};

/**
 * Check for database recovery on startup and notify user
 * This is called after database initialization to detect if DuckDB performed crash recovery
 */
export async function checkDatabaseRecovery(): Promise<void> {
  try {
    const manager = DuckDBManager.getInstance();
    
    // Check if database performed recovery by looking for temporary recovery artifacts
    // DuckDB uses .wal files for write-ahead logging and recovery
    if (typeof navigator.storage !== 'undefined' && navigator.storage.getDirectory) {
      const opfsRoot = await navigator.storage.getDirectory();
      
      try {
        // Check for potential recovery indicators using DuckDB-compatible queries
        // Note: We can't directly access DuckDB's .wal files, but we can infer recovery
        // by checking database state and table existence
        
        // DuckDB doesn't have pragma_database_list, so we'll check table existence instead
        // If we get here without errors after opening the database, any necessary recovery completed successfully
        
        // Check for any temporary or system tables that might indicate recovery state
        try {
          const tempTables = await manager.executeQuery(
            "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'temp_%'",
            [],
            'ro'
          );
          // If we can query system tables successfully, the database is in a good state
        } catch (systemTableError) {
          console.log('Could not query system tables:', systemTableError);
        }
        
        // For now, we'll show a general recovery success message if OPFS database exists
        // and we successfully connected (which implies any necessary recovery completed)
        const dbState = await manager.getDatabaseState();
        
        if (dbState.isOpfsSupported && recoveryCallback) {
          // Check if this is likely a recovery scenario (database exists with data)
          const tables = await manager.executeQuery(
            "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'",
            [],
            'ro'
          );
          
          const tableCount = tables.toArray()[0]?.table_count || 0;
          
          if (tableCount > 0) {
            recoveryCallback(
              `Session restored from previous browser session with ${tableCount} table${tableCount > 1 ? 's' : ''}`,
              'info'
            );
          }
        }
      } catch (error) {
        // If we can't check recovery state, that's okay - just log it
        console.log('Could not check database recovery state:', error);
      }
    }
  } catch (error) {
    console.warn('Error checking database recovery:', error);
  }
}

/**
 * Manually trigger recovery notification (for testing)
 */
export function triggerRecoveryNotification(message: string, type: 'info' | 'warning' = 'info') {
  if (recoveryCallback) {
    recoveryCallback(message, type);
  }
}