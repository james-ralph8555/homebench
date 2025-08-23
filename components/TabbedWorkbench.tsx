'use client';

import React, { useState, useCallback, Suspense } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { MemoryUsageBar } from './MemoryUsageBar';
import { GearIcon, TriangleIcon, InfoIcon } from './icons';
import { Table as ArrowTable } from 'apache-arrow';
import { markTableAsUserCreated } from '@/lib/tableMetadataStore';
import { executeDurableWrite, executeReadQuery } from '@/lib/durableOperations';
import { addQueryToHistory } from '@/lib/queryStore';
import { usePersistence } from '@/hooks/usePersistence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';

// Dynamic imports for heavy components - loaded only when needed
const FileUploader = dynamic(() => import('./FileUploader').then(mod => ({ default: mod.FileUploader })), {
  loading: () => <div className="animate-pulse stable-skeleton-uploader" />
});

const DataPreview = dynamic(() => import('./DataPreview').then(mod => ({ default: mod.DataPreview })), {
  loading: () => <div className="animate-pulse stable-skeleton-preview" />
});

const TabbedSQLEditor = dynamic(() => import('./TabbedSQLEditor').then(mod => ({ default: mod.TabbedSQLEditor })), {
  loading: () => <div className="animate-pulse stable-skeleton-editor" />
});

const ResultsGrid = dynamic(() => import('./ResultsGrid').then(mod => ({ default: mod.ResultsGrid })), {
  loading: () => <div className="animate-pulse stable-skeleton-results" />
});

const ExportButton = dynamic(() => import('./ExportButton').then(mod => ({ default: mod.ExportButton })), {
  loading: () => <div className="animate-pulse stable-skeleton-export" />
});

const SchemaExplorer = dynamic(() => import('./SchemaExplorer').then(mod => ({ default: mod.SchemaExplorer })), {
  loading: () => <div className="animate-pulse stable-skeleton-sidebar" />
});

const SavedQueries = dynamic(() => import('./SavedQueries').then(mod => ({ default: mod.SavedQueries })), {
  loading: () => <div className="animate-pulse stable-skeleton-sidebar" />
});

const RecentQueries = dynamic(() => import('./RecentQueries').then(mod => ({ default: mod.RecentQueries })), {
  loading: () => <div className="animate-pulse stable-skeleton-sidebar" />
});

const SettingsModal = dynamic(() => import('./SettingsModal').then(mod => ({ default: mod.SettingsModal })), {
  ssr: false,
  loading: () => null
});

const Visualization = dynamic(() => import('./Visualization').then(mod => ({ default: mod.Visualization })), {
  loading: () => <div className="animate-pulse stable-skeleton-visualization" />
});

type TabType = 'upload' | 'query' | 'visualization';

