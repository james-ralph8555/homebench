'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MemoryUsageBar } from './MemoryUsageBar';
import { TriangleIcon, BugIcon, RefreshIcon, FileIcon, FolderIcon, WarningIcon, SunIcon, MoonIcon } from './icons';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { getDatabaseFileSize, wipeOpfsData, downloadSavedSessionAsDuckDB } from '@/lib/opfsUtils';
import { isOpfsSupported } from '@/lib/duckdbManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  showMemoryBar: boolean;
  onMemoryBarToggle: () => void;
  useWebGL: boolean;
  onWebGLToggle: () => void;
  chartRowLimit: number;
  onChartRowLimitChange: (limit: number) => void;
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
  useWebGL,
  onWebGLToggle,
  chartRowLimit,
  onChartRowLimitChange,
}) => {
  const { db, multiTabStatus } = useDuckDB();
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
    if (!isOpfsSupported()) {
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
    const supported = isOpfsSupported();
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

  const handleWipeOpfs = async () => {
    // Check if this is a client tab - only leader can wipe OPFS data
    if (multiTabStatus?.role === 'client') {
      alert('Database management must be done from the original tab that has the database. Please switch to that tab to manage data.');
      return;
    }
    
    if (!confirm('Wipe all OPFS data? This will delete the entire database and cannot be undone. The page will reload after wiping.')) return;
    
    setIsLoading(true);
    try {
      await wipeOpfsData();
      await loadOPFSInfo(); // Refresh OPFS info and files
      // Reload the page to reinitialize with clean OPFS
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to wipe OPFS: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSession = async () => {
    // Check if this is a client tab - only leader can download session
    if (multiTabStatus?.role === 'client') {
      alert('Session download must be done from the original tab that has the database. Please switch to that tab to download the session.');
      return;
    }
    
    try {
      setIsLoading(true);
      await downloadSavedSessionAsDuckDB();
    } catch (error: any) {
      alert(`Failed to download session: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteAllData = async () => {
    // Check if this is a client tab - only leader can delete all data
    if (multiTabStatus?.role === 'client') {
      alert('Data deletion must be done from the original tab that has the database. Please switch to that tab to delete all data.');
      return;
    }
    
    if (!confirm('Delete ALL application data including database, saved queries, and settings? This cannot be undone and will reload the page.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. Wipe OPFS data (database)
      try {
        await wipeOpfsData();
        console.log('✓ OPFS data wiped');
      } catch (error) {
        console.warn('Failed to wipe OPFS:', error);
      }
      
      // 2. Clear all localStorage (saved queries, preferences)
      try {
        localStorage.clear();
        console.log('✓ LocalStorage cleared');
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
      
      // 3. Clear sessionStorage
      try {
        sessionStorage.clear();
        console.log('✓ SessionStorage cleared');
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
      
      // 4. Clear IndexedDB (if any)
      try {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              const deleteReq = indexedDB.deleteDatabase(db.name);
              return new Promise<void>((resolve, reject) => {
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            }
          })
        );
        console.log('✓ IndexedDB databases cleared');
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
      
      console.log('✓ All application data deleted successfully');
      
      // Reload the page to reinitialize everything
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to delete all data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Theme</span>
              <Button onClick={onThemeToggle} className="inline-flex items-center space-x-2">
                {theme === 'dark' ? (
                  <>
                    <MoonIcon /> <span>Dark</span>
                  </>
                ) : (
                  <>
                    <SunIcon /> <span>Light</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Memory Bar Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Memory Bar</span>
                <Button onClick={onMemoryBarToggle} variant={showMemoryBar ? 'default' : 'secondary'}>
                  {showMemoryBar ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Use WebGL for Charts</span>
                <Button onClick={onWebGLToggle} variant={useWebGL ? 'default' : 'secondary'}>
                  {useWebGL ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Chart Row Limit</span>
                <input
                  type="number"
                  value={chartRowLimit}
                  onChange={(e) => onChartRowLimitChange(parseInt(e.target.value, 10))}
                  className="w-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-right"
                />
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
                <Button variant="link" className="w-full justify-start text-sm inline-flex items-center px-0"
                  onClick={() => setShowOpfsBrowser(!showOpfsBrowser)}
                >
                  <TriangleIcon className={`mr-1 transition-transform duration-200 ${showOpfsBrowser ? 'rotate-90' : 'rotate-0'}`} />
                  {showOpfsBrowser ? 'Hide OPFS File Browser' : 'Show OPFS File Browser'}
                </Button>
              </div>
            </div>

            {/* OPFS File Browser */}
            {showOpfsBrowser && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">OPFS Files</h4>
                  <div className="flex space-x-2">
                    <Button variant="link" className="text-sm px-0 inline-flex items-center" onClick={loadOPFSFiles}>
                      <RefreshIcon className="mr-1" /> Refresh
                    </Button>
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
              <Button
                onClick={handleDownloadSession}
                disabled={isLoading || !opfsInfo.fileExists || multiTabStatus?.role === 'client'}
                variant="secondary"
                className="w-full justify-start h-auto whitespace-normal break-words text-left px-4 py-6"
              >
                <div className="font-medium">Download Session Database</div>
                <div className="text-sm opacity-75">
                  {multiTabStatus?.role === 'client' 
                    ? 'Only available from the original database tab' 
                    : 'Export the complete .duckdb file'
                  }
                </div>
              </Button>

              <Button
                onClick={handleWipeOpfs}
                disabled={isLoading || !opfsInfo.supported || multiTabStatus?.role === 'client'}
                variant="destructive"
                className="w-full justify-start h-auto whitespace-normal break-words text-left px-4 py-6 inline-flex items-start"
              >
                <div className="mt-0.5 mr-2"><WarningIcon /></div>
                <div>
                  <div className="font-medium">Wipe OPFS Data</div>
                  <div className="text-sm opacity-75">
                    {multiTabStatus?.role === 'client' 
                      ? 'Only available from the original database tab' 
                      : 'Delete all database files from browser storage'
                    }
                  </div>
                </div>
              </Button>


              <Button
                onClick={handleDeleteAllData}
                disabled={isLoading || multiTabStatus?.role === 'client'}
                variant="destructive"
                className="w-full justify-start h-auto whitespace-normal break-words text-left px-4 py-6 inline-flex items-start"
              >
                <div className="mt-0.5 mr-2"><WarningIcon /></div>
                <div>
                  <div className="font-medium">Delete All Application Data</div>
                  <div className="text-sm opacity-75">
                    {multiTabStatus?.role === 'client' 
                      ? 'Only available from the original database tab' 
                      : 'Completely reset HomeBench (requires page refresh)'
                    }
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Processing...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
