'use client';

import React, { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { GearIcon, TriangleIcon } from './icons';
import { Table as ArrowTable } from 'apache-arrow';
import { executeDurableWrite, executeReadQuery } from '@/lib/durableOperations';
import { addQueryToHistory } from '@/lib/queryStore';
import { usePersistence } from '@/hooks/usePersistence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { InstrumentPanel } from './InstrumentPanel';

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

const ExplainPanel = dynamic(() => import('./ExplainPanel').then(mod => ({ default: mod.ExplainPanel })), {
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
  const { db, isLoading, error: dbError, isSaving, hasWriteAccess, initializationStage, loadingProgress, isReady, multiTabStatus } = useDuckDB();
  const { loadSession, checkSessionExists, isSupported } = usePersistence();
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [sql, setSql] = useState<string>('');
  const [results, setResults] = useState<ArrowTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [loadedTables, setLoadedTables] = useState<string[]>([]);
  const [schemaRefreshTrigger, setSchemaRefreshTrigger] = useState<number>(0);
  const [queryHints, setQueryHints] = useState<string[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<{duration: number; memory?: number} | null>(null);
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [showingSchemaPreview, setShowingSchemaPreview] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [saveQueryCallback, setSaveQueryCallback] = useState<(() => void) | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [autoLoaded, setAutoLoaded] = useState(false);
  // Default values that are the same on server and client to avoid hydration mismatches
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showMemoryBar, setShowMemoryBar] = useState<boolean>(false);
  const [useWebGL, setUseWebGL] = useState<boolean>(true);
  const [chartRowLimit, setChartRowLimit] = useState<number>(10000);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [vizState, setVizState] = useState<{
    selectedTable?: string;
    chartConfig?: any;
    chartType?: string;
  }>({});

  // Explain state
  const [showExplain, setShowExplain] = useState(false);
  const [explainAnalyze, setExplainAnalyze] = useState(false);

  // Stable handlers to receive child-provided callbacks without causing effect loops
  const handleSaveQueryCallbackChange = useCallback((cb: () => void) => {
    setSaveQueryCallback(() => cb);
  }, []);

  // Load persisted settings on mount (client only) to prevent SSR/CSR mismatches
  React.useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
      }
      const storedShowMemoryBar = localStorage.getItem('showMemoryBar');
      if (storedShowMemoryBar === 'true') setShowMemoryBar(true);
      const storedUseWebGL = localStorage.getItem('useWebGL');
      if (storedUseWebGL === 'false') setUseWebGL(false);
      const storedChartRowLimit = localStorage.getItem('chartRowLimit');
      if (storedChartRowLimit) {
        const n = parseInt(storedChartRowLimit, 10);
        if (!Number.isNaN(n)) setChartRowLimit(n);
      }
    } catch {}
    setSettingsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!settingsHydrated) return;
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (!root) return;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme, settingsHydrated]);

  React.useEffect(() => {
    if (!settingsHydrated) return;
    try { localStorage.setItem('showMemoryBar', String(showMemoryBar)); } catch {}
  }, [showMemoryBar, settingsHydrated]);

  React.useEffect(() => {
    if (!settingsHydrated) return;
    try { localStorage.setItem('useWebGL', String(useWebGL)); } catch {}
  }, [useWebGL, settingsHydrated]);

  React.useEffect(() => {
    if (!settingsHydrated) return;
    try { localStorage.setItem('chartRowLimit', String(chartRowLimit)); } catch {}
  }, [chartRowLimit, settingsHydrated]);

  // Auto-load session on component mount
  React.useEffect(() => {
    const checkAndLoadSession = async () => {
      if (!isReady || !isSupported || autoLoaded) return;
      
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
  }, [isReady, isSupported, autoLoaded, checkSessionExists, loadSession]);

  const executeQuery = async () => {
    // Check if database is ready for queries
    if (!isReady && !multiTabStatus?.initialized) return;
    
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
        const result = await executeDurableWrite(sql, [], {
          description: `SQL query execution (${trimmedSql.substring(0, 50)}...)`
        });
        const duration = performance.now() - startTime;
        setQueryMetrics({ duration });
        
        // Trigger schema refresh for DDL operations
        if (upperSql.startsWith('CREATE') || upperSql.startsWith('DROP') || upperSql.startsWith('ALTER')) {
          setSchemaRefreshTrigger(prev => prev + 1);
        }
      } else {
        // Read operation (no auto-LIMIT here; previews limit in display only)
        const result = await executeReadQuery(sql);
        const duration = performance.now() - startTime;
        setResults(result as ArrowTable);
        setQueryMetrics({ duration });
        // Hide explain if we just ran the actual query
        setShowExplain(false);
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

  const handleExplain = useCallback((analyze: boolean) => {
    setExplainAnalyze(analyze);
    setShowExplain(true);
  }, []);

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

  // Database initialization status message (non-blocking, only show loading/error)
  const getDatabaseStatusMessage = () => {
    if (dbError) {
      return {
        type: 'error' as const,
        message: `Database initialization failed: ${dbError.message}. Please refresh the page.`
      };
    }
    if (initializationStage === 'loading') {
      return {
        type: 'loading' as const,
        message: loadingProgress?.message || 'Loading database engine...',
        progress: loadingProgress?.progress,
        stage: loadingProgress?.stage
      };
    }
    // Don't show "ready" status - it's implied when features work
    return null;
  };

  const dbStatus = getDatabaseStatusMessage();

  // Detect if the SQL Editor instrumentation (status + buttons) overflows available width.
  const toolbarContainerRef = React.useRef<HTMLDivElement>(null);
  const toolbarRightRef = React.useRef<HTMLDivElement>(null);
  const toolbarLeftRef = React.useRef<HTMLDivElement>(null);
  const [isToolbarOverflowing, setIsToolbarOverflowing] = React.useState(false);

  React.useEffect(() => {
    const measure = () => {
      const container = toolbarContainerRef.current;
      const right = toolbarRightRef.current;
      const left = toolbarLeftRef.current;
      if (!container || !right || !left) return;

      // Available width for right side = container width - left width - gap
      const containerWidth = container.clientWidth;
      const leftWidth = left.clientWidth;
      const gap = 16; // approximate spacing between left/right
      const available = Math.max(0, containerWidth - leftWidth - gap);
      const needed = right.scrollWidth; // intrinsic width of right content

      // Also consider vertical stack when base layout is column
      const isColumn = getComputedStyle(container).flexDirection === 'column';

      setIsToolbarOverflowing(isColumn || needed > available);
    };

    const ro = new ResizeObserver(measure);
    if (toolbarContainerRef.current) ro.observe(toolbarContainerRef.current);
    if (toolbarRightRef.current) ro.observe(toolbarRightRef.current);
    if (toolbarLeftRef.current) ro.observe(toolbarLeftRef.current);
    // Initial measure
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full min-h-svh overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <div className="min-h-0 h-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          {/* Top bar: logo + tabs on left, settings on right */}
          <header className="border-b border-border h-12 flex items-center justify-between px-0">
            <div className="flex items-center gap-3 min-w-0">
              <Image src="/logo.webp" alt="HomeBench logo" width={24} height={24} className="rounded" />
              <TabsList className="bg-transparent p-0 rounded-none">
                <TabsTrigger value="upload" className="rounded-none">Data Upload</TabsTrigger>
                <TabsTrigger value="query" className="rounded-none">Query Editor</TabsTrigger>
                <TabsTrigger value="visualization" className="rounded-none">Visualization</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowSettings(true)} variant="ghost" className="p-2" title="Settings" aria-label="Open settings">
                <GearIcon size={22} className="w-6 h-6" />
              </Button>
            </div>
          </header>

          {/* Tab Content */}
          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Upload Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload Data</h3>
                <Suspense fallback={<div className="animate-pulse stable-skeleton-uploader" />}>
                  <FileUploader 
                    onFileUploaded={handleFileUploaded}
                    onSchemaPreviewShow={() => setShowingSchemaPreview(true)}
                    onSchemaPreviewHide={() => setShowingSchemaPreview(false)}
                  />
                </Suspense>
              </div>

              {/* Preview Section (show only after a file is imported and schema preview is not active) */}
              {previewTable && !showingSchemaPreview && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-96">
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-preview" />}>
                      <DataPreview tableName={previewTable} />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="query">
          <div className={`grid gap-0 ${isSidebarCollapsed ? 'grid-cols-1 xl:grid-cols-[2.5rem_1fr]' : 'grid-cols-1 xl:grid-cols-[320px_1fr]'}`}>
            {/* Sidebar (collapsible to a slim rail) */}
            <div className="bg-muted/30 border-r border-border">
              {isSidebarCollapsed ? (
                <aside className="w-full h-10 xl:h-full">
                  <Button
                    onClick={() => setIsSidebarCollapsed(false)}
                    variant="ghost"
                    className="w-full h-full rounded-none flex items-center justify-center xl:items-start xl:justify-center xl:pt-2 xl:px-0 xl:py-0 xl:gap-0 xl:shrink-0 hover:bg-muted/40"
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                  >
                    <TriangleIcon className="transition-transform duration-200" />
                  </Button>
                </aside>
              ) : (
                <aside className="pt-1 pb-3 px-3 xl:pt-2 xl:px-3 xl:pb-3">
                  <div className="flex items-center justify-end mb-0 xl:mb-2">
                    <Button
                      onClick={() => setIsSidebarCollapsed(true)}
                      variant="ghost"
                      size="icon"
                      title="Collapse sidebar"
                      aria-label="Collapse sidebar"
                    >
                      <TriangleIcon className="transition-transform duration-200 rotate-180" />
                    </Button>
                  </div>

                  <div className="space-y-4">
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
                </aside>
              )}
            </div>

            {/* Main Content */}
            <div className={"col-span-1 xl:col-start-2"}>
              <div className="space-y-6">
                {/* SQL Editor */}
                <div>
                  <div ref={toolbarContainerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                    <div ref={toolbarLeftRef} className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">SQL Editor</h3>
                    </div>
                    <div ref={toolbarRightRef} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
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
                        <Button onClick={executeQuery} disabled={isQuerying || (!isReady && !multiTabStatus?.initialized)}>
                          {isQuerying ? (
                            <span className="flex items-center">
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              Running...
                            </span>
                          ) : !isReady && initializationStage === 'loading' ? (
                            <span className="flex items-center">
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                              {loadingProgress?.message || 'Loading Database...'}
                              {loadingProgress?.progress && (
                                <span className="ml-2 text-xs opacity-75">
                                  {loadingProgress.progress}%
                                </span>
                              )}
                            </span>
                          ) : (
                            'Run Query'
                          )}
                        </Button>
                        <Button onClick={() => handleExplain(false)} variant="outline" disabled={!sql.trim()} title="EXPLAIN">
                          Explain
                        </Button>
                        <Button onClick={() => handleExplain(true)} variant="outline" disabled={!sql.trim()} title="EXPLAIN ANALYZE">
                          Analyze
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
                    <TabbedSQLEditor value={sql} onChange={setSql} useMobilePlaceholder={isToolbarOverflowing} />
                  </Suspense>
                </div>

                {/* Results directly follow editor to fuse them */}
                <div>
                  {!showExplain ? (
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-results" />}>
                      <ResultsGrid data={results!} theme={theme} />
                    </Suspense>
                  ) : (
                    <Suspense fallback={<div className="animate-pulse stable-skeleton-results" />}>
                      <ExplainPanel sql={sql} analyze={explainAnalyze} theme={theme} onClose={() => setShowExplain(false)} />
                    </Suspense>
                  )}
                  {/* Subtle inline metrics below results */}
                  {queryMetrics && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Executed in {queryMetrics.duration.toFixed(2)}ms{queryMetrics.memory ? ` • Mem ${(queryMetrics.memory / 1024 / 1024).toFixed(2)}MB` : ''}
                    </div>
                  )}
                </div>

                {/* Error Display (kept, but below results for less disruption) */}
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
              </div>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="visualization">
            <Suspense fallback={<div className="animate-pulse stable-skeleton-visualization" />}>
              <Visualization 
                theme={theme}
                useWebGL={useWebGL}
                initialTable={previewTable || vizState.selectedTable}
                chartRowLimit={chartRowLimit}
                persistedState={vizState}
                onStateChange={setVizState}
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
      
      {/* Instrument Panel */}
      <InstrumentPanel 
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />
    </div>
  );
};
