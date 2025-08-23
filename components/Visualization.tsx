'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table as ArrowTable } from 'apache-arrow';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import PlotlyChart from './PlotlyChart';
import ChartTypeSelector, { QuickChartButtons } from './ChartTypeSelector';
import { ChartConfigSidebar } from './ChartConfigSidebar';
import ChartExportButton from './ChartExportButton';
import { 
  ChartConfig, 
  suggestChartConfig, 
  PlotlyTransformError 
} from '@/lib/plotlyTransform';
import { 
  ChartPerformanceAnalyzer, 
  ChartPerformanceAnalysis 
} from '@/lib/chartPerformanceUtils';
import { getTables } from '@/lib/duckdbManager';
import { executeReadQuery } from '@/lib/durableOperations';

interface VisualizationProps {
  data?: ArrowTable | null;
  theme?: 'light' | 'dark';
  className?: string;
  useWebGL?: boolean;
  initialTable?: string;
  chartRowLimit?: number;
  persistedState?: {
    selectedTable?: string;
    chartConfig?: any;
    chartType?: string;
  };
  onStateChange?: (state: any) => void;
}

export const Visualization: React.FC<VisualizationProps> = ({
  data,
  theme = 'dark',
  className = '',
  useWebGL = false,
  initialTable,
  chartRowLimit = 10000,
  persistedState,
  onStateChange,
}) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig>(
    persistedState?.chartConfig || {
      type: 'scatter',
      title: 'Query Results',
      showLegend: true,
      useWebGL: useWebGL,
    }
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [chartError, setChartError] = useState<PlotlyTransformError | null>(null);
  const [isChartReady, setIsChartReady] = useState<boolean>(false);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<ChartPerformanceAnalysis | null>(null);
  const chartRef = React.useRef<any>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | undefined>(
    persistedState?.selectedTable || initialTable
  );
  const [tableData, setTableData] = useState<ArrowTable | null>(null);

  const chartData = tableData || data;

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tableList = await getTables();
        setTables(tableList);
        if (tableList.length > 0 && !selectedTable) {
          setSelectedTable(tableList[0]);
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      }
    };
    fetchTables();
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      const fetchTableData = async () => {
        try {
          const result = await executeReadQuery(`SELECT * FROM "${selectedTable}" LIMIT ${chartRowLimit}`);
          setTableData(result as ArrowTable);
        } catch (error) {
          console.error(`Failed to fetch data for table ${selectedTable}:`, error);
          setChartError(new PlotlyTransformError(`Failed to load data for table: ${selectedTable}`, 'INVALID_DATA'));
          setTableData(null);
        }
      };
      fetchTableData();
    }
  }, [selectedTable, chartRowLimit]);

  React.useEffect(() => {
    setChartConfig(prev => ({ ...prev, useWebGL }));
  }, [useWebGL]);

  // Persist state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        selectedTable,
        chartConfig,
        chartType: chartConfig.type
      });
    }
  }, [selectedTable, chartConfig, onStateChange]);

  const availableColumns = useMemo(() => {
    return chartData ? chartData.schema.fields.map(field => field.name) : [];
  }, [chartData]);

  const chartSuggestions = useMemo(() => {
    return chartData ? suggestChartConfig(chartData) : [];
  }, [chartData]);

  React.useEffect(() => {
    if (chartData && chartSuggestions.length > 0 && !chartConfig.xColumn) {
      const firstSuggestion = chartSuggestions[0];
      const optimizedConfig = ChartPerformanceAnalyzer.optimizeChartConfig(chartData, firstSuggestion);
      
      setChartConfig(prev => ({
        ...prev,
        ...optimizedConfig,
        title: optimizedConfig.title || `Chart of ${chartData.numRows.toLocaleString()} rows`
      }));
    }
  }, [chartData, chartSuggestions, chartConfig.xColumn]);

  React.useEffect(() => {
    if (chartData && chartData.numRows > 0 && chartConfig.xColumn) {
      const analysis = ChartPerformanceAnalyzer.analyzePerformance(chartData, chartConfig);
      setPerformanceAnalysis(analysis);
    } else {
      setPerformanceAnalysis(null);
    }
  }, [chartData, chartConfig]);

  const handleChartTypeChange = useCallback((type: ChartConfig['type']) => {
    const suggestion = chartSuggestions.find(s => s.type === type);
    
    if (suggestion) {
      setChartConfig({
        ...chartConfig,
        ...suggestion
      });
    } else {
      setChartConfig({
        ...chartConfig,
        type,
        xColumn: type === 'histogram' && availableColumns.length > 0 ? availableColumns[0] : chartConfig.xColumn,
        yColumn: type === 'histogram' ? undefined : chartConfig.yColumn
      });
    }
    setChartError(null);
  }, [chartConfig, chartSuggestions, availableColumns]);

  const handleConfigChange = useCallback((newConfig: ChartConfig) => {
    setChartConfig(newConfig);
    setChartError(null);
  }, []);

  const handleChartError = useCallback((error: PlotlyTransformError) => {
    setChartError(error);
    setIsChartReady(false);
  }, []);

  const handleChartReady = useCallback(() => {
    setChartError(null);
    setIsChartReady(true);
  }, []);

  const applyQuickSuggestion = useCallback((suggestion: ChartConfig) => {
    setChartConfig({
      ...chartConfig,
      ...suggestion
    });
    setChartError(null);
  }, [chartConfig]);

  if (!chartData || chartData.numRows === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-background border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Data to Visualize</h3>
            <p>Run a SQL query or select a table to generate charts.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Mobile: Chart config inline on top */}
      <div className="block lg:hidden mb-6">
        <ChartConfigSidebar 
          isCollapsed={false} 
          onCollapseToggle={() => {}} 
          config={chartConfig}
          onConfigChange={handleConfigChange}
          data={chartData}
          tables={tables}
          selectedTable={selectedTable}
          onTableSelect={setSelectedTable}
          isMobile={true}
        />
      </div>
      
      <div className="flex">
        <div className="flex-grow space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-lg font-semibold">Data Visualization</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {chartData.numRows.toLocaleString()} rows × {availableColumns.length} columns
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <ChartExportButton
                  plotRef={chartRef}
                  data={chartData}
                  config={chartConfig}
                  disabled={!isChartReady || !chartData}
                />
              </div>
            </div>

            <QuickChartButtons
              onTypeChange={handleChartTypeChange}
              availableColumns={availableColumns}
              disabled={!chartData}
            />

            <Separator />

            {chartSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Suggested Charts:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {chartSuggestions.slice(0, 4).map((suggestion, index) => (
                    <Button
                      key={`${suggestion.type}-${index}`}
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickSuggestion(suggestion)}
                      className="text-xs"
                    >
                      {suggestion.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {chartError && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Select X and Y Columns
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    Choose columns from the chart configuration panel to create your visualization.
                  </p>
                  {chartError.type === 'INVALID_DATA' && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                      Try selecting different columns or chart type from the configuration sidebar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {performanceAnalysis && performanceAnalysis.recommendations.length > 0 && (
            <div className="space-y-3">
              {performanceAnalysis.recommendations
                .filter(rec => rec.type === 'error')
                .map((rec, index) => (
                  <div key={`error-${index}`} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" 
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">Performance Issue</h4>
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{rec.message}</p>
                        {rec.action && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                            <strong>Recommended action:</strong> {rec.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {performanceAnalysis.recommendations
                .filter(rec => rec.type === 'warning')
                .map((rec, index) => (
                  <div key={`warning-${index}`} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" 
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Performance Warning</h4>
                        <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">{rec.message}</p>
                        {rec.action && (
                          <p className="text-xs text-amber-500 dark:text-amber-400 mt-2">
                            <strong>Suggestion:</strong> {rec.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {performanceAnalysis.recommendations
                .filter(rec => rec.type === 'recommendation')
                .slice(0, 2) // Limit to avoid UI clutter
                .map((rec, index) => (
                  <div key={`recommendation-${index}`} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" 
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Performance Tip</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">{rec.message}</p>
                        {rec.action && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                            <strong>Tip:</strong> {rec.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <PlotlyChart
            ref={chartRef}
            data={chartData}
            config={chartConfig}
            theme={theme}
            onError={handleChartError}
            onChartReady={handleChartReady}
          />

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <strong>Chart:</strong> {chartConfig.type}
                {chartConfig.xColumn && (
                  <>
                    {' • '}
                    <strong>X:</strong> {chartConfig.xColumn}
                  </>
                )}
                {chartConfig.yColumn && (
                  <>
                    {' • '}
                    <strong>Y:</strong> {chartConfig.yColumn}
                  </>
                )}
              </div>
              {chartConfig.useWebGL && (
                <span className="text-green-600 dark:text-green-400 text-xs">
                  WebGL Enabled
                </span>
              )}
            </div>
          </div>
        </div>
      
        {/* Desktop: Chart config sidebar on right */}
        <div className="hidden lg:block">
          <ChartConfigSidebar 
            isCollapsed={isSidebarCollapsed} 
            onCollapseToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            config={chartConfig}
            onConfigChange={handleConfigChange}
            data={chartData}
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={setSelectedTable}
          />
        </div>
      </div>
    </div>
  );
};
