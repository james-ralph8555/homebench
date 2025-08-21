'use client';

import React, { useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { debounce } from '@/lib/performanceUtils';

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
  // Debounce onChange to reduce re-renders during typing
  const debouncedOnChange = useMemo(
    () => debounce(onChange, 150),
    [onChange]
  );

  // Memoize extensions to prevent recreation on every render
  const extensions = useMemo(() => [
    sql(),
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
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      },
    }),
    // Performance: Disable some features for large queries
    EditorView.lineWrapping,
  ], []);

  // Handle change with immediate update for UI responsiveness
  const handleChange = useCallback((val: string) => {
    // Immediate update for UI
    onChange(val);
    // Debounced callback for expensive operations
    debouncedOnChange(val);
  }, [onChange, debouncedOnChange]);

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
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