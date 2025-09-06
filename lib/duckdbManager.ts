/**
 * @fileoverview DuckDB WASM with OPFS persistence for HomeBench
 * 
 * This module provides a functional interface for working with DuckDB WASM
 * in the browser with Origin Private File System (OPFS) persistence support
 * for the HomeBench SQL workbench application.
 * 
 * Key concepts:
 * - OPFS allows database to persist between browser sessions
 * - Falls back to in-memory storage if OPFS is not supported
 * - Uses DuckDB WASM with native OPFS support
 * - Supports full SQL workbench functionality with file uploads
 * 
 */

import * as duckdb from '@duckdb/duckdb-wasm';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Database connection state and metadata.
 * Contains the DuckDB instance and persistence information.
 * 
 * @interface DatabaseState
 */
export interface DatabaseState {
  /** The DuckDB WASM instance (null if not initialized) */
  db: duckdb.AsyncDuckDB | null;
  /** Whether OPFS persistence is being used (vs in-memory) */
  isOpfsSupported: boolean;
}

/**
 * Options for initializing the database connection.
 * 
 * @interface DatabaseOptions
 */
export interface DatabaseOptions {
  /** Path to the WASM module file */
  wasmModule?: string;
  /** Path to the worker script file */
  workerScript?: string;
  /** Database file path (use 'opfs://filename.db' for OPFS) */
  databasePath?: string;
}

// =============================================================================
// OPFS DETECTION
// =============================================================================

/**
 * Detects if Origin Private File System (OPFS) is supported in the current browser.
 * 
 * OPFS allows web applications to store files that persist between sessions
 * but are private to the origin (not accessible to other domains).
 * 
 * Requirements for OPFS support:
 * - Modern browser (Chrome 86+, Firefox 111+, Safari 15.2+)
 * - Secure context (HTTPS or localhost)
 * - Storage API with getDirectory method
 * 
 * @returns {boolean} True if OPFS is supported and available
 */
export function isOpfsSupported(): boolean {
  const hasNavigator = 'navigator' in globalThis;
  const hasStorage = hasNavigator && 'storage' in navigator;
  const hasGetDirectory = hasStorage && 'getDirectory' in navigator.storage;
  
  const supported = hasNavigator && hasStorage && hasGetDirectory;
  
  
  return supported;
}

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

/**
 * Gets the appropriate DuckDB WASM bundle for browser usage with streaming support.
 * 
 * Uses public URLs to DuckDB assets and implements streaming compilation
 * for better performance on large WASM files.
 * 
 * @param {DatabaseOptions} options - Configuration options (currently unused)
 * @returns {Promise<duckdb.DuckDBBundle>} Bundle configuration for DuckDB
 */
async function getDuckDbBundle(options: DatabaseOptions = {}): Promise<duckdb.DuckDBBundle> {
  const DUCKDB_VERSION = '1.29.1-dev269.0';
  const BASE_URL = `/duckdb/${DUCKDB_VERSION}`;

  // Define bundles using public URLs - no webpack bundling needed
  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: `${BASE_URL}/duckdb-mvp.wasm`,
      mainWorker: `${BASE_URL}/duckdb-browser-mvp.worker.js`,
    },
    eh: {
      mainModule: `${BASE_URL}/duckdb-eh.wasm`,
      mainWorker: `${BASE_URL}/duckdb-browser-eh.worker.js`,
    },
  };
  
  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  console.log('Selected DuckDB bundle:', bundle);
  return bundle;
}

/**
 * Pre-compile WASM module using streaming compilation for better performance.
 * This overlaps network transfer and compilation to reduce total loading time.
 * 
 * @param wasmUrl - URL to the WASM file
 * @param retries - Number of retry attempts for failed downloads
 * @returns Promise<WebAssembly.Module> - Compiled WASM module
 */
async function precompileWasmModule(wasmUrl: string, retries: number = 3): Promise<WebAssembly.Module | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🔄 Precompiling WASM module (attempt ${attempt + 1}/${retries}):`, wasmUrl);
      
      // Check if streaming compilation is supported
      if (typeof WebAssembly.compileStreaming === 'function') {
        console.log('✓ Using WebAssembly.compileStreaming for optimal performance');
        const response = fetch(wasmUrl);
        const wasmModule = await WebAssembly.compileStreaming(response);
        console.log('✓ WASM module compiled successfully via streaming');
        return wasmModule;
      } else {
        // Fallback to traditional compilation
        console.log('⚠️ Using fallback WASM compilation (streaming not supported)');
        const response = await fetch(wasmUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const wasmModule = await WebAssembly.compile(arrayBuffer);
        console.log('✓ WASM module compiled successfully via fallback');
        return wasmModule;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ WASM compilation attempt ${attempt + 1} failed:`, error);
      
      // Exponential backoff for retries
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s delays
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ All WASM compilation attempts failed:', lastError);
  return null; // Return null instead of throwing to allow graceful fallback
}

