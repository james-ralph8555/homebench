'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getDuckDB } from '@/lib/duckdbManager';
import * as duckdb from '@duckdb/duckdb-wasm';

// Define the shape of the context state
interface DuckDBContextType {
  db: duckdb.AsyncDuckDB | null;
  isLoading: boolean;
  error: Error | null;
  isSaving: boolean;
  setSaving: (saving: boolean) => void;
  hasWriteAccess: boolean;
}

// Create the context with a default undefined value
const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

// Define the props for the provider component
interface DuckDBProviderProps {
  children: ReactNode;
}

// Create the provider component with proper lifecycle management
export const DuckDBProvider: React.FC<DuckDBProviderProps> = ({ children }) => {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasWriteAccess, setHasWriteAccess] = useState<boolean>(true);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get database state from singleton manager
        const { DuckDBManager } = await import('@/lib/duckdbManager');
        const manager = DuckDBManager.getInstance();
        const dbState = await manager.getDatabaseState();
        const dbInstance = dbState.db!;
        
        // Check if database is using OPFS (persistent) or fell back to in-memory
        const hasWrite = dbState.isOpfsSupported;
        if (hasWrite) {
          console.log('✓ Database using OPFS - changes will be saved');
        } else {
          console.warn('Database fell back to in-memory - changes will NOT be saved (multiple tabs detected)');
        }
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setDb(dbInstance);
          setHasWriteAccess(hasWrite);
          setIsLoading(false);
          console.log('✓ Database initialized');
        }
      } catch (e: any) {
        console.error("Failed to initialize DuckDB:", e);
        if (isMountedRef.current) {
          setError(e);
          setIsLoading(false);
        }
      }
    };

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initializeDB();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array to run only once


  const setSaving = (saving: boolean) => {
    if (isMountedRef.current) {
      setIsSaving(saving);
    }
  };

  const value = { db, isLoading, error, isSaving, setSaving, hasWriteAccess };

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
