'use client';

import React, { useState } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { exportQueryAsFile, suggestFileName, ExportFormat } from '@/lib/exportUtils';

interface ExportButtonProps {
  query: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ query, disabled }) => {
  const { db } = useDuckDB();
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (!db || !query.trim()) return;

    setIsExporting(true);
    setShowDropdown(false);

    try {
      const fileName = suggestFileName(query, format);
      await exportQueryAsFile(db, query, fileName, format);
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Database download moved to Session Storage panel

  const exportOptions: { format: ExportFormat; label: string; description: string }[] = [
    { format: 'CSV', label: 'CSV', description: 'Comma-separated values' },
    { format: 'PARQUET', label: 'Parquet', description: 'Columnar binary format' },
    { format: 'JSON', label: 'JSON', description: 'JavaScript Object Notation' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isExporting || !query.trim()}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Exporting...
          </>
        ) : (
          <>
            Export
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {showDropdown && !disabled && !isExporting && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
          <div className="py-1">
            {exportOptions.map((option) => (
              <button
                key={option.format}
                onClick={() => handleExport(option.format)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              </button>
            ))}
            {/* Database download option removed; available in Session Storage */}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};
