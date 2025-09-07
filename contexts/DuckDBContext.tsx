'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getDuckDB } from '@/lib/duckdbManager';
import * as duckdb from '@duckdb/duckdb-wasm';
import type { 
  InitializationStage, 
  LoadingProgress, 
  MultiTabStatus, 
  ProgressCallback
} from '@/lib/types';
import { toErrorMessage } from '@/lib/utils';

// Define the shape of the context state
interface DuckDBContextType {
  db: duckdb.AsyncDuckDB | null;
  isLoading: boolean;
  error: Error | null;
  isSaving: boolean;
  setSaving: (saving: boolean) => void;
  isTyping: boolean;
  setTyping: (typing: boolean) => void;
  hasWriteAccess: boolean;
  initializationStage: InitializationStage;
  loadingProgress: LoadingProgress | null;
  isReady: boolean;
  lastCommitTime: Date | null;
  multiTabStatus?: MultiTabStatus;
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
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [hasWriteAccess, setHasWriteAccess] = useState<boolean>(true);
  const [initializationStage, setInitializationStage] = useState<InitializationStage>('not_started');
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [multiTabStatus, setMultiTabStatus] = useState<MultiTabStatus>({ initialized: false });
  const [lastCommitTime, setLastCommitTime] = useState<Date | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        setInitializationStage('loading');
        setIsLoading(true); // Still set for backward compatibility
        setError(null);
        setLoadingProgress({ stage: 'downloading', message: 'Downloading DuckDB engine...', progress: 0 });

        // Get database state from multi-tab aware manager with progress tracking
        const { DuckDBManager } = await import('@/lib/duckdbManager');
        const manager = DuckDBManager.getInstance();
        
        // Set up progress callback
        const updateProgress: ProgressCallback = (progressInfo: LoadingProgress) => {
          if (isMountedRef.current) {
            setLoadingProgress(progressInfo);
          }
        };
        
        updateProgress({ stage: 'compiling', message: 'Compiling WebAssembly module...', progress: 30 });
        const dbState = await manager.getDatabaseState();
        
        updateProgress({ stage: 'instantiating', message: 'Initializing database instance...', progress: 60 });
        
        // Get multi-tab status
        const tabStatus = await manager.getMultiTabStatus();
        
        updateProgress({ stage: 'connecting', message: 'Establishing database connection...', progress: 80 });
        
        // Check if database is using OPFS (persistent) or fell back to in-memory
        const hasWrite = dbState.isOpfsSupported;
        
        // Initialization succeeded; role and mode available in tabStatus
        
        // Register saving callback with durableOperations
        const { registerWriteCallbacks, checkDatabaseRecovery } = await import('@/lib/durableOperations');
        registerWriteCallbacks({
          onSavingChange: setSaving,
          onCommitSuccess: (timestamp: Date) => {
            if (isMountedRef.current) {
              setLastCommitTime(timestamp);
            }
          },
          onRecoveryNotification: (_message: string) => {
            // Suppress console output for recovery notifications
          }
        });
        
        // Check for database recovery after initialization
        // Delay slightly to ensure database is fully ready
        setTimeout(() => {
          checkDatabaseRecovery().catch(() => {});
        }, 1000);
        
        updateProgress({ stage: 'complete', message: 'Database ready!', progress: 100 });
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setDb(dbState.db);
          setHasWriteAccess(hasWrite);
          setMultiTabStatus(tabStatus as MultiTabStatus);
          setIsLoading(false);
          setInitializationStage('ready');
          setLoadingProgress(null); // Clear progress when ready
          // Database context initialized
        }
      } catch (e: unknown) {
        // Suppress console error; surface via context state only
        if (isMountedRef.current) {
          const error = e instanceof Error ? e : new Error(toErrorMessage(e));
          setError(error);
          setIsLoading(false);
          setInitializationStage('error');
          setLoadingProgress(null);
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
          setMultiTabStatus(tabStatus as MultiTabStatus);
        }
      } catch (error) {
        // Suppress status update errors in console
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

  const setTyping = (typing: boolean) => {
    if (isMountedRef.current) {
      setIsTyping(typing);
    }
  };

  // Computed property to determine if the database is ready for use
  // Leader tabs have a direct DB handle (db !== null). Client tabs do not,
  // but are considered ready when connected to the leader via multi‑tab.
  const isReady =
    initializationStage === 'ready' && (db !== null || !!multiTabStatus?.isConnected);

  const value = { 
    db, 
    isLoading, 
    error, 
    isSaving, 
    setSaving, 
    isTyping,
    setTyping,
    hasWriteAccess, 
    initializationStage,
    loadingProgress,
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
