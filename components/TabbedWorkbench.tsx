'use client';

import React, { useState, useCallback } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { FileUploader } from './FileUploader';
import { DataPreview } from './DataPreview';
import { SQLEditor } from './SQLEditor';
import { ResultsGrid } from './ResultsGrid';
import { ExportButton } from './ExportButton';
import { SchemaExplorer } from './SchemaExplorer';
import { SavedQueries } from './SavedQueries';
import { PersistencePanel } from './PersistencePanel';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { MemoryUsageBar } from './MemoryUsageBar';
import { SettingsModal } from './SettingsModal';
import { Table as ArrowTable } from 'apache-arrow';
import { markTableAsUserCreated } from '@/lib/tableMetadataStore';
import { QueryOptimizer, PerformanceMonitor as PerfMonitorUtils } from '@/lib/performanceUtils';

type TabType = 'upload' | 'query';

export const TabbedWorkbench: React.FC = () => {
  const { db, isLoading, error: dbError } = useDuckDB();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [sql, setSql] = useState<string>('');
  const [results, setResults] = useState<ArrowTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [loadedTables, setLoadedTables] = useState<string[]>([]);
  const [schemaRefreshTrigger, setSchemaRefreshTrigger] = useState<number>(0);
  const [queryHints, setQueryHints] = useState<string[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<{duration: number; memory?: number} | null>(null);
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [saveQueryCallback, setSaveQueryCallback] = useState<(() => void) | null>(null);
  const [saveTablesCallback, setSaveTablesCallback] = useState<(() => Promise<void>) | null>(null);
  const [deleteTablesCallback, setDeleteTablesCallback] = useState<(() => Promise<void>) | null>(null);
  const [isSavingTables, setIsSavingTables] = useState(false);
  const [isDeletingTables, setIsDeletingTables] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('theme');
    return stored === 'dark' ? 'dark' : stored === 'light' ? 'light' : 'dark';
  });
  const [showMemoryBar, setShowMemoryBar] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('showMemoryBar');
    return stored === 'true';
  });

  // Stable handlers to receive child-provided callbacks without causing effect loops
  const handleSaveQueryCallbackChange = useCallback((cb: () => void) => {
    setSaveQueryCallback(() => cb);
  }, []);
  // Accept a void callback from child and adapt to Promise<void>
  const handleSaveTablesCallbackChange = useCallback((cb: () => void) => {
    setSaveTablesCallback(() => async () => {
      // Normalize any return type to a promise to simplify callers
      await Promise.resolve(cb());
    });
  }, []);
  const handleDeleteTablesCallbackChange = useCallback((cb: () => Promise<void>) => {
    setDeleteTablesCallback(() => cb);
  }, []);

  React.useEffect(() => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (!root) return;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  React.useEffect(() => {
    try { localStorage.setItem('showMemoryBar', String(showMemoryBar)); } catch {}
  }, [showMemoryBar]);

  const executeQuery = async () => {
    if (!db) return;
    
    setIsQuerying(true);
    setError(null);
    setResults(null);

    let connection = null;
    try {
      connection = await db.connect();
      
      // Analyze query for performance hints
      const analysis = QueryOptimizer.analyzeQuery(sql);
      setQueryHints(analysis.hints);
      
      // Optimize query if needed
      const optimizedSql = QueryOptimizer.optimizeQuery(sql, 1000);
      const wasOptimized = optimizedSql !== sql;
      
      // Execute query with performance monitoring
      const { result: queryResult, duration, memory } = await PerfMonitorUtils.measureQuery(
        () => connection!.query(optimizedSql),
        sql
      );
      
      setResults(queryResult as ArrowTable);
      setQueryMetrics({ duration, memory });
      
      if (wasOptimized) {
        console.log('Query automatically optimized with LIMIT for better performance');
      }
      
      // Check if the query was a DDL statement (CREATE, DROP, ALTER) that might affect schema
      const trimmedSql = sql.trim();
      const upperSql = trimmedSql.toUpperCase();
      if (upperSql.startsWith('CREATE') || upperSql.startsWith('DROP') || upperSql.startsWith('ALTER')) {
        // Trigger schema refresh
        setSchemaRefreshTrigger(prev => prev + 1);
        
        // If it's a CREATE TABLE statement, track it as user-created
        if (upperSql.startsWith('CREATE TABLE')) {
          // Extract table name from CREATE TABLE statement
          const createTableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|(\w+))/i);
          if (createTableMatch) {
            const tableName = createTableMatch[1] || createTableMatch[2];
            await markTableAsUserCreated(tableName);
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (connection) {
        await connection.close();
      }
      setIsQuerying(false);
    }
  };

  const handleFileUploaded = useCallback((fileName: string) => {
    setLoadedTables(prev => [...prev.filter(name => name !== fileName), fileName]);
    setPreviewTable(fileName);
    
    // Insert a helpful query if editor is empty
    if (!sql.trim()) {
      setSql(`-- Query your uploaded data\nSELECT * FROM "${fileName}" LIMIT 10;`);
    }
    
    // Trigger schema refresh when new file is uploaded
    setSchemaRefreshTrigger(prev => prev + 1);
    // Stay on upload tab after upload per preference
  }, [sql]);

  const insertTableName = useCallback((tableName: string) => {
    setSql(prev => prev + `"${tableName}"`);
  }, []);

  const insertColumnName = useCallback((tableName: string, columnName: string) => {
    setSql(prev => prev + `"${tableName}"."${columnName}"`);
  }, []);

  if (dbError) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Database Initialization Error
            </h2>
            <p className="text-red-600 dark:text-red-300">
              {dbError.message}
            </p>
            <p className="text-sm text-red-500 dark:text-red-400 mt-2">
              Please refresh the page to try again. Make sure your browser supports WebAssembly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing HomeBench</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Loading WebAssembly modules...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 relative">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">HomeBench</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Privacy-First SQL Workbench
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-3">
              {showMemoryBar && <MemoryUsageBar />}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Data Upload
              </button>
              <button
                onClick={() => setActiveTab('query')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'query'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Query Editor
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Upload Data</h3>
              <FileUploader onFileUploaded={handleFileUploaded} />
            </div>

            {/* Preview Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-96">
                <DataPreview tableName={previewTable} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'query' && (
          <div className={`grid gap-6 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-4'}`}>
            {/* Sidebar */}
            {!isSidebarCollapsed && (
              <div className="xl:col-span-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-end mb-4">
                    <button
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Collapse sidebar"
                    >
                      ◀
                    </button>
                  </div>
                  
                  <CollapsibleSidebar title="Schema" defaultExpanded={true}>
                    <SchemaExplorer 
                      onTableSelect={insertTableName}
                      onColumnSelect={insertColumnName}
                      refreshTrigger={schemaRefreshTrigger}
                    />
                  </CollapsibleSidebar>

                  <CollapsibleSidebar title="Saved Queries" defaultExpanded={true}>
                    <SavedQueries 
                      onQuerySelect={setSql} 
                      currentQuery={sql} 
                      onSaveCallbackChange={handleSaveQueryCallbackChange}
                    />
                  </CollapsibleSidebar>

                  <CollapsibleSidebar title="Session Storage" defaultExpanded={true}>
                    <PersistencePanel 
                      onTablesLoaded={() => setSchemaRefreshTrigger(prev => prev + 1)}
                      onSaveCallbackChange={handleSaveTablesCallbackChange}
                      onDeleteCallbackChange={handleDeleteTablesCallbackChange}
                    />
                  </CollapsibleSidebar>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className={isSidebarCollapsed ? 'col-span-1' : 'xl:col-span-3'}>
              <div className="space-y-6">
                {/* SQL Editor */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">SQL Editor</h3>
                      {isSidebarCollapsed && (
                        <button
                          onClick={() => setIsSidebarCollapsed(false)}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Expand sidebar"
                        >
                          ▶
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={async () => {
                          if (!saveTablesCallback || isSavingTables) return;
                          setIsSavingTables(true);
                          try {
                            await saveTablesCallback();
                          } finally {
                            setIsSavingTables(false);
                          }
                        }}
                        disabled={isSavingTables}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSavingTables ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </span>
                        ) : (
                          'Save Tables'
                        )}
                      </button>
                      <button
                        onClick={() => saveQueryCallback?.()}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Save Current
                      </button>
                      <button
                        onClick={executeQuery}
                        disabled={isQuerying || !db}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isQuerying ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running...
                          </span>
                        ) : (
                          'Run Query'
                        )}
                      </button>
                      <ExportButton 
                        query={sql} 
                        disabled={!results || isQuerying}
                      />
                    </div>
                  </div>
                  <SQLEditor value={sql} onChange={setSql} />
                </div>

                {/* Performance Hints */}
                {queryHints.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Performance Hints
                    </h4>
                    <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                      {queryHints.map((hint, index) => (
                        <li key={index}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Query Metrics */}
                {queryMetrics && (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Query executed in {queryMetrics.duration.toFixed(2)}ms
                      </span>
                      {queryMetrics.memory && (
                        <span className="text-gray-600 dark:text-gray-400">
                          Memory: {(queryMetrics.memory / 1024 / 1024).toFixed(2)}MB
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      Query Error
                    </h4>
                    <pre className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">
                      {error}
                    </pre>
                  </div>
                )}

                {/* Results Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Query Results</h3>
                  <ResultsGrid data={results!} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        showMemoryBar={showMemoryBar}
        onMemoryBarToggle={() => setShowMemoryBar(prev => !prev)}
        deleteTablesCallback={deleteTablesCallback}
      />
    </div>
  );
};
