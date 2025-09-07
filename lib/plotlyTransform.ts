import { Table as ArrowTable } from 'apache-arrow';
import { PlotData, Layout, Config } from 'plotly.js';
import { logger } from '@/lib/logger';
import type { DataRow, VisualizationDataset, BaseChartConfig } from './types';
import { toErrorMessage } from './utils';

export interface ChartConfig extends BaseChartConfig {
  type: 'scatter' | 'bar' | 'line' | 'pie' | 'histogram';
  xColumn?: string;
  yColumn?: string;
  colorColumn?: string;
  sizeColumn?: string;
  xTitle?: string;
  yTitle?: string;
  nbins?: number;
}

export interface PlotlyData {
  data: Partial<PlotData>[];
  layout: Partial<Layout>;
  config?: Partial<Config>;
}

export interface TransformError extends Error {
  type: 'INVALID_DATA' | 'UNSUPPORTED_TYPE' | 'TRANSFORMATION_ERROR';
  details?: string;
}

export class PlotlyTransformError extends Error implements TransformError {
  type: TransformError['type'];
  details?: string;

  constructor(message: string, type: TransformError['type'], details?: string) {
    super(message);
    this.name = 'PlotlyTransformError';
    this.type = type;
    this.details = details;
  }
}

// Data type detection utilities
export const detectColumnTypes = (arrowTable: ArrowTable): Record<string, 'numeric' | 'string' | 'datetime' | 'boolean'> => {
  const columnTypes: Record<string, 'numeric' | 'string' | 'datetime' | 'boolean'> = {};
  
  for (const field of arrowTable.schema.fields) {
    const typeString = field.type.toString();
    
    if (typeString.includes('int') || 
        typeString.includes('float') || 
        typeString.includes('double') || 
        typeString.includes('decimal')) {
      columnTypes[field.name] = 'numeric';
    } else if (typeString.includes('timestamp') || 
               typeString.includes('date')) {
      columnTypes[field.name] = 'datetime';
    } else if (typeString.includes('bool')) {
      columnTypes[field.name] = 'boolean';
    } else {
      columnTypes[field.name] = 'string';
    }
  }
  
  return columnTypes;
};

// Smart chart configuration based on data types
export const suggestChartConfig = (arrowTable: ArrowTable): ChartConfig[] => {
  const columnTypes = detectColumnTypes(arrowTable);
  const columns = Object.keys(columnTypes);
  const numericColumns = columns.filter(col => columnTypes[col] === 'numeric');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  const datetimeColumns = columns.filter(col => columnTypes[col] === 'datetime');
  
  const suggestions: ChartConfig[] = [];
  
  // If we have 2+ numeric columns, suggest scatter plot
  if (numericColumns.length >= 2) {
    suggestions.push({
      type: 'scatter',
      xColumn: numericColumns[0],
      yColumn: numericColumns[1],
      title: `${numericColumns[1]} vs ${numericColumns[0]}`,
      useWebGL: arrowTable.numRows > 10000
    });
  }
  
  // If we have datetime + numeric, suggest line chart
  if (datetimeColumns.length > 0 && numericColumns.length > 0) {
    suggestions.push({
      type: 'line',
      xColumn: datetimeColumns[0],
      yColumn: numericColumns[0],
      title: `${numericColumns[0]} over time`,
      useWebGL: arrowTable.numRows > 10000
    });
  }
  
  // If we have categorical + numeric, suggest bar chart
  if (stringColumns.length > 0 && numericColumns.length > 0) {
    suggestions.push({
      type: 'bar',
      xColumn: stringColumns[0],
      yColumn: numericColumns[0],
      title: `${numericColumns[0]} by ${stringColumns[0]}`
    });
  }
  
  // Always suggest histogram for numeric columns
  if (numericColumns.length > 0) {
    suggestions.push({
      type: 'histogram',
      xColumn: numericColumns[0],
      title: `Distribution of ${numericColumns[0]}`
    });
  }
  
  return suggestions;
};

