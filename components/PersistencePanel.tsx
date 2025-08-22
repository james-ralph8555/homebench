'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePersistence } from '@/hooks/usePersistence';
import { downloadSavedSessionAsDuckDB } from '@/lib/opfsUtils';

interface PersistencePanelProps {
  onTablesLoaded?: () => void;
  onSaveCallbackChange?: (callback: () => void) => void;
  onDeleteCallbackChange?: (callback: () => Promise<void>) => void;
}

export const PersistencePanel: React.FC<PersistencePanelProps> = ({ onTablesLoaded, onSaveCallbackChange, onDeleteCallbackChange }) => {
  const {
    saveSession,
    loadSession,
    deleteSession,
    checkSessionExists,
    getSessionSize,
    formatFileSize,
    isSaving,
    isDeleting,
    isLoading,
    lastSaved,
    isSupported,
  } = usePersistence();

  const [sessionExists, setSessionExists] = useState(false);
  const [sessionSize, setSessionSize] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [autoLoaded, setAutoLoaded] = useState(false);

  useEffect(() => {
    const checkAndLoadSession = async () => {
      const exists = await checkSessionExists();
      setSessionExists(exists);
      
      if (exists) {
        const size = await getSessionSize();
        setSessionSize(size);
        
        // Auto-load session on first visit if it exists
        if (!autoLoaded && isSupported) {
          try {
            await loadSession();
            setAutoLoaded(true);
            setMessage('Restored your saved session from previous visit');
            setTimeout(() => setMessage(''), 5000);
            onTablesLoaded?.(); // Refresh schema
          } catch (error: any) {
            console.warn('Failed to auto-load session:', error);
          }
        }
      }
    };
    
    checkAndLoadSession();
  }, [checkSessionExists, getSessionSize, lastSaved, loadSession, autoLoaded, isSupported, onTablesLoaded]);

  const handleSave = useCallback(async () => {
    try {
      await saveSession();
      setMessage('Session saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`Failed to save: ${error.message}`);
    }
  }, [saveSession]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete your saved session? This cannot be undone.')) {
      return;
    }

    try {
      await deleteSession();
      setSessionExists(false);
      setSessionSize(null);
      setMessage('Saved session deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`Failed to delete: ${error.message}`);
    }
  }, [deleteSession]);

  useEffect(() => {
    // Provide the save callback to the parent
    const saveCallback = () => handleSave();
    onSaveCallbackChange?.(saveCallback);
    // Provide delete callback to parent for settings menu
    const deleteCallback = async () => { await handleDelete(); };
    onDeleteCallbackChange?.(deleteCallback);
  }, [onSaveCallbackChange, onDeleteCallbackChange, handleSave, handleDelete]);

  const handleLoad = async () => {
    try {
      // Re-check existence at click time to avoid stale state
      const existsNow = await checkSessionExists();
      setSessionExists(existsNow);
      if (!existsNow) {
        setMessage('No saved session found.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      await loadSession();
      setMessage('Session loaded successfully!');
      setTimeout(() => setMessage(''), 3000);
      onTablesLoaded?.(); // Refresh schema
    } catch (error: any) {
      setMessage(`Failed to load: ${error.message}`);
    }
  };

  // handleDelete moved above and memoized

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Session Persistence Unavailable
        </h4>
        <p className="text-sm text-yellow-600 dark:text-yellow-300">
          Your browser doesn&apos;t support the Origin Private File System (OPFS). 
          Sessions cannot be saved between browser visits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        
        {sessionExists && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
            <p className="text-sm text-green-700 dark:text-green-300">
              Saved session found ({formatFileSize(sessionSize)})
            </p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading Session...
              </span>
            ) : (
              'Load Saved Session'
            )}
          </button>
          <button
            onClick={async () => {
              try {
                const existsNow = await checkSessionExists();
                if (!existsNow) {
                  setMessage('No saved session to download.');
                  setTimeout(() => setMessage(''), 3000);
                  return;
                }
                await downloadSavedSessionAsDuckDB();
              } catch (error: any) {
                setMessage(`Download failed: ${error.message}`);
              }
            }}
            disabled={isLoading || !sessionExists}
            title="Download saved session as DuckDB database"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download Session (.duckdb)
          </button>
        </div>

        {lastSaved && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Last saved: {lastSaved.toLocaleString()}
          </p>
        )}

        {message && (
          <div className="mt-3 p-2 rounded text-sm bg-gray-100 dark:bg-gray-800">
            {message}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p className="mb-1">Database persists automatically in your browser (OPFS).</p>
        <p className="mb-1">Use Load to restore, or Download to export the .duckdb file.</p>
        <p>Your data never leaves your device.</p>
      </div>
    </div>
  );
};
