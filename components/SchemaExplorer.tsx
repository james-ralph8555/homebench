'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TriangleIcon, RefreshIcon } from './icons';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { executeQuery } from '@/lib/multiTabQuery';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  type: 'table' | 'view';
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface SchemaExplorerProps {
  onTableSelect?: (tableName: string) => void;
  onColumnSelect?: (tableName: string, columnName: string) => void;
  refreshTrigger?: number;
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ 
  onTableSelect, 
  onColumnSelect,
  refreshTrigger 
}) => {
  const { db, isReady, initializationStage } = useDuckDB();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [views, setViews] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedViews, setExpandedViews] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaCache, setSchemaCache] = useState<Map<string, { tables: TableInfo[], views: TableInfo[], timestamp: number }>>(new Map());

  const loadSchema = useCallback(async () => {
    // Don't load schema if database isn't ready
    if (!isReady) {
      setTables([]);
      setViews([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first (5 second cache)
    const cacheKey = 'schema';
    const cached = schemaCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < 5000) {
      setTables(cached.tables);
      setViews(cached.views);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get all user tables and views using DuckDB system tables
      const [tablesResult, viewsResult] = await Promise.all([
        executeQuery(`
          SELECT table_name 
          FROM duckdb_tables() 
          WHERE schema_name = 'main' AND internal = false
          ORDER BY table_name
        `),
        executeQuery(`
          SELECT view_name as table_name
          FROM duckdb_views() 
          WHERE schema_name = 'main' AND internal = false
          ORDER BY view_name
        `).catch(() => ({ toArray: () => [] })) // Views may not exist
      ]);

      const tableInfos: TableInfo[] = [];
      const viewInfos: TableInfo[] = [];

      // Helper function to load table/view info
      const loadTableInfo = async (tableName: string, type: 'table' | 'view'): Promise<TableInfo> => {
        try {
          // Get column info using duckdb_columns
          const columnsResult = await executeQuery(`
            SELECT column_name, data_type, is_nullable
            FROM duckdb_columns() 
            WHERE schema_name = 'main' AND table_name = '${tableName}' AND internal = false
            ORDER BY column_index
          `);
          
          const columns: ColumnInfo[] = columnsResult.toArray().map((row: any) => {
            const colData = row.toJSON();
            return {
              name: colData.column_name,
              type: colData.data_type,
              nullable: colData.is_nullable
            };
          });

          // Get row count (for tables only, views might be expensive to count)
          let rowCount = 0;
          if (type === 'table') {
            try {
              const countResult = await executeQuery(`
                SELECT COUNT(*) as count FROM "${tableName}" LIMIT 1000
              `).catch(() => 
                executeQuery(`SELECT COUNT(*) as count FROM "${tableName}"`)
              );
              rowCount = parseInt(countResult.toArray()[0].toJSON().count);
            } catch (err) {
              console.warn(`Failed to get row count for ${tableName}:`, err);
            }
          }

          return {
            name: tableName,
            columns,
            rowCount,
            type
          };
        } catch (err) {
          console.warn(`Failed to get info for ${type} ${tableName}:`, err);
          return {
            name: tableName,
            columns: [],
            rowCount: 0,
            type
          };
        }
      };

      // Load table info in parallel
      const tableNames = tablesResult.toArray().map((row: any) => row.toJSON().table_name);
      const tablePromises = tableNames.map((name: string) => loadTableInfo(name, 'table'));
      
      // Load view info in parallel
      const viewNames = viewsResult.toArray().map((row: any) => row.toJSON().table_name);
      const viewPromises = viewNames.map((name: string) => loadTableInfo(name, 'view'));

      const [resolvedTableInfos, resolvedViewInfos] = await Promise.all([
        Promise.all(tablePromises),
        Promise.all(viewPromises)
      ]);

      tableInfos.push(...resolvedTableInfos);
      viewInfos.push(...resolvedViewInfos);

      // Cache the results
      setSchemaCache(prev => new Map(prev.set(cacheKey, { 
        tables: tableInfos, 
        views: viewInfos,
        timestamp: now 
      })));
      
      setTables(tableInfos);
      setViews(viewInfos);
    } catch (err: any) {
      console.error('Failed to load schema:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, schemaCache]);

  useEffect(() => {
    loadSchema();
  }, [refreshTrigger, loadSchema]);

  const toggleTableExpansion = useCallback((tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  }, [expandedTables]);

  const toggleViewExpansion = useCallback((viewName: string) => {
    const newExpanded = new Set(expandedViews);
    if (newExpanded.has(viewName)) {
      newExpanded.delete(viewName);
    } else {
      newExpanded.add(viewName);
    }
    setExpandedViews(newExpanded);
  }, [expandedViews]);

  const handleTableClick = useCallback((tableName: string) => {
    onTableSelect?.(tableName);
  }, [onTableSelect]);

  const handleColumnClick = useCallback((tableName: string, columnName: string) => {
    onColumnSelect?.(tableName, columnName);
  }, [onColumnSelect]);

  const getTypeIcon = useMemo(() => (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('bigint')) return '#';
    if (lowerType.includes('varchar') || lowerType.includes('text')) return 'T';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'D';
    if (lowerType.includes('bool')) return 'B';
    if (lowerType.includes('decimal') || lowerType.includes('double') || lowerType.includes('float')) return 'N';
    return '?';
  }, []);

  // Helper component to render table or view items
  const renderTableItem = useCallback((item: TableInfo, isExpanded: boolean, onToggle: (name: string) => void) => (
    <div
      key={item.name}
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    >
      {/* Table/View Header */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => onToggle(item.name)}
          >
            <TriangleIcon className={`text-gray-700 dark:text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
            <span 
              className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
              onClick={(e) => {
                e.stopPropagation();
                handleTableClick(item.name);
              }}
              title={`Click to insert ${item.type} name`}
            >
              {item.name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
              {item.type}
            </span>
          </div>
          {item.type === 'table' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.rowCount.toLocaleString()} rows
            </span>
          )}
        </div>
      </div>

      {/* Columns */}
      {isExpanded && (
        <div className="p-2 space-y-1">
          {item.columns.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic p-2">
              No column information available
            </p>
          ) : (
            item.columns.map((column) => (
              <div
                key={column.name}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm"
                onClick={() => handleColumnClick(item.name, column.name)}
                title="Click to insert column name"
              >
                <div className="flex items-center space-x-2">
                  <span>{getTypeIcon(column.type)}</span>
                  <span className="font-mono">{column.name}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {column.type}
                  {column.nullable && <span className="ml-1">NULL</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  ), [handleTableClick, handleColumnClick, getTypeIcon]);

  // Show database initialization status
  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-4">
        {initializationStage === 'loading' ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm">Loading database...</span>
          </>
        ) : initializationStage === 'error' ? (
          <span className="text-sm text-red-600 dark:text-red-400">Database failed to load</span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">Database not ready</span>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm">Loading schema...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-600 dark:text-red-300 text-sm">
          Failed to load schema: {error}
        </p>
        <button
          onClick={loadSchema}
          className="mt-2 text-sm text-red-700 dark:text-red-400 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          onClick={loadSchema}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
          title="Refresh schema"
        >
          <RefreshIcon className="mr-1" /> Refresh
        </button>
      </div>

      {tables.length === 0 && views.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No tables or views found</p>
          <p className="text-sm">Upload some data to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tables Section */}
          {tables.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-1">
                Tables ({tables.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tables.map((table) => 
                  renderTableItem(table, expandedTables.has(table.name), toggleTableExpansion)
                )}
              </div>
            </div>
          )}

          {/* Views Section */}
          {views.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-1">
                Views ({views.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {views.map((view) => 
                  renderTableItem(view, expandedViews.has(view.name), toggleViewExpansion)
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
