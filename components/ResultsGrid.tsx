'use client';

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
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
  // Hard safety cap to keep UI responsive
  const MAX_DISPLAY_ROWS = 100_000;
  const BATCH_SIZE = 2_000;

  // Memoize number formatter to prevent recreation on every render
  const numberFormatter = useCallback((params: any) => {
    if (params.value === null || params.value === undefined) return '';
    return typeof params.value === 'number' ? params.value.toFixed(2) : params.value;
  }, []);

  // Columns are cheap to compute
  const columnDefs: ColDef[] = useMemo(() => {
    if (!data || data.numRows === 0) return [];
    return data.schema.fields.map(field => {
      const isNumericType = field.type.toString().includes('float') ||
        field.type.toString().includes('double') ||
        field.type.toString().includes('int');
      return {
        headerName: field.name,
        field: field.name,
        sortable: true,
        filter: isNumericType ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        resizable: true,
        ...(field.type.toString().includes('float') || field.type.toString().includes('double') ? {
          valueFormatter: numberFormatter,
          type: 'numericColumn'
        } : {}),
        enableRowGroup: false,
        enablePivot: false,
      } as ColDef;
    });
  }, [data, numberFormatter]);

  // Incremental row conversion to keep UI fluid
  const [rowData, setRowData] = useState<any[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [displayMax, setDisplayMax] = useState(0);
  const iteratorRef = useRef<Iterator<any> | null>(null);
  const processedRef = useRef(0);

  const rowCount = data?.numRows ?? 0;

  useEffect(() => {
    if (!data || rowCount === 0) {
      setRowData([]);
      setIsBuilding(false);
      setDisplayMax(0);
      iteratorRef.current = null;
      processedRef.current = 0;
      return;
    }

    // Reset state when new data arrives
    setRowData([]);
    setIsBuilding(true);
    processedRef.current = 0;
    const maxRows = Math.min(rowCount, MAX_DISPLAY_ROWS);
    setDisplayMax(maxRows);

    // Lazy iterator over rows prevents building all at once
    const iter = (data as any)[Symbol.iterator]?.();
    iteratorRef.current = iter || null;

    let cancelled = false;
    const processBatch = () => {
      if (cancelled) return;
      const nextRows: any[] = [];
      let i = 0;
      while (i < BATCH_SIZE && processedRef.current < maxRows) {
        const it = iteratorRef.current?.next?.();
        if (!it || it.done) break;
        const row = it.value;
        nextRows.push(typeof row?.toJSON === 'function' ? row.toJSON() : row);
        i++;
        processedRef.current++;
      }
      if (nextRows.length) {
        setRowData(prev => (prev.length ? prev.concat(nextRows) : nextRows));
      }
      if (processedRef.current < maxRows) {
        // Yield to the main thread
        setTimeout(processBatch, 0);
      } else {
        setIsBuilding(false);
      }
    };

    // Kick off incremental processing
    setTimeout(processBatch, 0);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, rowCount]);

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
      suppressMovable: true,
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
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">No results • Waiting for query…</div>
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
      {isBuilding && (
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Preparing rows… {rowData.length.toLocaleString()}/{displayMax.toLocaleString()}
        </div>
      )}
      <div className={theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-alpine'} style={{ height: 500, width: '100%' }}>
        <AgGridReact {...gridOptions} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {Math.min(rowCount, displayMax || rowCount).toLocaleString()} {displayMax && displayMax < rowCount ? 'of ' : ''}
          {displayMax && displayMax < rowCount ? rowCount.toLocaleString() + ' ' : ''}
          rows × {columnDefs.length} columns
          {displayMax && displayMax < rowCount ? ' • showing first ' + displayMax.toLocaleString() : ''}
        </span>
        <span>Est. memory: {MemoryManager.formatMemorySize(performanceConfig.estimatedMemory)}</span>
      </div>
    </div>
  );
};