// Core transformation function with performance optimization
export const transformArrowToPlotly = (
  arrowTable: ArrowTable, 
  config: ChartConfig
): PlotlyData => {
  try {
    if (!arrowTable || arrowTable.numRows === 0) {
      throw new PlotlyTransformError('No data available for charting', 'INVALID_DATA');
    }

    // Convert Arrow table to JS objects (step 1 of transformation pipeline)
    const dataObjects: DataRow[] = arrowTable.toArray().map(row => row.toJSON() as DataRow);
    
    // Performance check for large datasets
    const rowCount = dataObjects.length;
    if (rowCount > 100000) {
      logger.warn(`Large dataset detected (${rowCount} rows). Consider sampling or aggregation for better performance.`);
    }
    
    // Generate Plotly data based on chart type
    const plotlyData: PlotlyData = {
      data: [],
      layout: {
        title: config.title || 'Query Results',
        showlegend: config.showLegend !== false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
          color: '#374151' // Default to dark gray, will be overridden by theme
        },
        margin: { l: 60, r: 40, t: 80, b: 60 }
      },
      config: {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart',
          height: 600,
          width: 800,
          scale: 2
        }
      }
    };

    // Transform data based on chart type
    switch (config.type) {
      case 'scatter':
        plotlyData.data = createScatterTrace(dataObjects, config);
        break;
      case 'line':
        plotlyData.data = createLineTrace(dataObjects, config);
        break;
      case 'bar':
        plotlyData.data = createBarTrace(dataObjects, config);
        break;
      case 'pie':
        plotlyData.data = createPieTrace(dataObjects, config);
        break;
      case 'histogram':
        plotlyData.data = createHistogramTrace(dataObjects, config);
        break;
      default:
        throw new PlotlyTransformError(`Unsupported chart type: ${config.type}`, 'UNSUPPORTED_TYPE');
    }

    // Apply axis labels
    if (config.xColumn && config.xTitle !== undefined) {
      plotlyData.layout.xaxis = { title: config.xTitle || config.xColumn };
    }
    if (config.yColumn && config.yTitle !== undefined) {
      plotlyData.layout.yaxis = { title: config.yTitle || config.yColumn };
    }

    return plotlyData;
    
  } catch (error: unknown) {
    if (error instanceof PlotlyTransformError) {
      throw error;
    }
    throw new PlotlyTransformError(
      `Data transformation failed: ${toErrorMessage(error)}`,
      'TRANSFORMATION_ERROR',
      error instanceof Error ? error.stack : undefined
    );
  }
};

// Individual trace creation functions (optimized single-loop approach)
const createScatterTrace = (data: any[], config: ChartConfig): Partial<PlotData>[] => {
  if (!config.xColumn || !config.yColumn) {
    throw new PlotlyTransformError('Scatter plot requires both X and Y columns', 'INVALID_DATA');
  }

  const x: any[] = [];
  const y: any[] = [];
  const colors: any[] = [];
  const sizes: any[] = [];
  const text: string[] = [];

  // Single loop optimization for performance
  for (const row of data) {
    x.push(row[config.xColumn]);
    y.push(row[config.yColumn]);
    
    if (config.colorColumn) {
      colors.push(row[config.colorColumn]);
    }
    if (config.sizeColumn) {
      sizes.push(row[config.sizeColumn]);
    }
    
    // Create hover text
    text.push(`${config.xColumn}: ${row[config.xColumn]}<br>${config.yColumn}: ${row[config.yColumn]}`);
  }

  const trace: Partial<PlotData> = {
    type: config.useWebGL ? 'scattergl' : 'scatter',
    mode: 'markers',
    x,
    y,
    text,
    hovertemplate: '%{text}<extra></extra>',
    name: `${config.yColumn} vs ${config.xColumn}`,
    marker: {
      size: config.sizeColumn ? sizes : 6,
      color: config.colorColumn ? colors : undefined,
      colorscale: config.colorColumn ? 'Viridis' : undefined,
      showscale: !!config.colorColumn,
      colorbar: config.colorColumn ? { title: { text: config.colorColumn } } : undefined
    }
  };

  return [trace];
};

