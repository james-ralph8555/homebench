'use client';

import React, { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import { Table as ArrowTable } from 'apache-arrow';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { ResultOptimizer, MemoryManager } from '@/lib/performanceUtils';
import { ChartIcon } from './icons';

interface ResultsGridProps {
  data: ArrowTable;
  className?: string;
  theme?: 'light' | 'dark';
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({ data, className = '', theme = 'dark' }) => {
  // Memoize number formatter to prevent recreation on every render
  const numberFormatter = useCallback((params: any) => {
    if (params.value === null || params.value === undefined) return '';
    return typeof params.value === 'number' ? params.value.toFixed(2) : params.value;
  }, []);

  // Memoize the transformation to prevent re-computation on re-renders
  const { columnDefs, rowData, rowCount } = useMemo(() => {
    if (!data || data.numRows === 0) {
      return { columnDefs: [], rowData: [], rowCount: 0 };
    }

    const fields: ColDef[] = data.schema.fields.map(field => {
      const isNumericType = field.type.toString().includes('float') || 
                           field.type.toString().includes('double') ||
                           field.type.toString().includes('int');
      
      return {
        headerName: field.name,
        field: field.name,
        sortable: true,
        filter: isNumericType ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        resizable: true,
        // Add type-specific formatting for floating point numbers only
        ...(field.type.toString().includes('float') || field.type.toString().includes('double') ? {
          valueFormatter: numberFormatter,
          type: 'numericColumn'
        } : {}),
        // Optimize rendering for large datasets
        enableRowGroup: false, // Disable for performance
        enablePivot: false, // Disable for performance
      };
    });

    // Convert Arrow Table to an array of objects for AG Grid
    // Use lazy conversion for better memory usage with large datasets
    const rows = data.toArray().map(row => row.toJSON());

    return { 
      columnDefs: fields, 
      rowData: rows, 
      rowCount: data.numRows 
    };
  }, [data, numberFormatter]);

  // Calculate optimal performance settings
  const performanceConfig = useMemo(() => {
    const optimalPageSize = ResultOptimizer.getOptimalPageSize(rowCount, columnDefs.length);
    const shouldVirtualize = ResultOptimizer.shouldVirtualize(rowCount, columnDefs.length);
    const shouldWarnMemory = MemoryManager.shouldWarnAboutMemory(rowCount, columnDefs.length);
    
    return {
      pageSize: optimalPageSize,
      virtualize: shouldVirtualize,
      warnMemory: shouldWarnMemory,
      estimatedMemory: MemoryManager.estimateTableMemory(rowCount, columnDefs.length)
    };
  }, [rowCount, columnDefs.length]);

  // Memoize grid options for performance
  const gridOptions = useMemo<GridOptions>(() => ({
    columnDefs,
    rowData,
    rowSelection: 'multiple',
    animateRows: false, // Disable animations for better performance
    pagination: true,
    paginationPageSize: performanceConfig.pageSize,
    suppressRowClickSelection: true, // Improve click performance
    suppressCellFocus: true, // Improve navigation performance
    suppressColumnVirtualisation: !performanceConfig.virtualize,
    suppressRowVirtualisation: !performanceConfig.virtualize,
    rowBuffer: performanceConfig.virtualize ? 20 : 10,
    defaultColDef: {
      minWidth: performanceConfig.virtualize ? 120 : 100,
      flex: 1,
      sortable: true,
      resizable: true,
      suppressMenu: false,
    },
    // Performance optimizations for large datasets
    ...(rowCount > 10000 ? {
      rowModelType: 'clientSide',
      cacheBlockSize: performanceConfig.pageSize,
      maxConcurrentDatasourceRequests: 2,
      purgeClosedRowNodes: true,
      maxBlocksInCache: 10,
    } : {}),
  }), [columnDefs, rowData, rowCount, performanceConfig]);

  // Handle empty data after all hooks
  if (!data || data.numRows === 0) {
    return (
      <div className={`stable-container ${className}`}>
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>No results</span>
            <span className="text-xs">Waiting for query...</span>
          </div>
        </div>
        <div className="flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg" style={{ height: 500 }}>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-2 text-gray-400 flex justify-center">
              <ChartIcon />
            </div>
            <p>No data to display</p>
            <p className="text-sm">Run a query to see results here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stable-container ${className}`}>
      <div className="mb-2 space-y-1">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {rowCount.toLocaleString()} rows × {columnDefs.length} columns</span>
          <span className="text-xs">
            Est. memory: {MemoryManager.formatMemorySize(performanceConfig.estimatedMemory)}
          </span>
        </div>
        
      </div>
      <div className={theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-alpine'} style={{ height: 500, width: '100%' }}>
        <AgGridReact {...gridOptions} />
      </div>
    </div>
  );
};
