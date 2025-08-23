'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { debounce } from '@/lib/performanceUtils';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { executeQuery } from '@/lib/multiTabQuery';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({ 
  value, 
  onChange, 
  className = ''
}) => {
  const { db } = useDuckDB();
  const [cmSchema, setCmSchema] = useState<Record<string, string[]>>({});
  const [schemaCache, setSchemaCache] = useState<Map<string, { data: Record<string, string[]>, timestamp: number }>>(new Map());
  // Debounce onChange to reduce re-renders during typing
  const debouncedOnChange = useMemo(
    () => debounce(onChange, 150),
    [onChange]
  );


  // Load DuckDB schema for autocomplete
  const loadDuckDBSchema = useCallback(async () => {
    if (!db) return;

    // Check cache first (5 second cache)
    const cacheKey = 'sql-schema';
    const cached = schemaCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < 5000) {
      setCmSchema(cached.data);
      return;
    }

    try {
      // Get all tables
      const tablesResult = await executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
        ORDER BY table_name
      `);

      const tableNames = tablesResult.toArray().map((row: any) => row.toJSON().table_name);
      
      // Build schema map for CodeMirror: "schema.table" -> ["col1", "col2", ...]
      const schema: Record<string, string[]> = {};
      
      // Load columns for all tables in parallel
      const columnPromises = tableNames.map(async (tableName: string) => {
        try {
          const columnsResult = await executeQuery(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position
          `);
          
          const columns = columnsResult.toArray().map((row: any) => row.toJSON().column_name);
          schema[`main.${tableName}`] = columns;
          // Also add without schema prefix for convenience
          schema[tableName] = columns;
        } catch (error) {
          console.warn(`Failed to load columns for table ${tableName}:`, error);
        }
      });
      
      await Promise.all(columnPromises);
      
      // Cache the result
      setSchemaCache(prev => new Map(prev.set(cacheKey, { data: schema, timestamp: now })));
      setCmSchema(schema);
    } catch (error) {
      console.warn('Failed to load DuckDB schema for autocomplete:', error);
    }
  }, [db, schemaCache]);

  // Load schema when database becomes available or changes
  useEffect(() => {
    if (db) {
      loadDuckDBSchema();
    }
  }, [db, loadDuckDBSchema]);

  // Memoize extensions to prevent recreation on every render
  const extensions = useMemo(() => [
    sql({
      schema: cmSchema,
      upperCaseKeywords: true,
      defaultSchema: 'main'
    }),
    EditorView.theme({
      '&': {
        fontSize: '14px',
      },
      '.cm-content': {
        padding: '12px',
        minHeight: '200px',
        lineHeight: '1.5', // Better readability
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-editor': {
        borderRadius: '8px',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      },
    }),
    // Performance: Disable some features for large queries
    EditorView.lineWrapping,
  ], [cmSchema]);

  // Handle change with immediate update for UI responsiveness
  const handleChange = useCallback((val: string) => {
    // Immediate update for UI
    onChange(val);
    // Debounced callback for expensive operations
    debouncedOnChange(val);
  }, [onChange, debouncedOnChange]);

  return (
    <div className={`stable-container border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`} style={{ minHeight: '244px' }}>
      <CodeMirror
        value={value}
        height="200px"
        extensions={extensions}
        onChange={handleChange}
        theme={oneDark}
        placeholder="-- Write your SQL query here
-- Example: SELECT * FROM your_table_name LIMIT 10;"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false, // Disable for performance
        }}
      />
    </div>
  );
};