const createLineTrace = (data: any[], config: ChartConfig): Partial<PlotData>[] => {
  if (!config.xColumn || !config.yColumn) {
    throw new PlotlyTransformError('Line chart requires both X and Y columns', 'INVALID_DATA');
  }

  const x: any[] = [];
  const y: any[] = [];

  for (const row of data) {
    x.push(row[config.xColumn]);
    y.push(row[config.yColumn]);
  }

  const trace: Partial<PlotData> = {
    type: config.useWebGL ? 'scattergl' : 'scatter',
    mode: 'lines+markers',
    x,
    y,
    name: config.yColumn,
    line: { shape: 'linear' },
    marker: { size: 4 }
  };

  return [trace];
};

const createBarTrace = (data: any[], config: ChartConfig): Partial<PlotData>[] => {
  if (!config.xColumn || !config.yColumn) {
    throw new PlotlyTransformError('Bar chart requires both X and Y columns', 'INVALID_DATA');
  }

  // Aggregate data if we have multiple rows for same category
  const aggregated: Record<string, number> = {};
  
  for (const row of data) {
    const category = String(row[config.xColumn]);
    const value = Number(row[config.yColumn]) || 0;
    aggregated[category] = (aggregated[category] || 0) + value;
  }

  const x = Object.keys(aggregated);
  const y = Object.values(aggregated);

  const trace: Partial<PlotData> = {
    type: 'bar',
    x,
    y,
    name: config.yColumn,
    marker: {
      color: 'rgba(55, 128, 191, 0.7)',
      line: {
        color: 'rgba(55, 128, 191, 1.0)',
        width: 1
      }
    }
  };

  return [trace];
};

const createPieTrace = (data: any[], config: ChartConfig): Partial<PlotData>[] => {
  if (!config.xColumn || !config.yColumn) {
    throw new PlotlyTransformError('Pie chart requires both labels and values columns', 'INVALID_DATA');
  }

  const labels: string[] = [];
  const values: number[] = [];

  for (const row of data) {
    labels.push(String(row[config.xColumn]));
    values.push(Number(row[config.yColumn]) || 0);
  }

  const trace: Partial<PlotData> = {
    type: 'pie',
    labels,
    values,
    textinfo: 'label+percent',
    textposition: 'outside',
    automargin: true
  };

  return [trace];
};

const createHistogramTrace = (data: any[], config: ChartConfig): Partial<PlotData>[] => {
  if (!config.xColumn) {
    throw new PlotlyTransformError('Histogram requires a column to analyze', 'INVALID_DATA');
  }

  const x: number[] = [];

  for (const row of data) {
    const value = Number(row[config.xColumn]);
    if (!isNaN(value)) {
      x.push(value);
    }
  }

  if (x.length === 0) {
    throw new PlotlyTransformError('No numeric values found for histogram', 'INVALID_DATA');
  }

  const trace: Partial<PlotData> = {
    type: 'histogram',
    x,
    name: config.xColumn,
    nbinsx: config.nbins,
    marker: {
      color: 'rgba(55, 128, 191, 0.7)',
      line: {
        color: 'rgba(55, 128, 191, 1.0)',
        width: 1
      }
    }
  } as any;

  return [trace];
};

// Export utility functions
export const applyThemeToLayout = (layout: Partial<Layout>, theme: 'light' | 'dark'): Partial<Layout> => {
  if (theme === 'dark') {
    return {
      ...layout,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#f3f4f6' },
      xaxis: { 
        ...layout.xaxis, 
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        tickcolor: '#6b7280',
        linecolor: '#6b7280'
      },
      yaxis: { 
        ...layout.yaxis, 
        gridcolor: '#374151',
        zerolinecolor: '#4b5563',
        tickcolor: '#6b7280',
        linecolor: '#6b7280'
      }
    };
  }
  
  return {
    ...layout,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#374151' },
    xaxis: { 
      ...layout.xaxis, 
      gridcolor: '#e5e7eb',
      zerolinecolor: '#d1d5db',
      tickcolor: '#9ca3af',
      linecolor: '#9ca3af'
    },
    yaxis: { 
      ...layout.yaxis, 
      gridcolor: '#e5e7eb',
      zerolinecolor: '#d1d5db',
      tickcolor: '#9ca3af',
      linecolor: '#9ca3af'
    }
  };
};
