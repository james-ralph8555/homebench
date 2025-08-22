'use client';

import React, { useState } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { SQLEditor } from './SQLEditor';
import { ResultsGrid } from './ResultsGrid';
import { FileUploader } from './FileUploader';
import { ExportButton } from './ExportButton';
import { PersistencePanel } from './PersistencePanel';
import { SavedQueries } from './SavedQueries';
import { SchemaExplorer } from './SchemaExplorer';
import { Table as ArrowTable } from 'apache-arrow';
import { markTableAsUserCreated } from '@/lib/tableMetadataStore';
import { QueryOptimizer, PerformanceMonitor as PerfMonitorUtils } from '@/lib/performanceUtils';

export const Workbench: React.FC = () => {
  const { db, isLoading, error: dbError } = useDuckDB();
  const [sql, setSql] = useState<string>('-- Upload a file first, then write your query\n-- Example: SELECT * FROM "your_file.csv" LIMIT 10;');
  const [results, setResults] = useState<ArrowTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [loadedTables, setLoadedTables] = useState<string[]>([]);
  const [schemaRefreshTrigger, setSchemaRefreshTrigger] = useState<number>(0);
  const [queryHints, setQueryHints] = useState<string[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<{duration: number; memory?: number} | null>(null);

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
        console.log('🚀 Query automatically optimized with LIMIT for better performance');
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

  const handleFileUploaded = (fileName: string) => {
    setLoadedTables(prev => [...prev.filter(name => name !== fileName), fileName]);
    
    // Update the SQL editor with a helpful query if it's still the default
    if (sql.includes('-- Upload a file first')) {
      setSql(`-- Query your uploaded data
SELECT * FROM "${fileName}" LIMIT 10;`);
    }
    
    // Trigger schema refresh when new file is uploaded
    setSchemaRefreshTrigger(prev => prev + 1);
  };

  const insertTableName = (tableName: string) => {
    setSql(prev => prev + `"${tableName}"`);
  };

  const insertColumnName = (tableName: string, columnName: string) => {
    setSql(prev => prev + `"${tableName}"."${columnName}"`);
  };

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">HomeBench</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Privacy-First SQL Workbench
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-3">📁 Data Sources</h3>
                <FileUploader onFileUploaded={handleFileUploaded} />
              </div>

              {/* Schema Explorer */}
              <SchemaExplorer 
                onTableSelect={insertTableName}
                onColumnSelect={insertColumnName}
                refreshTrigger={schemaRefreshTrigger}
              />

              {/* Saved Queries */}
              <SavedQueries onQuerySelect={setSql} currentQuery={sql} />

              {/* Session Persistence */}
              <PersistencePanel onTablesLoaded={() => setSchemaRefreshTrigger(prev => prev + 1)} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* SQL Editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">💻 SQL Editor</h3>
                  <div className="flex space-x-2">
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
                    💡 Performance Hints
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
                      ⚡ Query executed in {queryMetrics.duration.toFixed(2)}ms
                    </span>
                    {queryMetrics.memory && (
                      <span className="text-gray-600 dark:text-gray-400">
                        🧠 Memory: {(queryMetrics.memory / 1024 / 1024).toFixed(2)}MB
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
                <h3 className="text-lg font-semibold mb-3">📈 Query Results</h3>
                <ResultsGrid data={results!} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
