'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MemoryUsageBar } from './MemoryUsageBar';
import { TriangleIcon, BugIcon, RefreshIcon, FileIcon, FolderIcon, WarningIcon, SunIcon, MoonIcon } from './icons';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { 
  deleteDatabaseFromOPFS, 
  getDatabaseFileSize, 
  isOPFSSupported,
  forceCleanupOPFS,
  debugOPFS,
  resetApplicationData 
} from '@/lib/opfsUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  showMemoryBar: boolean;
  onMemoryBarToggle: () => void;
  deleteTablesCallback?: (() => Promise<void>) | null;
}

interface OPFSInfo {
  supported: boolean;
  fileSize: number | null;
  fileExists: boolean;
}

interface OPFSFile {
  name: string;
  size: number;
  type: 'file' | 'directory';
  lastModified?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeToggle,
  showMemoryBar,
  onMemoryBarToggle,
  deleteTablesCallback,
}) => {
  const { db } = useDuckDB();
  const [opfsInfo, setOpfsInfo] = useState<OPFSInfo>({
    supported: false,
    fileSize: null,
    fileExists: false,
  });
  const [savedQueries, setSavedQueries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [opfsFiles, setOpfsFiles] = useState<OPFSFile[]>([]);
  const [showOpfsBrowser, setShowOpfsBrowser] = useState(false);

  const loadOPFSFiles = useCallback(async () => {
    if (!isOPFSSupported()) {
      setOpfsFiles([]);
      return;
    }

    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const files: OPFSFile[] = [];

      // List all files in OPFS root
      for await (const [name, handle] of (opfsRoot as any).entries()) {
        try {
          if (handle.kind === 'file') {
            const file = await handle.getFile();
            files.push({
              name,
              size: file.size,
              type: 'file',
              lastModified: file.lastModified,
            });
          } else if (handle.kind === 'directory') {
            files.push({
              name,
              size: 0,
              type: 'directory',
            });
          }
        } catch (error) {
          console.warn(`Could not get info for ${name}:`, error);
          files.push({
            name,
            size: 0,
            type: 'file',
          });
        }
      }

      files.sort((a, b) => a.name.localeCompare(b.name));
      setOpfsFiles(files);
    } catch (error) {
      console.warn('Could not load OPFS files:', error);
      setOpfsFiles([]);
    }
  }, []);

  const loadOPFSInfo = useCallback(async () => {
    const supported = isOPFSSupported();
    const fileSize = await getDatabaseFileSize();
    setOpfsInfo({
      supported,
      fileSize,
      fileExists: fileSize !== null,
    });
    
    // Load OPFS files if supported
    if (supported) {
      await loadOPFSFiles();
    }
  }, [loadOPFSFiles]);

  const loadSavedQueries = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('homebench_query_') || key.startsWith('saved_query_')
      );
      setSavedQueries(keys);
    } catch (error) {
      console.warn('Could not load saved queries:', error);
      setSavedQueries([]);
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (isOpen) {
      loadOPFSInfo();
      loadSavedQueries();
    }
  }, [isOpen, loadOPFSInfo, loadSavedQueries]);

  const handleDeleteTables = async () => {
    if (!deleteTablesCallback) return;
    if (!confirm('Delete all saved tables? This action cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      await deleteTablesCallback();
      await loadOPFSInfo(); // Refresh OPFS info and files
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQueries = async () => {
    if (!confirm('Delete all saved queries? This action cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('homebench_query_') || key.startsWith('saved_query_')
      );
      keys.forEach(key => localStorage.removeItem(key));
      setSavedQueries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm('Delete ALL application data? This will remove:\n• All saved tables\n• All saved queries\n• All application settings\n• OPFS database files\n• IndexedDB data\n\nThis action cannot be undone!')) return;
    
    setIsLoading(true);
    try {
      await resetApplicationData();
      
      // Refresh state
      setSavedQueries([]);
      await loadOPFSInfo(); // This will refresh both OPFS info and files
      
      alert('All application data has been deleted. The page will now reload to ensure a clean state.');
      
      // Force a page reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error during data reset:', error);
      alert('There was an error during the reset. Please refresh the page manually.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Theme</span>
              <button
                onClick={onThemeToggle}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                {theme === 'dark' ? (
                  <>
                    <MoonIcon /> <span>Dark</span>
                  </>
                ) : (
                  <>
                    <SunIcon /> <span>Light</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Memory Bar Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Memory Bar</span>
                <button
                  onClick={onMemoryBarToggle}
                  className={`px-4 py-2 rounded transition-colors ${
                    showMemoryBar 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  {showMemoryBar ? 'On' : 'Off'}
                </button>
              </div>
              <div className="mt-2">
                <MemoryUsageBar />
              </div>
            </div>
          </div>

          {/* OPFS Storage Viewer */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Storage</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">OPFS Support:</span>
                <span className={`text-sm font-medium ${
                  opfsInfo.supported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {opfsInfo.supported ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Database File:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {opfsInfo.fileExists ? 'Exists' : 'Not Found'}
                </span>
              </div>
              {opfsInfo.fileSize !== null && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">File Size:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatBytes(opfsInfo.fileSize)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">OPFS Files:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {opfsFiles.length} files
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Saved Queries:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {savedQueries.length} stored
                </span>
              </div>
              
              {/* OPFS File Browser Toggle */}
              <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => setShowOpfsBrowser(!showOpfsBrowser)}
                  className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center"
                >
                  <TriangleIcon className={`mr-1 transition-transform duration-200 ${showOpfsBrowser ? 'rotate-90' : 'rotate-0'}`} />
                  {showOpfsBrowser ? 'Hide OPFS File Browser' : 'Show OPFS File Browser'}
                </button>
              </div>
            </div>

            {/* OPFS File Browser */}
            {showOpfsBrowser && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">OPFS Files</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        debugOPFS();
                        console.log('Check the console for detailed OPFS information');
                      }}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 inline-flex items-center space-x-1"
                    >
                      <BugIcon />
                      <span>Debug</span>
                    </button>
                    <button
                      onClick={loadOPFSFiles}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center"
                    >
                      <RefreshIcon className="mr-1" /> Refresh
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {opfsFiles.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No files found in OPFS
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {opfsFiles.map((file, index) => (
                        <div key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg text-gray-600 dark:text-gray-300">
                                {file.type === 'directory' ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                              </span>
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {file.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatBytes(file.size)}
                              </div>
                              {file.lastModified && (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(file.lastModified).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data Management */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Data Management</h3>
            <div className="space-y-3">
              <button
                onClick={handleDeleteTables}
                disabled={isLoading || !deleteTablesCallback}
                className="w-full text-left px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
              >
                <div className="font-medium">Delete All Saved Tables</div>
                <div className="text-sm opacity-75">Remove all tables from the database</div>
              </button>

              <button
                onClick={handleDeleteQueries}
                disabled={isLoading || savedQueries.length === 0}
                className="w-full text-left px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
              >
                <div className="font-medium">Delete All Saved Queries</div>
                <div className="text-sm opacity-75">Clear all saved SQL queries ({savedQueries.length})</div>
              </button>

              <button
                onClick={handleDeleteAllData}
                disabled={isLoading}
                className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 inline-flex items-start"
              >
                <div className="mt-0.5 mr-2"><WarningIcon /></div>
                <div>
                  <div className="font-medium">Delete All Application Data</div>
                  <div className="text-sm opacity-75">Completely reset HomeBench (requires page refresh)</div>
                </div>
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
