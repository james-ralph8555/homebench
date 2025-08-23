'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDuckDB } from '@/contexts/DuckDBContext';
import { Table as ArrowTable } from 'apache-arrow';
import { FolderIcon } from './icons';
import { executeQueries } from '@/lib/multiTabQuery';

interface DataPreviewProps {
  tableName: string | null;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ tableName }) => {
  const { db } = useDuckDB();
  const [previewData, setPreviewData] = useState<ArrowTable | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<{ rowCount: number; columns: any[] } | null>(null);

  const loadPreview = useCallback(async () => {
    if (!tableName) return;

    setIsLoading(true);
    setError(null);

    try {
      // Execute multiple queries in parallel through multi-tab system
      const [countResult, columnsResult, sampleResult] = await executeQueries([
        { sql: `SELECT COUNT(*) as count FROM "${tableName}"` },
        { sql: `DESCRIBE "${tableName}"` },
        { sql: `SELECT * FROM "${tableName}" LIMIT 100` }
      ]);

      const rowCount = countResult.toArray()[0].toJSON().count;
      const columns = columnsResult.toArray().map((row: any) => row.toJSON());
      
      setTableInfo({ rowCount: parseInt(rowCount), columns });
      setPreviewData(sampleResult as ArrowTable);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    if (tableName) {
      loadPreview();
    } else {
      setPreviewData(null);
      setTableInfo(null);
    }
  }, [tableName, loadPreview]);

  if (!tableName) {
    return (
      <div className="flex items-center justify-center min-h-64 text-center text-gray-500 dark:text-gray-400">
        <div>
          <div className="mb-4 text-gray-400 flex justify-center"><FolderIcon /></div>
          <p className="text-lg mb-2">No data uploaded</p>
          <p className="text-sm">Upload a CSV, Parquet, or JSON file to see a preview</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <span>Loading preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
          Preview Error
        </h4>
        <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!previewData || !tableInfo) {
    return null;
  }

  const rows = previewData.toArray().map(row => row.toJSON());

  return (
    <div className="space-y-4">
      {/* Table Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Table: {tableName}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Rows:</span>
            <span className="ml-2 font-medium">{tableInfo.rowCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Columns:</span>
            <span className="ml-2 font-medium">{tableInfo.columns.length}</span>
          </div>
        </div>
      </div>

      {/* Column Information */}
      <div>
        <h4 className="text-md font-semibold mb-3">Column Information</h4>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nullable
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tableInfo.columns.map((column, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {column.column_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {column.column_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {column.null === 'YES' ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <div>
        <h4 className="text-md font-semibold mb-3">Data Preview (First 100 Rows)</h4>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  {tableInfo.columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {column.column_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {tableInfo.columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate"
                        title={String(row[column.column_name] || '')}
                      >
                        {row[column.column_name] !== null && row[column.column_name] !== undefined
                          ? String(row[column.column_name])
                          : <span className="text-gray-400 italic">null</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