export const TabbedWorkbench: React.FC = () => {
  const { db, isLoading, error: dbError, isSaving, hasWriteAccess, multiTabStatus } = useDuckDB();
  const { loadSession, checkSessionExists, isSupported } = usePersistence();
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
  const [showSettings, setShowSettings] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [autoLoaded, setAutoLoaded] = useState(false);
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
  const [useWebGL, setUseWebGL] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('useWebGL');
    return stored === 'true';
  });
  const [chartRowLimit, setChartRowLimit] = useState<number>(() => {
    if (typeof window === 'undefined') return 10000;
    const stored = localStorage.getItem('chartRowLimit');
    return stored ? parseInt(stored, 10) : 10000;
  });
  const [resultsViewMode, setResultsViewMode] = useState<'grid' | 'chart'>('grid');

  // Stable handlers to receive child-provided callbacks without causing effect loops
  const handleSaveQueryCallbackChange = useCallback((cb: () => void) => {
    setSaveQueryCallback(() => cb);
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

  React.useEffect(() => {
    try { localStorage.setItem('useWebGL', String(useWebGL)); } catch {}
  }, [useWebGL]);

  React.useEffect(() => {
    try { localStorage.setItem('chartRowLimit', String(chartRowLimit)); } catch {}
  }, [chartRowLimit]);

  // Auto-load session on component mount
  React.useEffect(() => {
    const checkAndLoadSession = async () => {
      if ((!db && !multiTabStatus?.initialized) || !isSupported || autoLoaded) return;
      
      try {
        const exists = await checkSessionExists();
        if (exists) {
          await loadSession();
          setAutoLoaded(true);
          setRestoreMessage('Restored your saved session from previous visit');
          setSchemaRefreshTrigger(prev => prev + 1); // Refresh schema
          setTimeout(() => setRestoreMessage(''), 5000);
        }
      } catch (error: any) {
        console.warn('Failed to auto-load session:', error);
      }
    };

    checkAndLoadSession();
  }, [db, multiTabStatus?.initialized, isSupported, autoLoaded, checkSessionExists, loadSession]);

  const executeQuery = async () => {
    // Check if database is available (direct db for leaders, multi-tab for clients)
    if (!db && !multiTabStatus?.initialized) return;
    
    setIsQuerying(true);
    setError(null);
    setResults(null);

    try {
      const startTime = performance.now();
      
      // Simple query execution - fail fast
      const trimmedSql = sql.trim();
      const upperSql = trimmedSql.toUpperCase();
      const isWriteOperation = upperSql.startsWith('INSERT') || upperSql.startsWith('UPDATE') || 
                              upperSql.startsWith('DELETE') || upperSql.startsWith('CREATE') || 
                              upperSql.startsWith('DROP') || upperSql.startsWith('ALTER');

      if (isWriteOperation) {
        // Write operation - use durable write
        const result = await executeDurableWrite(sql);
        const duration = performance.now() - startTime;
        setQueryMetrics({ duration });
        
        // Trigger schema refresh for DDL operations
        if (upperSql.startsWith('CREATE') || upperSql.startsWith('DROP') || upperSql.startsWith('ALTER')) {
          setSchemaRefreshTrigger(prev => prev + 1);
        }
      } else {
        // Read operation
        const result = await executeReadQuery(sql);
        const duration = performance.now() - startTime;
        setResults(result as ArrowTable);
        setQueryMetrics({ duration });
      }
      
      // Add successful query to history
      try {
        await addQueryToHistory(trimmedSql);
      } catch (historyError) {
        console.warn('Failed to add query to history:', historyError);
      }
    } catch (e: any) {
      console.error('Query execution failed:', e);
      setError(e.message);
    } finally {
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
          <div className="space-y-2">
            {/* Top row: logo + title on left, controls on right (stays a row on mobile) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image 
                  src="/logo.webp" 
                  alt="HomeBench logo" 
                  width={64} 
                  height={64} 
                  className="rounded aspect-logo" 
                  priority
                  placeholder="blur"
                  blurDataURL="data:image/webp;base64,UklGRjoAAABXRUJQVlA4WAoAAAAQAAAADwAABwAAQUxQSDIAAAARL0AmbZurmr57yyIiqE8oiG0bejIYEQTgqiDA9vqnsUSI6H+oAERp2HZ65qP/VIAWAFZQOCBCAAAA8AEAnQEqEAAIAAVAfCWkAALp8sF8rgRgAP7o9FDvMCkMde9PK7euH5M1m6VWoDXf2FkP3BqV0ZYbO6NA/VFIAAAA"
                />
                <h1 className="text-2xl sm:text-3xl font-bold">HomeBench</h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="stable-container">
                  {showMemoryBar && <MemoryUsageBar />}
                </div>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="ghost"
                  className="p-3"
                  title="Settings"
                  aria-label="Open settings"
                >
                  <GearIcon size={30} className="w-7 h-7 sm:w-8 sm:h-8" />
                </Button>
              </div>
            </div>
            {/* Tagline under the row on all sizes */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>Privacy-by-Design SQL Workbench</span>
              <div className="relative group">
                <InfoIcon 
                  size={14} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" 
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  HomeBench processes all your data locally in your browser. Nothing is ever sent to our servers.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <div className="mb-6">
            <TabsList>
              <TabsTrigger value="upload">Data Upload</TabsTrigger>
              <TabsTrigger value="query">Query Editor</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Upload Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload Data</h3>
                <Suspense fallback={<div className="animate-pulse stable-skeleton-uploader" />}>
                  <FileUploader onFileUploaded={handleFileUploaded} />
                </Suspense>
              </div>

              {/* Preview Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-96">
                  <Suspense fallback={<div className="animate-pulse stable-skeleton-preview" />}>
                    <DataPreview tableName={previewTable} />
                  </Suspense>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="query">
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
                      aria-label="Collapse sidebar"
                    >
                      <TriangleIcon className="transition-transform duration-200 rotate-180" />
                    </button>
                  </div>
                  
                  <CollapsibleSidebar title="Schema" defaultExpanded={true}>
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-sidebar" />}>
                      <SchemaExplorer 
                        onTableSelect={insertTableName}
                        onColumnSelect={insertColumnName}
                        refreshTrigger={schemaRefreshTrigger}
                      />
                    </Suspense>
                  </CollapsibleSidebar>

                  <CollapsibleSidebar title="Saved Queries" defaultExpanded={true}>
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-sidebar" />}>
                      <SavedQueries 
                        onQuerySelect={setSql} 
                        currentQuery={sql} 
                        onSaveCallbackChange={handleSaveQueryCallbackChange}
                      />
                    </Suspense>
                  </CollapsibleSidebar>
                  <CollapsibleSidebar title="Recent Queries" defaultExpanded={false}>
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-sidebar" />}>
                      <RecentQueries 
                        onQuerySelect={setSql} 
                      />
                    </Suspense>
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
                          aria-label="Expand sidebar"
                        >
                          <TriangleIcon className="transition-transform duration-200" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <div className="text-sm stable-status-container">
                        {restoreMessage ? (
                          <span className="text-blue-600 dark:text-blue-400">{restoreMessage}</span>
                        ) : !hasWriteAccess ? (
                          <span className="text-red-600 dark:text-red-400">
                            Changes will not be saved - use the original tab
                          </span>
                        ) : isSaving ? (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            Saving…
                          </span>
                        ) : multiTabStatus?.isReconnecting ? (
                          <span className="flex items-center text-amber-600 dark:text-amber-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            Reconnecting to database - don&apos;t close this tab
                          </span>
                        ) : (multiTabStatus?.inflightQueryCount && multiTabStatus.inflightQueryCount > 0) ? (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            {multiTabStatus.inflightQueryCount === 1 ? 'Processing query' : `Processing ${multiTabStatus.inflightQueryCount} queries`} - don&apos;t close this tab
                          </span>
                        ) : isQuerying ? (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            Running query - don&apos;t close this tab
                          </span>
                        ) : multiTabStatus?.role === 'leader' && multiTabStatus?.activeConnections && multiTabStatus.activeConnections > 0 ? (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <div className="animate-pulse w-2 h-2 bg-current rounded-full mr-2"></div>
                            Database active - {multiTabStatus.activeConnections} tab{multiTabStatus.activeConnections !== 1 ? 's' : ''} connected
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">All changes saved</span>
                        )}
                      </div>
                    <div className="flex space-x-2">
                        <Button onClick={() => saveQueryCallback?.()} variant="secondary">
                          Save Current
                        </Button>
                        <Button onClick={executeQuery} disabled={isQuerying || (!db && !multiTabStatus?.initialized)}>
                          {isQuerying ? (
                            <span className="flex items-center">
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              Running...
                            </span>
                          ) : (
                            'Run Query'
                          )}
                        </Button>
                        <Suspense fallback={<div className="animate-pulse stable-skeleton-export" />}>
                          <ExportButton 
                            query={sql} 
                            disabled={!results || isQuerying}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                  <Suspense fallback={<div className="animate-pulse stable-skeleton-editor" />}>
                    <TabbedSQLEditor value={sql} onChange={setSql} />
                  </Suspense>
                </div>

                {/* Performance Hints */}
                <div className={`stable-hints-container ${queryHints.length > 0 ? 'has-content' : ''}`}>
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
                </div>

                {/* Query Metrics */}
                <div className="stable-metrics-container">
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
                </div>

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

                {/* Results Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Query Results</h3>
                    {results && results.numRows > 0 && (
                      <div className="flex items-center space-x-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setResultsViewMode('grid')}
                          className={`px-3 py-1 text-sm rounded ${
                            resultsViewMode === 'grid'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                          title="Table view"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M3 10h18M3 6h18m-9 8h9m-9 4h9m-9-8H3m0 4h6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setResultsViewMode('chart')}
                          className={`px-3 py-1 text-sm rounded ${
                            resultsViewMode === 'chart'
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                          title="Chart view"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {resultsViewMode === 'grid' ? (
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-results" />}>
                      <ResultsGrid data={results!} theme={theme} />
                    </Suspense>
                  ) : (
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-visualization" />}>
                      <Visualization 
                        data={results} 
                        theme={theme}
                        useWebGL={useWebGL}
                        chartRowLimit={chartRowLimit}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="visualization">
            <Suspense fallback={<div className="animate-pulse stable-skeleton-visualization" />}>
              <Visualization 
                theme={theme}
                useWebGL={useWebGL}
                initialTable={previewTable || undefined}
                chartRowLimit={chartRowLimit}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            theme={theme}
            onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            showMemoryBar={showMemoryBar}
            onMemoryBarToggle={() => setShowMemoryBar(prev => !prev)}
            useWebGL={useWebGL}
            onWebGLToggle={() => setUseWebGL(prev => !prev)}
            chartRowLimit={chartRowLimit}
            onChartRowLimitChange={setChartRowLimit}
          />
        </Suspense>
      )}
    </div>
  );
};
