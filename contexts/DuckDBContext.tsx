'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { DB_FILE_NAME, checkOPFSDatabaseExists } from '@/lib/opfsUtils';

// Define the shape of the context state
interface DuckDBContextType {
  db: any | null; // Using any temporarily to avoid import issues
  isLoading: boolean;
  error: Error | null;
  connectionPool: any | null; // Pool for reusing connections
}

// Create the context with a default undefined value
const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

// Define the props for the provider component
interface DuckDBProviderProps {
  children: ReactNode;
}

// Connection pool for performance
class ConnectionPool {
  private connections: any[] = [];
  private maxSize = 3; // Max concurrent connections

  async getConnection(db: any): Promise<any> {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    return await db.connect();
  }

  async releaseConnection(connection: any): Promise<void> {
    if (this.connections.length < this.maxSize) {
      this.connections.push(connection);
    } else {
      await connection.close();
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.connections.map(conn => conn.close()));
    this.connections = [];
  }
}

// Create the provider component
export const DuckDBProvider: React.FC<DuckDBProviderProps> = ({ children }) => {
  const [db, setDb] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const connectionPoolRef = useRef<ConnectionPool | null>(null);

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
        
        // Initialize or load a file-backed database in the WASM VFS and tie it to OPFS
        try {
          const exists = await checkOPFSDatabaseExists();
          if (exists) {
            await (dbInstance as any).open({
              path: DB_FILE_NAME,
              accessMode: (duckdb as any).DuckDBAccessMode?.READ_WRITE,
            });
            console.log(`Opened DuckDB from OPFS file: ${DB_FILE_NAME}`);
          } else {
            await (dbInstance as any).open({
              path: DB_FILE_NAME,
              accessMode: (duckdb as any).DuckDBAccessMode?.READ_WRITE,
            });
            console.log(`Initialized new DuckDB file in VFS: ${DB_FILE_NAME}`);
          }
        } catch (err) {
          console.warn('Failed to initialize file-backed DB; falling back to default in-memory DB.', err);
        }
        
        // Initialize connection pool
        connectionPoolRef.current = new ConnectionPool();
        
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
        if (connectionPoolRef.current) {
          await connectionPoolRef.current.closeAll();
        }
        if (db) {
          await db.terminate();
        }
      };
      cleanup();
    };
  }, []); // Empty dependency array to run only once

  const value = { db, isLoading, error, connectionPool: connectionPoolRef.current };

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
