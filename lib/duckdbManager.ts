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
  
  console.log('OPFS detection details:', {
    hasNavigator,
    hasStorage,
    hasGetDirectory,
    supported
  });
  
  return supported;
}

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

/**
 * Gets the appropriate DuckDB WASM bundle for browser usage.
 * 
 * Uses public URLs to DuckDB assets instead of bundling them through webpack
 * for better build performance and faster development.
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
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    // Step 3: Instantiate DuckDB WASM
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    console.log('DuckDB instantiated');

    // DuckDB WASM will handle OPFS registration automatically when opening with opfs:// path
    
    // Step 4: Attempt to open database with OPFS or fallback
    let actuallyUsingOpfs = opfsSupported;
    const dbPath = options.databasePath || 'opfs://homebench.db';
    
    try {
      if (opfsSupported && dbPath.startsWith('opfs://')) {
        console.log('Attempting to open OPFS database:', dbPath);
        await db.open({
          path: 'opfs://homebench.db',
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
        console.log('OPFS database opened successfully');
      } else {
        console.log('OPFS not supported or not requested, using in-memory database');
        actuallyUsingOpfs = false;
        await db.open({
          path: ':memory:',
        });
      }
    } catch (error) {
      console.warn('Failed to open OPFS database, falling back to in-memory:', error);
      actuallyUsingOpfs = false;
      await db.open({
        path: ':memory:',
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
 * Simplified singleton database manager - fail fast approach with working implementation
 */
export class DuckDBManager {
  private static instance: DuckDBManager | null = null;
  private dbState: DatabaseState | null = null;
  private initPromise: Promise<DatabaseState> | null = null;

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
    this.dbState = await initializeDatabase({
      databasePath: 'opfs://homebench.db'
    });
    
    this.registerShutdownHandlers();
    
    return this.dbState;
  }

  private registerShutdownHandlers(): void {
    const handleBeforeUnload = () => {
      if (this.dbState?.db) {
        // Fire-and-forget checkpoint on page unload
        this.checkpointDatabase().catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
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

  public async reset(): Promise<void> {
    if (this.dbState) {
      await closeDatabase(this.dbState);
      this.dbState = null;
    }
    this.initPromise = null;
    DuckDBManager.instance = null;
  }
}

// Singleton instance getter for easy import
export const getDuckDB = async (): Promise<duckdb.AsyncDuckDB> => {
  const manager = DuckDBManager.getInstance();
  return manager.getDatabase();
};

