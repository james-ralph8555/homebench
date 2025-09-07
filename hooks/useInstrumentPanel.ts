'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { getDatabaseFileSize } from '@/lib/opfsUtils';
import { forceConnectionRecovery, performConnectionDiagnostics } from '@/lib/durableOperations';
import { logger } from '@/lib/logger';

export interface InstrumentPanelState {
  // Database info
  databaseName: string;
  databaseSize: number | null;
  databaseLocation: 'OPFS' | 'Memory' | 'Unknown';
  
  // OPFS status
  opfsStatus: 'mounted' | 'read-only' | 'error' | 'unavailable';
  opfsStatusText: string;
  
  // Write access and multi-tab
  canWrite: boolean;
  isCurrentTabOwner: boolean;
  lockOwner: 'this-tab' | 'other-tab' | 'unknown';
  
  // Saving state
  isSaving: boolean;
  isTyping?: boolean;
  lastCommitTime: Date | null;
  
  // Actions
  requestLock: () => Promise<void>;
  performDiagnostics: () => Promise<void>;
}

export function useInstrumentPanel(): InstrumentPanelState {
  const { 
    db, 
    hasWriteAccess, 
    isSaving, 
    isTyping,
    multiTabStatus,
    isReady,
    lastCommitTime
  } = useDuckDB();
  
  const [databaseSize, setDatabaseSize] = useState<number | null>(null);
  const [isRequestingLock, setIsRequestingLock] = useState(false);

  // Update database size periodically
  useEffect(() => {
    if (!isReady) return;

    const updateDatabaseSize = async () => {
      try {
        const size = await getDatabaseFileSize();
        setDatabaseSize(size);
      } catch (error) {
        logger.warn('Failed to get database size:', error);
        setDatabaseSize(null);
      }
    };

    // Update immediately
    updateDatabaseSize();

    // Then update every 5 seconds
    const interval = setInterval(updateDatabaseSize, 5000);

    return () => clearInterval(interval);
  }, [isReady]);


  // Determine OPFS status
  const getOpfsStatus = useCallback(() => {
    if (!hasWriteAccess && multiTabStatus?.role === 'client') {
      return {
        status: 'read-only' as const,
        text: 'Read-only (other tab controls database)'
      };
    }
    
    if (hasWriteAccess && multiTabStatus?.role === 'leader') {
      return {
        status: 'mounted' as const,
        text: 'Mounted with write access'
      };
    }
    
    if (hasWriteAccess && !multiTabStatus?.initialized) {
      return {
        status: 'mounted' as const,
        text: 'Mounted (legacy mode)'
      };
    }
    
    if (!hasWriteAccess) {
      return {
        status: 'error' as const,
        text: 'Error: No write access'
      };
    }
    
    return {
      status: 'unavailable' as const,
      text: 'Status unknown'
    };
  }, [hasWriteAccess, multiTabStatus]);

  // Determine database location
  const getDatabaseLocation = useCallback(() => {
    if (hasWriteAccess) {
      return 'OPFS';
    }
    if (multiTabStatus?.role === 'client') {
      return 'OPFS'; // Client connected to leader's OPFS database
    }
    return 'Memory';
  }, [hasWriteAccess, multiTabStatus]);

  // Determine lock ownership
  const getLockOwner = useCallback(() => {
    if (multiTabStatus?.role === 'leader') {
      return 'this-tab';
    }
    if (multiTabStatus?.role === 'client') {
      return 'other-tab';
    }
    return 'unknown';
  }, [multiTabStatus]);

  // Request lock from another tab
  const requestLock = useCallback(async () => {
    if (isRequestingLock) return;
    
    setIsRequestingLock(true);
    try {
      logger.debug('Requesting database lock...');
      const success = await forceConnectionRecovery('User requested database control');
      
      if (success) {
        logger.info('Successfully recovered database control');
        // The context will update automatically through polling
      } else {
        logger.warn('Failed to recover database control');
      }
    } catch (error) {
      logger.error('Error requesting database lock:', error);
    } finally {
      setIsRequestingLock(false);
    }
  }, [isRequestingLock]);

  // Perform diagnostics
  const performDiagnosticsAction = useCallback(async () => {
    try {
      const diagnostics = await performConnectionDiagnostics();
      logger.debug('Database diagnostics:', diagnostics);
    } catch (error) {
      logger.error('Failed to perform diagnostics:', error);
    }
  }, []);

  const opfsInfo = getOpfsStatus();
  
  return {
    // Database info
    databaseName: 'homebench.db',
    databaseSize,
    databaseLocation: getDatabaseLocation(),
    
    // OPFS status
    opfsStatus: opfsInfo.status,
    opfsStatusText: opfsInfo.text,
    
    // Write access and multi-tab
    canWrite: hasWriteAccess,
    isCurrentTabOwner: multiTabStatus?.role === 'leader',
    lockOwner: getLockOwner(),
    
    // Saving state
    isSaving: isSaving || isRequestingLock,
    isTyping,
    lastCommitTime,
    
    // Actions
    requestLock,
    performDiagnostics: performDiagnosticsAction,
  };
}
