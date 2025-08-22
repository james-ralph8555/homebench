'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { DB_FILE_NAME, DB_VFS_PATH, checkOPFSDatabaseExists } from '@/lib/opfsUtils';

// Define the shape of the context state
interface DuckDBContextType {
  db: any | null; // Using any temporarily to avoid import issues
  isLoading: boolean;
  error: Error | null;
}

// Create the context with a default undefined value
const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

// Define the props for the provider component
interface DuckDBProviderProps {
  children: ReactNode;
}


// Create the provider component
export const DuckDBProvider: React.FC<DuckDBProviderProps> = ({ children }) => {
  const [db, setDb] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const instantiateDB = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const duckdb = await import('@duckdb/duckdb-wasm');
        
        // Use jsdelivr CDN for reliable bundle loading
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        
        const worker = await duckdb.createWorker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        const dbInstance = new duckdb.AsyncDuckDB(logger, worker);
        
        await dbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
        
        // Try to open a persistent database backed by OPFS using DuckDB's VFS
        try {
          await dbInstance.open({
            path: DB_VFS_PATH,
            accessMode: duckdb.DuckDBAccessMode?.READ_WRITE || 1,
          });
          console.log(`Opened DuckDB with OPFS persistence at ${DB_VFS_PATH}`);
        } catch (err: any) {
          console.warn('Failed to open OPFS-backed DB:', err);
          
          // Check if it's a corruption error
          const isCorruption = err?.message?.includes('not a valid DuckDB database file') ||
                              err?.message?.includes('IO');
          
          if (isCorruption) {
            console.warn('Database file appears corrupted, attempting aggressive recovery...');
            try {
              // Clean up corrupted files first (before terminating the instance)
              const { deleteDatabaseFromOPFS } = await import('@/lib/opfsUtils');
              await deleteDatabaseFromOPFS();
              
              // Terminate the current instance to release any locks
              await dbInstance.terminate();
              
              // Wait a bit for cleanup to complete
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Create a fresh DuckDB instance
              const worker2 = await duckdb.createWorker(bundle.mainWorker!);
              const logger2 = new duckdb.ConsoleLogger();
              const freshDbInstance = new duckdb.AsyncDuckDB(logger2, worker2);
              await freshDbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
              
              // Try opening fresh database with new instance
              await freshDbInstance.open({
                path: DB_VFS_PATH,
                accessMode: duckdb.DuckDBAccessMode?.READ_WRITE || 1,
              });
              
              console.log(`✓ Recovered: Created fresh DuckDB with OPFS persistence at ${DB_VFS_PATH}`);
              setDb(freshDbInstance);
              return; // Exit early since we have a working instance
            } catch (recoveryErr) {
              console.warn('Aggressive recovery failed, creating fresh in-memory instance:', recoveryErr);
              
              // Create a completely fresh instance for in-memory use
              try {
                const worker3 = await duckdb.createWorker(bundle.mainWorker!);
                const logger3 = new duckdb.ConsoleLogger();
                const memoryDbInstance = new duckdb.AsyncDuckDB(logger3, worker3);
                await memoryDbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
                // Don't call open() for in-memory database
                console.log(`✓ Created fresh in-memory DuckDB instance`);
                setDb(memoryDbInstance);
                return;
              } catch (memoryErr) {
                console.error('Failed to create in-memory instance:', memoryErr);
                // This will fall through to the original instance setup
              }
            }
          } else {
            console.warn('Using in-memory DB instead');
            // Don't throw - just use in-memory database
          }
        }
        
        
        setDb(dbInstance);
      } catch (e: any) {
        console.error("Failed to instantiate DuckDB:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined' && !db && isLoading) {
      instantiateDB();
    }

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        if (db) {
          await db.terminate();
        }
      };
      cleanup();
    };
  }, []); // Empty dependency array to run only once

  const value = { db, isLoading, error };

  return (
    <DuckDBContext.Provider value={value}>
      {children}
    </DuckDBContext.Provider>
  );
};

// Create a custom hook for easy consumption of the context
export const useDuckDB = (): DuckDBContextType => {
  const context = useContext(DuckDBContext);
  if (context === undefined) {
    throw new Error('useDuckDB must be used within a DuckDBProvider');
  }
  return context;
};
