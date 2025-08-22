'use client';

import { useState, useCallback } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import {
  loadSession as loadSessionImpl,
  checkSessionExists as checkSessionExistsImpl,
  deleteSession as deleteSessionImpl,
  getSessionSize as getSessionSizeImpl,
} from '@/lib/persistence';
import { isOpfsSupported } from '@/lib/duckdbManager';

export const usePersistence = () => {
  const { db } = useDuckDB();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);


  const loadSession = useCallback(async () => {
    if (!db) {
      throw new Error('Database not available');
    }

    setIsLoading(true);
    try {
      await loadSessionImpl(db);
      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const deleteSession = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteSessionImpl();
      setLastSaved(null);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const checkSessionExists = useCallback(async () => {
    return await checkSessionExistsImpl(db);
  }, [db]);

  const getSessionSize = useCallback(async () => {
    return await getSessionSizeImpl();
  }, []);

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return 'Unknown';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    loadSession,
    deleteSession,
    checkSessionExists,
    getSessionSize,
    formatFileSize,
    isDeleting,
    isLoading,
    lastSaved,
    isSupported: isOpfsSupported(),
  };
};

