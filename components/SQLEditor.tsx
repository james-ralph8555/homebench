'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { hbPlaceholderSkin } from '@/editor/brandTheme';
import { debounce } from '@/lib/performanceUtils';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { executeQuery } from '@/lib/multiTabQuery';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  // When true, force the compact/mobile placeholder
  useMobilePlaceholder?: boolean;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({ 
  value, 
  onChange, 
  className = '',
  style = {},
  useMobilePlaceholder
}) => {
  const { db } = useDuckDB();
  const [cmSchema, setCmSchema] = useState<Record<string, string[]>>({});
  const [schemaCache, setSchemaCache] = useState<Map<string, { data: Record<string, string[]>, timestamp: number }>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
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
      '.cm-editor': {
        minHeight: '18em',
      },
      '.cm-content': {
        padding: '8px 0px',
        // Ensure at least 12 lines visible by default (12 * 1.5em = 18em)
        minHeight: '18em',
        lineHeight: '1.5', // Better readability
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        minHeight: '18em',
      },
    }),
    // Performance: Disable some features for large queries
    EditorView.lineWrapping,
    // Brand gradient placeholder + mono stack (JetBrains Mono preferred)
    hbPlaceholderSkin,
  ], [cmSchema]);

  // Handle change with immediate update for UI responsiveness
  const handleChange = useCallback((val: string) => {
    // Immediate update for UI
    onChange(val);
    // Debounced callback for expensive operations
    debouncedOnChange(val);
  }, [onChange, debouncedOnChange]);

  // Multiline ASCII + mission statement placeholder shown when editor empty
  const HB_ASCII = String.raw`Upload some data to get started!

           .7J~.           888    888                             888888b.                          888      
     JGG~..::~YGP7.        888    888                             888  "88b                         888      
    .G#BBBGPJ^  :JGGJ^     888    888                             888  .88P                         888      
 :?PBBBBBGG5Y?7~:. .7PGY~. 8888888888 .d88b. 88888b.d88b.  .d88b. 8888888K.  .d88b. 88888b.  .d8888b88888b.  
7P?: .YG5YJYY?5Y?7~:. .~Y! 888    888d88""88b888 "888 "88bd8P  Y8b888  "Y88bd8P  Y8b888 "88bd88P"   888 "88b 
   JJ ^J5GP5?7J5GGJ!!^.    888    888888  888888  888  88888888888888    88888888888888  888888     888  888 
  .GP ^JJ5P5Y7Y5P5?!!~^    888    888Y88..88P888  888  888Y8b.    888   d88PY8b.    888  888Y88b.   888  888 
  .GP .7!!!7J7J7!!~!~^^    888    888 "Y88P" 888  888  888 "Y8888 8888888P"  "Y8888 888  888 "Y8888P888  888 
   PG!::::::.:~!~~~~~^^    
    ^!~~~^^^. ........     Privacy-by-Design SQL Workbench.
`;

  const HB_ASCII_MOBILE = String.raw`Upload some data to get started!

           .7J~.           
     JGG~..::~YGP7.        
    .G#BBBGPJ^  :JGGJ^     
 :?PBBBBBGG5Y?7~:. .7PGY~. 
7P?: .YG5YJYY?5Y?7~:. .~Y! 
   JJ ^J5GP5?7J5GGJ!!^.    
  .GP ^JJ5P5Y7Y5P5?!!~^    
  .GP .7!!!7J7J7!!~!~^^    
   PG!::::::.:~!~~~~~^^   
    ^!~~~^^^. ........    
 _  _               ___              _    
| || |___ _ __  ___| _ ) ___ _ _  __| |_  
| __ / _ \ '  \/ -_) _ \/ -_) ' \/ _| ' \ 
|_||_\___/_|_|_\___|___/\___|_||_\__|_||_|
                                          
Privacy-by-Design 
SQL Workbench.
`;

  // Detect mobile viewport to switch placeholder (used only as a fallback
  // when `useMobilePlaceholder` prop isn't provided)
  useEffect(() => {
    if (useMobilePlaceholder !== undefined) return; // controlled externally
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)') : null;
    const update = () => setIsMobile(!!mq && mq.matches);
    update();
    mq?.addEventListener('change', update);
    return () => mq?.removeEventListener('change', update);
  }, [useMobilePlaceholder]);

  return (
    <div className={`stable-container no-layout-contain overflow-hidden ${className}`} style={{ ...style, minHeight: style.height || 'calc(18em + 44px)' }}>
      <CodeMirror
        value={value}
        // Default to 12 lines worth of height; if explicit height provided, subtract container padding/borders
        height={style.height ? `${parseInt(style.height.toString()) - 44}px` : '18em'}
        minHeight={'18em'}
        theme={oneDark}
        extensions={extensions}
        onChange={handleChange}
        placeholder={(useMobilePlaceholder ?? isMobile) ? HB_ASCII_MOBILE : HB_ASCII}
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
