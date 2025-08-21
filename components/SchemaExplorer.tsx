'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
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
  const { db, connectionPool } = useDuckDB();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaCache, setSchemaCache] = useState<Map<string, { data: TableInfo[], timestamp: number }>>(new Map());

  const loadSchema = useCallback(async () => {
    if (!db || !connectionPool) return;

    // Check cache first (5 second cache)
    const cacheKey = 'schema';
    const cached = schemaCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < 5000) {
      setTables(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    let connection = null;
    try {
      connection = await connectionPool.getConnection(db);

      // Get all tables with optimized query
      const tablesResult = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
        ORDER BY table_name
      `);

      const tableInfos: TableInfo[] = [];

      // Load table info in parallel for better performance
      const tableNames = tablesResult.toArray().map((row: any) => row.toJSON().table_name);
      
      const tablePromises = tableNames.map(async (tableName: string) => {
        try {
          // Use a single query to get both column info and estimated row count
          const [columnsResult, countResult] = await Promise.all([
            connection!.query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = '${tableName}'
              ORDER BY ordinal_position
            `),
            // Use ANALYZE for faster row count estimation on large tables
            connection!.query(`
              SELECT COUNT(*) as count FROM "${tableName}" LIMIT 1000
            `).catch(() => 
              // Fallback to exact count for smaller tables
              connection!.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
            )
          ]);
          
          const columns: ColumnInfo[] = columnsResult.toArray().map((row: any) => {
            const colData = row.toJSON();
            return {
              name: colData.column_name,
              type: colData.data_type,
              nullable: colData.is_nullable === 'YES'
            };
          });

          const rowCount = countResult.toArray()[0].toJSON().count;

          return {
            name: tableName,
            columns,
            rowCount: parseInt(rowCount)
          };
        } catch (err) {
          console.warn(`Failed to get info for table ${tableName}:`, err);
          // Still add the table even if we can't get detailed info
          return {
            name: tableName,
            columns: [],
            rowCount: 0
          };
        }
      });

      const resolvedTableInfos = await Promise.all(tablePromises);
      tableInfos.push(...resolvedTableInfos);

      // Cache the results
      setSchemaCache(prev => new Map(prev.set(cacheKey, { 
        data: tableInfos, 
        timestamp: now 
      })));
      
      setTables(tableInfos);
    } catch (err: any) {
      console.error('Failed to load schema:', err);
      setError(err.message);
    } finally {
      if (connection && connectionPool) {
        await connectionPool.releaseConnection(connection);
      }
      setIsLoading(false);
    }
  }, [db, connectionPool, schemaCache]);

  useEffect(() => {
    if (db) {
      loadSchema();
    }
  }, [db, refreshTrigger, loadSchema]);

  const toggleTableExpansion = useCallback((tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  }, [expandedTables]);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Schema</h3>
        <button
          onClick={loadSchema}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          title="Refresh schema"
        >
          Refresh
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No tables found</p>
          <p className="text-sm">Upload some data to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {tables.map((table) => (
          <div
            key={table.name}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => toggleTableExpansion(table.name)}
                >
                  <span className="text-sm">
                    {expandedTables.has(table.name) ? '▼' : '▶'}
                  </span>
                  <span 
                    className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table.name);
                    }}
                    title="Click to insert table name"
                  >
                    {table.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {table.rowCount.toLocaleString()} rows
                </span>
              </div>
            </div>

            {/* Columns */}
            {expandedTables.has(table.name) && (
              <div className="p-2 space-y-1">
                {table.columns.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic p-2">
                    No column information available
                  </p>
                ) : (
                  table.columns.map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm"
                      onClick={() => handleColumnClick(table.name, column.name)}
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
          ))}
        </div>
      )}
    </div>
  );
};