/**
 * Initializes DuckDB WASM with OPFS persistence support.
 * 
 * This function:
 * 1. Detects OPFS support in the browser
 * 2. Creates a DuckDB instance with a web worker
 * 3. Attempts to open a persistent database file via OPFS
 * 4. Falls back to in-memory storage if OPFS fails
 * 5. Sets up the database for SQL workbench usage
 * 
 * @param {DatabaseOptions} options - Configuration for database initialization
 * @returns {Promise<DatabaseState>} Database state with connection and metadata
 * 
 * @throws {Error} If DuckDB initialization fails completely
 */
export async function initializeDatabase(options: DatabaseOptions = {}): Promise<DatabaseState> {
  console.log('Initializing DuckDB...');
  
  // Step 1: Check OPFS support
  const opfsSupported = isOpfsSupported();
  console.log('OPFS supported:', opfsSupported);
  
  try {
    // Step 2: Get DuckDB bundle and create worker
    const bundle = await getDuckDbBundle(options);
    
    // Helper function to create a fresh database instance
    const createDatabaseInstance = async (): Promise<duckdb.AsyncDuckDB> => {
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      const dbInstance = new duckdb.AsyncDuckDB(logger, worker);
      
      // DuckDB-WASM handles streaming compilation internally when we pass the URL
      await dbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      return dbInstance;
    };

    // Step 3: Trigger precompilation for browser caching (runs in background)
    // This helps with subsequent page loads by warming the browser cache
    try {
      precompileWasmModule(bundle.mainModule!).catch(error => {
        console.warn('WASM precompilation failed (background process):', error);
      });
    } catch (error) {
      console.warn('Failed to start WASM precompilation:', error);
    }

    // Step 4: Create initial database instance
    let db = await createDatabaseInstance();
    console.log('DuckDB instantiated');

    // DuckDB WASM will handle OPFS registration automatically when opening with opfs:// path
    
    // Step 5: Attempt to open database with OPFS or fallback
    let actuallyUsingOpfs = opfsSupported;
    const dbPath = options.databasePath || 'opfs://homebench.db';
    
    try {
      if (opfsSupported && dbPath.startsWith('opfs://')) {
        console.log('Attempting to open OPFS database:', dbPath);
        
        try {
          await db.open({
            path: dbPath,
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
          });
          
          // Test write access by creating a simple checkpoint
          const testConn = await db.connect();
          try {
            await testConn.query('CHECKPOINT');
            console.log('OPFS database opened successfully with write access');
          } catch (checkpointError) {
            console.warn('OPFS database opened but checkpoint failed:', checkpointError);
          } finally {
            await testConn.close();
          }
        } catch (walError: any) {
          // Check if this is a WAL replay error due to table conflicts
          if (walError.message?.includes('Table with name') && walError.message?.includes('already exists') && 
              walError.message?.includes('replaying WAL file')) {
            
            console.warn('WAL recovery conflict detected, attempting to resolve by clearing corrupted WAL...', walError.message);
            
            try {
              // Try to clear the problematic WAL file by opening with a fresh database
              // First terminate the current database instance
              await db.terminate();
              
              // Create a new instance and try to open with recovery
              db = await createDatabaseInstance();
              console.log('Created fresh DuckDB instance for WAL recovery');
              
              // Remove the corrupted OPFS database to start fresh
              // This is safer than trying to manually fix WAL conflicts
              const { wipeOpfsData } = await import('./opfsUtils');
              await wipeOpfsData();
              console.log('Cleared corrupted OPFS data to resolve WAL conflict');
              
              // Now open a fresh database
              await db.open({
                path: dbPath,
                accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
              });
              
              console.log('✓ WAL conflict resolved - opened fresh database');
              
              // Notify about WAL recovery via recovery callback if available
              try {
                const { triggerRecoveryNotification } = await import('./durableOperations');
                triggerRecoveryNotification(
                  'Database recovered from corrupted state - starting with fresh session', 
                  'warning'
                );
              } catch (notificationError) {
                console.log('Could not send recovery notification:', notificationError);
              }
            } catch (recoveryError) {
              console.warn('WAL recovery failed, falling back to in-memory database:', recoveryError);
              throw recoveryError; // This will trigger the fallback below
            }
          } else {
            // Re-throw non-WAL errors
            throw walError;
          }
        }
      } else {
        console.log('OPFS not supported or not requested, using in-memory database');
        actuallyUsingOpfs = false;
        await db.open({
          path: ':memory:',
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
      }
    } catch (error) {
      console.warn('Failed to open OPFS database, falling back to in-memory:', error);
      actuallyUsingOpfs = false;
      
      // Make sure we have a clean database instance for in-memory fallback
      try {
        await db.terminate();
        db = await createDatabaseInstance();
      } catch (terminateError) {
        console.warn('Failed to terminate database for fallback:', terminateError);
      }
      
      await db.open({
        path: ':memory:',
        accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
      });
    }
    
    console.log('Database initialized successfully');
    
    return {
      db,
      isOpfsSupported: actuallyUsingOpfs
    };
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

// =============================================================================
// DATABASE LIFECYCLE
// =============================================================================

/**
 * Properly closes the database connection and flushes any pending writes.
 * 
 * This function should be called when the application is shutting down
 * or when you're done with the database. It ensures:
 * 1. All pending writes are flushed to disk
 * 2. Database connections are properly closed
 * 3. Worker threads are terminated
 * 
 * @param {DatabaseState} dbState - The database state object
 * @returns {Promise<void>}
 */
export async function closeDatabase(dbState: DatabaseState): Promise<void> {
  if (!dbState.db) {
    console.log('Database already closed or not initialized');
    return;
  }
  
  try {
    // Flush any pending writes before closing
    const conn = await dbState.db.connect();
    try {
      await conn.query('CHECKPOINT');
      console.log('Database flushed');
    } catch (error) {
      console.warn('Failed to flush database:', error);
    } finally {
      await conn.close();
    }
    
    // Terminate the database and worker
    await dbState.db.terminate();
    dbState.db = null;
    console.log('Database closed');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

// =============================================================================
// SINGLETON MANAGER CLASS
// =============================================================================

/**
 * Multi-tab aware database manager with leader-client coordination
 */
export class DuckDBManager {
  private static instance: DuckDBManager | null = null;
  private dbState: DatabaseState | null = null;
  private initPromise: Promise<DatabaseState> | null = null;
  private multiTabInitialized = false;

  private constructor() {}

  public static getInstance(): DuckDBManager {
    if (!DuckDBManager.instance) {
      DuckDBManager.instance = new DuckDBManager();
    }
    return DuckDBManager.instance;
  }

  public async getDatabase(): Promise<duckdb.AsyncDuckDB> {
    const dbState = await this.getDatabaseState();
    if (!dbState.db) {
      throw new Error('Database not initialized');
    }
    return dbState.db;
  }

  public async getDatabaseState(): Promise<DatabaseState> {
    if (this.dbState?.db) {
      return this.dbState;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDatabaseState();
    return this.initPromise;
  }

  private async initializeDatabaseState(): Promise<DatabaseState> {
    // Initialize multi-tab coordination system first
    if (!this.multiTabInitialized) {
      const { boot } = await import('./multitab/boot');
      await boot();
      this.multiTabInitialized = true;
    }

    // Check if we're the leader or client
    const { getMultiTabState } = await import('./multitab/boot');
    const multiTabState = getMultiTabState();
    
    console.log(`🔍 Multi-tab state: isLeader=${multiTabState.isLeader}, initialized=${multiTabState.isInitialized}`);
    
    if (multiTabState.isLeader) {
      // Leader tab: initialize the database directly and store it
      console.log('✓ Database manager initialized as LEADER');
      const directDbState = await initializeDatabase({
        databasePath: 'opfs://homebench.db'
      });
      
      this.dbState = {
        db: directDbState.db, // Leader has direct DB access
        isOpfsSupported: directDbState.isOpfsSupported
      };
      
      // Initialize the leader system with the database we just created
      if (directDbState.db) {
        const { setLeaderDatabase, initializeLeader } = await import('./multitab/leader');
        setLeaderDatabase(directDbState.db, directDbState.isOpfsSupported);
        await initializeLeader();
      } else {
        throw new Error('Failed to initialize database for leader');
      }
    } else {
      // Client tab: we connect through the multi-tab system
      console.log('✓ Database manager initialized as CLIENT');
      this.dbState = {
        db: null, // Clients don't have direct DB access
        isOpfsSupported: true // Shared through leader
      };
    }
    
    this.registerShutdownHandlers();
    
    return this.dbState;
  }

  private registerShutdownHandlers(): void {
    const handleBeforeUnload = () => {
      if (this.dbState?.db) {
        // Fire-and-forget checkpoint and flush on page unload
        this.checkpointAndFlushDatabase().catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && this.dbState?.db) {
        // Fire-and-forget flush when page becomes hidden
        this.flushDatabase().catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Periodic flush every 3 seconds as safety net
    setInterval(() => {
      if (this.dbState?.db) {
        this.flushDatabase().catch(console.error);
      }
    }, 3000);
  }

  private async checkpointDatabase(): Promise<void> {
    if (!this.dbState?.db) return;
    
    const connection = await this.dbState.db.connect();
    try {
      await connection.query('CHECKPOINT');
      console.log('✓ Database checkpointed');
    } finally {
      await connection.close();
    }
  }

  private async flushDatabase(): Promise<void> {
    if (!this.dbState?.db) return;
    
    try {
      await this.dbState.db.flushFiles();
      console.log('✓ Database flushed to OPFS');
    } catch (error) {
      console.warn('Failed to flush database:', error);
    }
  }

  private async checkpointAndFlushDatabase(): Promise<void> {
    if (!this.dbState?.db) return;
    
    const connection = await this.dbState.db.connect();
    try {
      await connection.query('CHECKPOINT');
      await this.dbState.db.flushFiles();
      console.log('✓ Database checkpointed and flushed to OPFS');
    } catch (error) {
      console.warn('Failed to checkpoint and flush database:', error);
    } finally {
      await connection.close();
    }
  }

  public async reset(): Promise<void> {
    // Clean up multi-tab system
    if (this.multiTabInitialized) {
      const { cleanup } = await import('./multitab/boot');
      cleanup();
      this.multiTabInitialized = false;
    }
    
    if (this.dbState) {
      await closeDatabase(this.dbState);
      this.dbState = null;
    }
    this.initPromise = null;
    DuckDBManager.instance = null;
  }

  /**
   * Execute a query through the multi-tab system
   * This provides a unified interface regardless of leader/client role
   */
  public async executeQuery(sql: string, args?: any[], mode: 'ro' | 'rw' = 'ro'): Promise<any> {
    const { getMultiTabState } = await import('./multitab/boot');
    const state = getMultiTabState();
    
    if (state.isLeader) {
      // Leader executes directly - fallback for legacy compatibility
      // In practice, queries should go through the client interface for consistency
      const db = await this.getDatabase();
      const conn = await db.connect();
      try {
        let result;
        if (args && args.length > 0) {
          const stmt = await conn.prepare(sql);
          try {
            result = await stmt.query(...args);
          } finally {
            await stmt.close();
          }
        } else {
          result = await conn.query(sql);
        }
        return result;
      } finally {
        await conn.close();
      }
    } else {
      // Client executes through multi-tab system
      const { executeQuery } = await import('./multitab/client');
      return executeQuery(sql, args, mode);
    }
  }

  /**
   * Execute a streaming query through the multi-tab system
   */
  public async executeStreamingQuery(options: {
    sql: string;
    args?: any[];
    mode?: 'ro' | 'rw';
    fmt?: 'arrow' | 'json';
    chunkRows?: number;
    onArrowChunk?: (buf: ArrayBuffer) => void;
    onJsonChunk?: (rows: any[]) => void;
  }): Promise<void> {
    const { queryStream } = await import('./multitab/client');
    return queryStream(options);
  }

  /**
   * Get multi-tab system status
   */
  public async getMultiTabStatus() {
    if (!this.multiTabInitialized) {
      return { initialized: false };
    }

    const { getMultiTabState } = await import('./multitab/boot');
    const bootState = getMultiTabState();
    
    if (bootState.isLeader) {
      const { getLeaderStats } = await import('./multitab/leader');
      return {
        initialized: true,
        role: 'leader',
        ...bootState,
        ...getLeaderStats()
      };
    } else {
      const { getClientState } = await import('./multitab/client');
      return {
        initialized: true,
        role: 'client',
        ...bootState,
        ...getClientState()
      };
    }
  }
}

// Singleton instance getter for easy import
export const getDuckDB = async (): Promise<duckdb.AsyncDuckDB> => {
  const manager = DuckDBManager.getInstance();
  return manager.getDatabase();
};

/**
 * Get a list of all user-defined tables in the database
 */
export const getTables = async (): Promise<string[]> => {
  const { executeReadQuery } = await import('./durableOperations');
  const result = await executeReadQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name;`
  );
  return result.toArray().map((row: any) => row.table_name);
};

