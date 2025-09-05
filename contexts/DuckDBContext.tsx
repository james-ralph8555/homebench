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
  initializationStage: 'not_started' | 'loading' | 'ready' | 'error';
  isReady: boolean;
  lastCommitTime: Date | null;
  multiTabStatus?: {
    initialized: boolean;
    role?: 'leader' | 'client';
    isConnected?: boolean;
    activeConnections?: number;
    isReconnecting?: boolean;
    inflightQueryCount?: number;
    reconnectAttempts?: number;
    maxReconnectAttempts?: number;
  };
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
  const [isLoading, setIsLoading] = useState<boolean>(false); // Changed to false for non-blocking
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasWriteAccess, setHasWriteAccess] = useState<boolean>(true);
  const [initializationStage, setInitializationStage] = useState<'not_started' | 'loading' | 'ready' | 'error'>('not_started');
  const [multiTabStatus, setMultiTabStatus] = useState<DuckDBContextType['multiTabStatus']>({ initialized: false });
  const [lastCommitTime, setLastCommitTime] = useState<Date | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        setInitializationStage('loading');
        setIsLoading(true); // Still set for backward compatibility
        setError(null);

        // Get database state from multi-tab aware manager
        const { DuckDBManager } = await import('@/lib/duckdbManager');
        const manager = DuckDBManager.getInstance();
        const dbState = await manager.getDatabaseState();
        
        // Get multi-tab status
        const tabStatus = await manager.getMultiTabStatus();
        
        // Check if database is using OPFS (persistent) or fell back to in-memory
        const hasWrite = dbState.isOpfsSupported;
        
        if (tabStatus.initialized) {
          if ((tabStatus as any).role === 'leader') {
            console.log('✓ Database initialized as LEADER with OPFS persistence');
          } else {
            console.log('✓ Database initialized as CLIENT - connected to leader');
          }
        } else {
          console.log('✓ Database initialized in legacy mode');
        }
        
        // Register saving callback with durableOperations
        const { registerWriteCallbacks, checkDatabaseRecovery } = await import('@/lib/durableOperations');
        registerWriteCallbacks({
          onSavingChange: setSaving,
          onCommitSuccess: (timestamp: Date) => {
            if (isMountedRef.current) {
              setLastCommitTime(timestamp);
            }
          },
          onRecoveryNotification: (message: string, type: 'info' | 'warning') => {
            // Show toast notification for recovery
            const { toast } = require('@/hooks/use-toast');
            toast({
              title: type === 'info' ? 'Database restored' : 'Recovery notice',
              description: message,
              variant: type === 'warning' ? 'destructive' : 'default',
            });
          }
        });
        
        // Check for database recovery after initialization
        // Delay slightly to ensure database is fully ready
        setTimeout(() => {
          checkDatabaseRecovery().catch(console.warn);
        }, 1000);
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setDb(dbState.db);
          setHasWriteAccess(hasWrite);
          setMultiTabStatus(tabStatus as any);
          setIsLoading(false);
          setInitializationStage('ready');
          console.log('✓ Database context initialized');
        }
      } catch (e: any) {
        console.error("Failed to initialize DuckDB:", e);
        if (isMountedRef.current) {
          setError(e);
          setIsLoading(false);
          setInitializationStage('error');
        }
      }
    };

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initializeDB();
    }

    return () => {
      isMountedRef.current = false;
      if (statusUpdateTimerRef.current) {
        clearInterval(statusUpdateTimerRef.current);
        statusUpdateTimerRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  // Poll multi-tab status for real-time updates
  useEffect(() => {
    if (!multiTabStatus?.initialized) return;

    const updateStatus = async () => {
      try {
        const { DuckDBManager } = await import('@/lib/duckdbManager');
        const manager = DuckDBManager.getInstance();
        const tabStatus = await manager.getMultiTabStatus();
        
        if (isMountedRef.current) {
          setMultiTabStatus(tabStatus as any);
        }
      } catch (error) {
        console.warn('Failed to update multi-tab status:', error);
      }
    };

    // Update immediately
    updateStatus();

    // Then poll every 2 seconds for status updates
    statusUpdateTimerRef.current = setInterval(updateStatus, 2000);

    return () => {
      if (statusUpdateTimerRef.current) {
        clearInterval(statusUpdateTimerRef.current);
        statusUpdateTimerRef.current = null;
      }
    };
  }, [multiTabStatus?.initialized]);


  const setSaving = (saving: boolean) => {
    if (isMountedRef.current) {
      setIsSaving(saving);
    }
  };

  // Computed property to determine if the database is ready for use
  const isReady = initializationStage === 'ready' && db !== null;

  const value = { 
    db, 
    isLoading, 
    error, 
    isSaving, 
    setSaving, 
    hasWriteAccess, 
    initializationStage,
    isReady,
    lastCommitTime,
    multiTabStatus 
  };

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
