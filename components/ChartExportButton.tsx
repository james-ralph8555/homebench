'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { ChartExporter, ExportFormat, ExportOptions } from '@/lib/chartExportUtils';
import { ChartConfig } from '@/lib/plotlyTransform';
import { Table as ArrowTable } from 'apache-arrow';

interface ChartExportButtonProps {
  plotRef: React.RefObject<any>; // Reference to the Plotly plot
  data: ArrowTable;
  config: ChartConfig;
  disabled?: boolean;
  className?: string;
}

interface ExportState {
  isExporting: boolean;
  format?: ExportFormat;
  error?: string;
  success?: boolean;
}

export const ChartExportButton: React.FC<ChartExportButtonProps> = ({
  plotRef,
  data,
  config,
  disabled = false,
  className = ''
}) => {
  const [exportState, setExportState] = useState<ExportState>({ isExporting: false });

  const handleExport = async (format: ExportFormat) => {
    setExportState({ isExporting: true, format });

    try {
      const options: ExportOptions = {
        format,
        width: 1200,
        height: 800,
        scale: 2
      };

      let result;

      if (format === 'csv' || format === 'json') {
        // Export data
        result = await ChartExporter.exportChartData(data, config, options);
      } else {
        // Export chart visualization
        const plotElement = plotRef.current?.plotly;
        if (!plotElement) {
          throw new Error('Chart not ready for export');
        }
        result = await ChartExporter.exportChart(plotElement, config, options);
      }

      if (result.success) {
        setExportState({ 
          isExporting: false, 
          success: true 
        });
        // Clear success state after 2 seconds
        setTimeout(() => {
          setExportState({ isExporting: false });
        }, 2000);
      } else {
        setExportState({ 
          isExporting: false, 
          error: result.error || 'Export failed' 
        });
        // Clear error state after 5 seconds
        setTimeout(() => {
          setExportState({ isExporting: false });
        }, 5000);
      }
    } catch (error: any) {
      setExportState({ 
        isExporting: false, 
        error: error.message || 'Export failed' 
      });
      setTimeout(() => {
        setExportState({ isExporting: false });
      }, 5000);
    }
  };

  const availableFormats = ChartExporter.getAvailableFormats(config);

  // If currently exporting, show loading state
  if (exportState.isExporting) {
    return (
      <Button
        disabled
        variant="outline"
        className={className}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Exporting {exportState.format?.toUpperCase()}...</span>
        </div>
      </Button>
    );
  }

  // If export succeeded, show success state briefly
  if (exportState.success) {
    return (
      <Button
        variant="outline"
        className={`${className} border-green-500 text-green-600`}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Exported!</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={className}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
          <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56">
        {/* Chart Formats */}
        <div className="px-3 py-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Chart Export
          </h4>
        </div>
        
        {(['png', 'svg', 'html'] as ExportFormat[])
          .filter(format => availableFormats.includes(format))
          .map(format => (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900">
                  {format === 'png' && (
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  )}
                  {format === 'svg' && (
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  )}
                  {format === 'html' && (
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium">{ChartExporter.getFormatDisplayName(format)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format === 'png' && 'High-quality raster image'}
                    {format === 'svg' && 'Scalable vector format'}
                    {format === 'html' && 'Interactive web page'}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}

        <DropdownMenuSeparator />

        {/* Data Formats */}
        <div className="px-3 py-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Data Export
          </h4>
        </div>

        {(['csv', 'json'] as ExportFormat[])
          .filter(format => availableFormats.includes(format))
          .map(format => (
            <DropdownMenuItem
              key={format}
              onClick={() => handleExport(format)}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-green-100 dark:bg-green-900">
                  {format === 'csv' && (
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {format === 'json' && (
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium">{ChartExporter.getFormatDisplayName(format)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format === 'csv' && `${data.numRows.toLocaleString()} rows`}
                    {format === 'json' && 'Structured data with metadata'}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}

        {/* Error display */}
        {exportState.error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-red-600 dark:text-red-400 text-xs">
              Export failed: {exportState.error}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChartExportButton;