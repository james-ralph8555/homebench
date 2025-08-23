'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table as ArrowTable } from 'apache-arrow';
import { 
  ChartConfig, 
  transformArrowToPlotly, 
  PlotlyTransformError, 
  applyThemeToLayout,
  PlotlyData 
} from '@/lib/plotlyTransform';

// Dynamic import of Plotly to avoid SSR issues and reduce bundle size
const PlotlyComponent = React.lazy(() => 
  import('react-plotly.js').then(module => ({ default: module.default }))
);

interface PlotlyChartProps {
  data: ArrowTable;
  config: ChartConfig;
  theme?: 'light' | 'dark';
  className?: string;
  onError?: (error: PlotlyTransformError) => void;
  onChartReady?: () => void;
}

export const PlotlyChart = React.forwardRef<any, PlotlyChartProps>(({
  data,
  config,
  theme = 'dark',
  className = '',
  onError,
  onChartReady
}, ref) => {
  const [plotlyData, setPlotlyData] = useState<PlotlyData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<PlotlyTransformError | null>(null);
  const plotRef = useRef<any>(null);

  // Expose the plot ref through the forwarded ref
  React.useImperativeHandle(ref, () => ({
    plotly: plotRef.current
  }), []);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform data when inputs change
  useEffect(() => {
    const transformData = async () => {
      if (!data || data.numRows === 0) {
        setPlotlyData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Add a small delay for very large datasets to allow UI to update
        if (data.numRows > 50000) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const transformedData = transformArrowToPlotly(data, config);
        
        // Apply theme to layout
        const themedLayout = applyThemeToLayout(transformedData.layout, theme);
        
        setPlotlyData({
          ...transformedData,
          layout: themedLayout
        });
        
        setIsLoading(false);
        onChartReady?.();
        
      } catch (err: any) {
        const transformError = err instanceof PlotlyTransformError 
          ? err 
          : new PlotlyTransformError(
              `Chart rendering failed: ${err.message}`,
              'TRANSFORMATION_ERROR'
            );
            
        setError(transformError);
        setPlotlyData(null);
        setIsLoading(false);
        onError?.(transformError);
      }
    };

    transformData();
  }, [data, config, theme, onError, onChartReady]);

  // Handle plot resize when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (plotRef.current && plotRef.current.resizeHandler) {
        plotRef.current.resizeHandler();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle plot interaction events
  const handlePlotlyEvent = useCallback((eventName: string) => {
    return (eventData: any) => {
      console.log(`Plotly ${eventName}:`, eventData);
      // Could extend this to handle specific interactions
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-background border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}
        style={{ height: 500, minHeight: 400 }}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Generating chart...</p>
          {data && data.numRows > 10000 && (
            <p className="text-sm mt-2">
              Processing {data.numRows.toLocaleString()} data points
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-background border border-red-200 dark:border-red-700 rounded-lg ${className}`}
        style={{ height: 500, minHeight: 400 }}
      >
        <div className="text-center text-red-600 dark:text-red-400 p-6">
          <div className="mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Chart Error</h3>
          <p className="text-sm mb-2">{error.message}</p>
          {error.type === 'INVALID_DATA' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Try selecting different columns or chart type
            </p>
          )}
          {error.details && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Technical Details</summary>
              <pre className="mt-1 text-left bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                {error.details}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // No data state
  if (!plotlyData) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-background border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}
        style={{ height: 500, minHeight: 400 }}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p>No data available for charting</p>
          <p className="text-sm">Run a query to generate visualizations</p>
        </div>
      </div>
    );
  }

  // Success state - render chart
  return (
    <div 
      ref={containerRef}
      className={`bg-background border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: 400 }}
    >
      <React.Suspense fallback={
        <div className="flex items-center justify-center" style={{ height: 500 }}>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading chart library...</p>
          </div>
        </div>
      }>
        <PlotlyComponent
          ref={plotRef}
          data={plotlyData.data}
          layout={{
            ...plotlyData.layout,
            autosize: true,
            height: 500
          }}
          config={{
            ...plotlyData.config,
            responsive: true
          }}
          style={{ width: '100%', height: '500px' }}
          useResizeHandler={true}
          onInitialized={handlePlotlyEvent('initialized')}
          onUpdate={handlePlotlyEvent('update')}
          onClick={handlePlotlyEvent('click')}
          onHover={handlePlotlyEvent('hover')}
          onUnhover={handlePlotlyEvent('unhover')}
        />
      </React.Suspense>
      
      {/* Performance warning for large datasets */}
      {data && data.numRows > 50000 && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Large dataset ({data.numRows.toLocaleString()} rows) - chart performance may be affected
          </p>
        </div>
      )}
    </div>
  );
});

PlotlyChart.displayName = 'PlotlyChart';

export default PlotlyChart;