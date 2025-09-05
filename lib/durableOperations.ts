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

export interface ConnectionHealth {
  canRead: boolean;
  canWrite: boolean;
  error?: string;
}

// UI callback registry for saving indicators
let savingCallback: ((saving: boolean) => void) | null = null;
let recoveryCallback: ((message: string, type: 'info' | 'warning') => void) | null = null;
let commitCallback: ((timestamp: Date) => void) | null = null;

/**
 * Register UI callbacks for write operation feedback and recovery notifications
 */
export function registerWriteCallbacks(callbacks: {
  onSavingChange?: (saving: boolean) => void;
  onRecoveryNotification?: (message: string, type: 'info' | 'warning') => void;
  onCommitSuccess?: (timestamp: Date) => void;
}) {
  savingCallback = callbacks.onSavingChange || null;
  recoveryCallback = callbacks.onRecoveryNotification || null;
  commitCallback = callbacks.onCommitSuccess || null;
}

/**
 * Validates database connection health and write capabilities
 */
async function validateConnectionHealth(manager: DuckDBManager): Promise<ConnectionHealth> {
  try {
    // First test basic read capability
    let canRead = false;
    try {
      await manager.executeQuery('SELECT 1 as test', [], 'ro');
      canRead = true;
    } catch (readError) {
      console.warn('Connection read test failed:', readError);
      return {
        canRead: false,
        canWrite: false,
        error: `Read capability failed: ${readError instanceof Error ? readError.message : String(readError)}`
      };
    }

    // Test write capability with a minimal write operation
    let canWrite = false;
    try {
      // Test the actual problematic path: creating a temporary table
      // This is what fails in the real file upload scenario
      const testTableName = `health_check_${Date.now()}`;
      
      // Try to create a temporary table - it will be automatically dropped when connection closes
      // We don't need to explicitly DROP it since DuckDB handles temp table cleanup automatically
      await manager.executeQuery(`CREATE TEMPORARY TABLE ${testTableName} AS SELECT 1 as test_col`, [], 'rw');
      
      canWrite = true;
    } catch (writeError: any) {
      console.warn('Connection write test failed:', writeError);
      
      // Check if this is the specific "write mode" error we're trying to fix
      if (writeError.message?.includes('File is not opened in write mode') || 
          writeError.message?.includes('TransactionContext')) {
        return {
          canRead,
          canWrite: false,
          error: `Write capability corrupted: ${writeError.message}`
        };
      }
      
      return {
        canRead,
        canWrite: false,
        error: `Write capability failed: ${writeError.message || String(writeError)}`
      };
    }

    return { canRead, canWrite };
  } catch (error) {
    return {
      canRead: false,
      canWrite: false,
      error: `Connection validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Attempts to recover from connection write-mode corruption
 */
async function attemptConnectionRecovery(manager: DuckDBManager, description: string): Promise<boolean> {
  try {
    console.log(`🔧 Attempting connection recovery for: ${description}`);
    
    // Get database state to determine if we're leader or client
    const dbState = await manager.getDatabaseState();
    const isLeader = !!dbState?.db;

    if (isLeader) {
      // Leader path: Try to refresh the database connection by creating new connections
      console.log('🔧 Leader attempting database connection refresh...');
      
      const db = await manager.getDatabase();
      
      // Test if we can create a fresh connection with write access
      let testConn;
      try {
        testConn = await db.connect();
        
        // Try to perform a checkpoint to verify write access
        await testConn.query('CHECKPOINT');
        console.log('✓ Connection recovery successful - checkpoint completed');
        
        // Notify user about recovery
        if (recoveryCallback) {
          recoveryCallback('Database connection recovered from corrupted state', 'info');
        }
        
        return true;
      } catch (freshConnError: any) {
        console.warn('Fresh connection test failed:', freshConnError);
        
        // If checkpoint fails with write mode error, the database itself may be corrupted
        if (freshConnError.message?.includes('File is not opened in write mode')) {
          console.error('🚨 Database-level write corruption detected');
          
          if (recoveryCallback) {
            recoveryCallback('Database write access corrupted. Please refresh the page or clear OPFS data.', 'warning');
          }
          
          return false;
        }
      } finally {
        if (testConn) {
          try { await testConn.close(); } catch {}
        }
      }
    } else {
      // Client path: The issue might be in the multi-tab communication
      console.log('🔧 Client attempting connection recovery through leader...');
      
      // For clients, try a simple health check that might trigger leader reconnection
      try {
        await manager.executeQuery('SELECT 1', [], 'rw');
        console.log('✓ Client connection recovery successful');
        return true;
      } catch (clientRecoveryError) {
        console.warn('Client connection recovery failed:', clientRecoveryError);
        return false;
      }
    }
    
    return false;
  } catch (recoveryError) {
    console.error('Connection recovery attempt failed:', recoveryError);
    return false;
  }
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

    // PHASE 1: Validate connection health before attempting write operation
    console.log(`🔍 Validating connection health for: ${description}`);
    const healthCheck = await validateConnectionHealth(manager);
    
    if (!healthCheck.canRead) {
      console.error(`❌ Connection health check failed - no read access: ${healthCheck.error}`);
      return {
        success: false,
        error: `Database connection failed: ${healthCheck.error}`,
        duration: performance.now() - startTime
      };
    }
    
    if (!healthCheck.canWrite) {
      console.warn(`⚠️ Connection health check failed - no write access: ${healthCheck.error}`);
      
      // Attempt recovery before failing
      const recoverySuccessful = await attemptConnectionRecovery(manager, description);
      
      if (!recoverySuccessful) {
        console.error(`❌ Connection recovery failed for: ${description}`);
        return {
          success: false,
          error: `Write capability corrupted and recovery failed: ${healthCheck.error}. Try refreshing the page.`,
          duration: performance.now() - startTime
        };
      }
      
      console.log(`✓ Connection recovery successful for: ${description}`);
      
      // Verify recovery was successful with another health check
      const postRecoveryHealth = await validateConnectionHealth(manager);
      if (!postRecoveryHealth.canWrite) {
        console.error(`❌ Connection still corrupted after recovery: ${postRecoveryHealth.error}`);
        return {
          success: false,
          error: `Write capability still corrupted after recovery. Please refresh the page.`,
          duration: performance.now() - startTime
        };
      }
    }

    console.log(`✓ Connection health validated for: ${description}`);

    // PHASE 2: Decide whether we are leader (direct DB access) or client (proxy via leader)
    // If we have a direct DB handle, we're the leader; otherwise we're a client
    const dbState = await manager.getDatabaseState();
    const isLeader = !!dbState?.db;

    // PHASE 3: Execute with retry to handle transient lock issues
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      // Leader path: run the full transaction on a single connection
      if (isLeader) {
        const db = await manager.getDatabase();
        const conn = await db.connect();
        try {
          // Try to perform the write operation without an explicit transaction first
          // DuckDB WASM may have issues with write mode being lost during explicit transactions
          if (params && params.length > 0) {
            const stmt = await conn.prepare(query);
            try {
              await stmt.query(...params);
            } finally {
              await stmt.close();
            }
          } else {
            await conn.query(query);
          }

          // Perform checkpoint to ensure data is written to OPFS
          await conn.query('CHECKPOINT');

          const duration = performance.now() - startTime;
          console.log(`✓ ${description} completed in ${duration.toFixed(2)}ms`);
          
          // Notify about successful commit
          if (commitCallback) {
            commitCallback(new Date());
          }
          
          return { success: true, duration };
        } catch (error: any) {
          lastError = error;
          // No rollback needed since we're not using explicit transactions

          // Check for write-mode corruption errors specifically
          const isWriteModeError = error.message?.includes('File is not opened in write mode') ||
                                  error.message?.includes('TransactionContext');
          
          if (isWriteModeError) {
            console.error(`🚨 Write-mode corruption detected during ${description}:`, error.message);
            
            // Try recovery if this is our first attempt
            if (attempt === 0) {
              console.log(`🔧 Attempting recovery for write-mode corruption during ${description}`);
              const recoverySuccessful = await attemptConnectionRecovery(manager, description);
              
              if (recoverySuccessful) {
                const delay = 1000; // Give recovery some time
                console.warn(`${description} write-mode recovery attempted, retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Retry with recovered connection
              } else {
                console.error(`❌ Recovery failed for ${description}`);
                break; // Exit retry loop - recovery failed
              }
            } else {
              console.error(`❌ Write-mode corruption persisted after recovery for ${description}`);
              break; // Exit retry loop - already tried recovery
            }
          }

          const isRetryable = /database.*locked|busy|unavailable/i.test(error.message || '');
          if (isRetryable && attempt < retryAttempts) {
            const delay = Math.pow(2, attempt) * 500;
            console.warn(`${description} failed (attempt ${attempt + 1}/${retryAttempts + 1}), retrying in ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        } finally {
          await conn.close();
        }
      }

      // Client path: proxy statements to leader; connection is stable per client
      try {
        // Execute the write operation directly without explicit transaction
        if (params && params.length > 0) {
          await manager.executeQuery(query, params, 'rw');
        } else {
          await manager.executeQuery(query, [], 'rw');
        }
        // Perform checkpoint to ensure data is written to OPFS
        await manager.executeQuery('CHECKPOINT', [], 'rw');

        const duration = performance.now() - startTime;
        console.log(`✓ ${description} completed in ${duration.toFixed(2)}ms`);
        
        // Notify about successful commit
        if (commitCallback) {
          commitCallback(new Date());
        }
        
        return { success: true, duration };
      } catch (error: any) {
        lastError = error;
        // No rollback needed since we're not using explicit transactions

        // Check for write-mode corruption errors specifically
        const isWriteModeError = error.message?.includes('File is not opened in write mode') ||
                                error.message?.includes('TransactionContext');
        
        if (isWriteModeError) {
          console.error(`🚨 Write-mode corruption detected in client during ${description}:`, error.message);
          
          // Try recovery if this is our first attempt  
          if (attempt === 0) {
            console.log(`🔧 Attempting client recovery for write-mode corruption during ${description}`);
            const recoverySuccessful = await attemptConnectionRecovery(manager, description);
            
            if (recoverySuccessful) {
              const delay = 1000; // Give recovery some time
              console.warn(`${description} client write-mode recovery attempted, retrying in ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry with recovered connection
            } else {
              console.error(`❌ Client recovery failed for ${description}`);
              break; // Exit retry loop - recovery failed
            }
          } else {
            console.error(`❌ Client write-mode corruption persisted after recovery for ${description}`);
            break; // Exit retry loop - already tried recovery
          }
        }

        const isRetryable = /database.*locked|busy|unavailable/i.test(error.message || '');
        if (isRetryable && attempt < retryAttempts) {
          const delay = Math.pow(2, attempt) * 500;
          console.warn(`${description} failed (attempt ${attempt + 1}/${retryAttempts + 1}), retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }

    // If we get here, all attempts failed
    const duration = performance.now() - startTime;
    console.error(`✗ ${description} failed after ${duration.toFixed(2)}ms:`, lastError);

    return { success: false, error: lastError?.message || String(lastError), duration };

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
 * Executes multiple read queries sequentially on the same connection when possible.
 * - Leader: uses a single direct DuckDB connection for all statements.
 * - Client: sends sequential requests over the dedicated MessagePort (same connection on leader).
 * Returns an array of results in the same order as the queries.
 */
export const executeReadQuerySequence = async (
  queries: string[]
): Promise<any[]> => {
  const manager = DuckDBManager.getInstance();
  const { getMultiTabState } = await import('./multitab/boot');
  const state = getMultiTabState();

  if (state.isLeader) {
    // Run all queries on a single connection
    const db = await manager.getDatabase();
    const conn = await db.connect();
    try {
      const results: any[] = [];
      for (const sql of queries) {
        const res = await conn.query(sql);
        results.push(res);
      }
      return results;
    } finally {
      await conn.close();
    }
  }

  // Client path: send sequentially over the same dedicated port/connection
  const results: any[] = [];
  for (const sql of queries) {
    const res = await manager.executeQuery(sql, [], 'ro');
    results.push(res);
  }
  return results;
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
 * Creates a table from a file with custom column types and graceful error handling
 */
export const createTableFromFileWithSchema = async (
  tableName: string,
  fileName: string,
  fileExtension: string,
  columns: Array<{ column_name: string; column_type: string; null?: string; key?: string; default?: string; extra?: string }>,
  typeOverrides: { columnName: string; newType: string }[] = []
): Promise<WriteResult & { castWarnings?: string[] }> => {
  // Import schema generation functions
  const { generateRobustCustomTableSQL } = await import('./schemaDetection');
  
  try {
    // Convert basic column info to ColumnInfo format
    const columnInfos = columns.map(col => ({
      column_name: col.column_name,
      column_type: col.column_type,
      null: col.null || 'YES',
      key: col.key || '',
      default: col.default || '',
      extra: col.extra || ''
    }));
    
    const query = generateRobustCustomTableSQL(
      tableName,
      fileName,
      fileExtension,
      columnInfos,
      typeOverrides
    );
    
    const result = await executeDurableWrite(query, [], {
      description: `Loading ${fileName} into table "${tableName}" with custom schema`,
      retryAttempts: 3
    });
    
    // If successful with custom types, check for any casting warnings
    if (result.success && typeOverrides.length > 0) {
      try {
        // Check if any columns have NULL values that might indicate casting failures
        const nullCheckQueries = typeOverrides.map(override => 
          `SELECT COUNT(*) as null_count FROM "${tableName}" WHERE "${override.columnName}" IS NULL`
        );
        
        const castWarnings: string[] = [];
        
        for (let i = 0; i < typeOverrides.length; i++) {
          const override = typeOverrides[i];
          const nullResult = await executeReadQuery(nullCheckQueries[i]);
          const nullCount = nullResult.toArray()[0]?.null_count || 0;
          
          if (nullCount > 0) {
            castWarnings.push(
              `Column "${override.columnName}" has ${nullCount} values that could not be cast to ${override.newType}`
            );
          }
        }
        
        return {
          ...result,
          castWarnings: castWarnings.length > 0 ? castWarnings : undefined
        };
      } catch (warningError) {
        console.warn('Could not check for casting warnings:', warningError);
        // Return success even if we can't check warnings
        return result;
      }
    }
    
    return result;
  } catch (error: any) {
    // If custom schema fails, try fallback to auto-detection
    console.warn(`Custom schema failed for ${fileName}, falling back to auto-detection:`, error.message);
    
    const fallbackResult = await createTableFromFile(tableName, fileName, fileExtension);
    
    if (fallbackResult.success) {
      return {
        ...fallbackResult,
        castWarnings: [`Custom type casting failed, used auto-detected types instead: ${error.message}`]
      };
    } else {
      // Both custom and fallback failed
      return {
        success: false,
        error: `Both custom schema and auto-detection failed. Custom error: ${error.message}. Auto-detection error: ${fallbackResult.error}`,
        duration: fallbackResult.duration
      };
    }
  }
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

/**
 * Perform comprehensive connection health diagnostics
 * This can be called from UI components to help troubleshoot connection issues
 */
export async function performConnectionDiagnostics(): Promise<{
  health: ConnectionHealth;
  diagnostics: {
    timestamp: string;
    isLeader: boolean;
    opfsSupported: boolean;
    multiTabStatus: any;
    databaseTables: string[];
  };
}> {
  const timestamp = new Date().toISOString();
  
  try {
    const manager = DuckDBManager.getInstance();
    
    // Get basic database state
    const dbState = await manager.getDatabaseState();
    const isLeader = !!dbState?.db;
    
    // Get multi-tab status
    let multiTabStatus;
    try {
      multiTabStatus = await manager.getMultiTabStatus();
    } catch (error) {
      multiTabStatus = { error: error instanceof Error ? error.message : String(error) };
    }
    
    // Perform health check
    const health = await validateConnectionHealth(manager);
    
    // Get table list to verify database state
    let databaseTables: string[] = [];
    try {
      if (health.canRead) {
        const result = await manager.executeQuery(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name",
          [],
          'ro'
        );
        databaseTables = result.toArray().map((row: any) => row.table_name);
      }
    } catch (error) {
      console.warn('Could not retrieve table list for diagnostics:', error);
    }
    
    const diagnostics = {
      timestamp,
      isLeader,
      opfsSupported: dbState.isOpfsSupported,
      multiTabStatus,
      databaseTables
    };
    
    console.log('📊 Connection diagnostics:', { health, diagnostics });
    
    return { health, diagnostics };
  } catch (error) {
    console.error('Failed to perform connection diagnostics:', error);
    
    return {
      health: {
        canRead: false,
        canWrite: false,
        error: `Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`
      },
      diagnostics: {
        timestamp,
        isLeader: false,
        opfsSupported: false,
        multiTabStatus: { error: 'Could not get status' },
        databaseTables: []
      }
    };
  }
}

/**
 * Export connection health check for external use
 */
export async function checkConnectionHealth(): Promise<ConnectionHealth> {
  try {
    const manager = DuckDBManager.getInstance();
    return await validateConnectionHealth(manager);
  } catch (error) {
    return {
      canRead: false,
      canWrite: false,
      error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Force connection recovery (for external triggers)
 */
export async function forceConnectionRecovery(description = 'Manual recovery'): Promise<boolean> {
  try {
    const manager = DuckDBManager.getInstance();
    return await attemptConnectionRecovery(manager, description);
  } catch (error) {
    console.error('Force connection recovery failed:', error);
    return false;
  }
}
