'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { debounce } from '@/lib/performanceUtils';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { executeQuery } from '@/lib/multiTabQuery';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({ 
  value, 
  onChange, 
  className = '',
  style = {}
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

  // Create base theme with common styles
  const baseTheme = useMemo(() => EditorView.theme({
    '&': {
      fontSize: '14px',
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    '.cm-content': {
      padding: '12px',
      minHeight: '200px',
      lineHeight: '1.5',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-editor': {
      borderRadius: '8px',
    },
    '.cm-scroller': {
      scrollbarWidth: 'thin',
    },
    '.cm-gutters': {
      border: 'none',
      borderRadius: '8px 0 0 8px',
    },
    '.cm-tooltip': {
      borderRadius: '6px',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul': {
        maxHeight: '200px',
      },
      '& > ul > li': {
        padding: '4px 8px',
        borderRadius: '4px',
      },
    },
  }), []);

  // Create light mode theme
  const lightTheme = useMemo(() => EditorView.theme({
    '&': {
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },
    '.cm-editor': {
      backgroundColor: '#ffffff',
    },
    '.cm-scroller': {
      backgroundColor: '#ffffff',
    },
    '.cm-content': {
      color: '#0f172a',
      caretColor: '#0f172a',
      backgroundColor: '#ffffff',
    },
    '.cm-gutters': {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#e2e8f0',
      color: '#1e293b',
    },
    '.cm-activeLine': {
      backgroundColor: '#f8fafc',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#e2e8f0',
    },
    '.cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-focused .cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-line ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-content ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    'span ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-cursor': {
      borderLeftColor: '#0f172a',
    },
    '.cm-placeholder': {
      color: '#64748b',
      fontStyle: 'italic',
    },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      border: '1px solid #e5e7eb',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#e2e8f0',
      color: '#1e293b',
    },
  }), []);

  // Create dark mode theme
  const darkTheme = useMemo(() => EditorView.theme({
    '&': {
      color: '#f8fafc',
      backgroundColor: '#0f172a',
    },
    '.cm-editor': {
      backgroundColor: '#0f172a',
    },
    '.cm-scroller': {
      backgroundColor: '#0f172a',
    },
    '.cm-content': {
      color: '#f8fafc',
      caretColor: '#f8fafc',
      backgroundColor: '#0f172a',
    },
    '.cm-gutters': {
      backgroundColor: '#1e293b',
      color: '#94a3b8',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#334155',
      color: '#f8fafc',
    },
    '.cm-activeLine': {
      backgroundColor: '#1e293b',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#334155',
    },
    '.cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-focused .cm-selectionBackground': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-line ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-content ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    'span ::selection': {
      backgroundColor: '#3b82f6 !important',
    },
    '.cm-cursor': {
      borderLeftColor: '#f8fafc',
    },
    '.cm-placeholder': {
      color: '#94a3b8',
      fontStyle: 'italic',
    },
    '.cm-tooltip': {
      backgroundColor: '#1e293b',
      color: '#f8fafc',
      border: '1px solid #334155',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#334155',
      color: '#f8fafc',
    },
  }), []);

  // Create light mode syntax highlighting
  const lightHighlighting = useMemo(() => HighlightStyle.define([
    { tag: t.keyword, color: '#1e40af', fontWeight: 'bold' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#0f172a' },
    { tag: [t.function(t.variableName), t.labelName], color: '#7c3aed' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#dc2626' },
    { tag: [t.definition(t.name), t.separator], color: '#0f172a' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#0d9488' },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#7c2d12' },
    { tag: [t.meta, t.comment], color: '#64748b', fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: '#1e40af', textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: '#0f172a' },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#dc2626' },
    { tag: [t.processingInstruction, t.string, t.inserted], color: '#059669' },
    { tag: t.invalid, color: '#dc2626', textDecoration: 'underline' },
  ]), []);

  // Create dark mode syntax highlighting
  const darkHighlighting = useMemo(() => HighlightStyle.define([
    { tag: t.keyword, color: '#60a5fa', fontWeight: 'bold' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#f8fafc' },
    { tag: [t.function(t.variableName), t.labelName], color: '#a78bfa' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#f87171' },
    { tag: [t.definition(t.name), t.separator], color: '#f8fafc' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#2dd4bf' },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#fdba74' },
    { tag: [t.meta, t.comment], color: '#94a3b8', fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: '#60a5fa', textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: '#f8fafc' },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#f87171' },
    { tag: [t.processingInstruction, t.string, t.inserted], color: '#34d399' },
    { tag: t.invalid, color: '#f87171', textDecoration: 'underline' },
  ]), []);

  // Check if we're in dark mode
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  // Memoize extensions to prevent recreation on every render
  const extensions = useMemo(() => [
    sql({
      schema: cmSchema,
      upperCaseKeywords: true,
      defaultSchema: 'main'
    }),
    baseTheme,
    isDark ? darkTheme : lightTheme,
    syntaxHighlighting(isDark ? darkHighlighting : lightHighlighting),
    EditorView.lineWrapping,
  ], [cmSchema, baseTheme, lightTheme, darkTheme, isDark, darkHighlighting, lightHighlighting]);

  // Handle change with immediate update for UI responsiveness
  const handleChange = useCallback((val: string) => {
    // Immediate update for UI
    onChange(val);
    // Debounced callback for expensive operations
    debouncedOnChange(val);
  }, [onChange, debouncedOnChange]);

  return (
    <div className={`stable-container ${className}`} style={{ ...style, minHeight: style.height || '244px' }}>
      <CodeMirror
        value={value}
        height={style.height ? `${parseInt(style.height.toString()) - 44}px` : "200px"}
        extensions={extensions}
        onChange={handleChange}
        placeholder="-- Write your SQL query here. Example: SELECT * FROM your_table_name LIMIT 10;"
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