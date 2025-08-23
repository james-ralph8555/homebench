import { Table as ArrowTable } from 'apache-arrow';
import { ChartConfig } from './plotlyTransform';

export interface PerformanceRecommendation {
  type: 'warning' | 'recommendation' | 'error';
  message: string;
  action?: string;
  technicalDetails?: string;
}

export interface ChartPerformanceAnalysis {
  recommendations: PerformanceRecommendation[];
  estimatedRenderTime: number;
  memoryUsage: number;
  shouldUseWebGL: boolean;
  shouldSample: boolean;
  maxRecommendedRows: number;
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  FAST_RENDER_MAX_ROWS: 1000,
  WEBGL_RECOMMENDED_ROWS: 10000,
  MEMORY_WARNING_ROWS: 50000,
  MAX_SAFE_ROWS: 100000,
  SAMPLING_THRESHOLD_ROWS: 250000,
  ESTIMATED_BYTES_PER_POINT: 64, // Conservative estimate for Plotly data point
  MAX_BROWSER_MEMORY_MB: 512 // Conservative browser memory limit
};

export class ChartPerformanceAnalyzer {
  /**
   * Analyzes data and chart config to provide performance recommendations
   */
  static analyzePerformance(data: ArrowTable, config: ChartConfig): ChartPerformanceAnalysis {
    const rowCount = data.numRows;
    const columnCount = data.schema.fields.length;
    const recommendations: PerformanceRecommendation[] = [];
    
    // Estimate memory usage
    const estimatedMemoryMB = this.estimateChartMemoryUsage(data, config);
    
    // Estimate render time (simplified model)
    const estimatedRenderTime = this.estimateRenderTime(rowCount, config);
    
    // Determine if WebGL should be used
    const shouldUseWebGL = this.shouldUseWebGL(rowCount, config);
    
    // Determine if data should be sampled
    const shouldSample = this.shouldSampleData(rowCount, config);
    
    // Generate recommendations
    if (rowCount > PERFORMANCE_THRESHOLDS.WEBGL_RECOMMENDED_ROWS && !config.useWebGL) {
      recommendations.push({
        type: 'recommendation',
        message: `Large dataset detected (${rowCount.toLocaleString()} rows)`,
        action: 'Enable WebGL rendering for better performance',
        technicalDetails: 'WebGL uses GPU acceleration for rendering large point clouds'
      });
    }
    
    if (rowCount > PERFORMANCE_THRESHOLDS.MEMORY_WARNING_ROWS) {
      recommendations.push({
        type: 'warning',
        message: `Memory usage may be high (estimated ${estimatedMemoryMB.toFixed(1)}MB)`,
        action: 'Consider filtering data or using data aggregation',
        technicalDetails: `Each data point uses approximately ${PERFORMANCE_THRESHOLDS.ESTIMATED_BYTES_PER_POINT} bytes`
      });
    }
    
    if (rowCount > PERFORMANCE_THRESHOLDS.MAX_SAFE_ROWS) {
      recommendations.push({
        type: 'error',
        message: `Dataset too large for optimal browser performance (${rowCount.toLocaleString()} rows)`,
        action: 'Use SQL LIMIT clause or data sampling to reduce dataset size',
        technicalDetails: `Recommended maximum: ${PERFORMANCE_THRESHOLDS.MAX_SAFE_ROWS.toLocaleString()} rows`
      });
    }
    
    if (shouldSample) {
      const sampleSize = this.getRecommendedSampleSize(rowCount);
      recommendations.push({
        type: 'recommendation',
        message: `Consider sampling data for better performance`,
        action: `Sample to ~${sampleSize.toLocaleString()} rows using SQL (ORDER BY RANDOM() LIMIT ${sampleSize})`,
        technicalDetails: 'Sampling maintains statistical properties while improving performance'
      });
    }
    
    // Chart-specific recommendations
    if (config.type === 'scatter' && rowCount > 50000) {
      recommendations.push({
        type: 'recommendation',
        message: 'Scatter plots with many points may be hard to interpret',
        action: 'Consider using density plots, hexbin plots, or data aggregation',
        technicalDetails: 'Alternative: Use histogram2d or contour plots for dense scatter data'
      });
    }
    
    if (config.type === 'pie' && rowCount > 20) {
      recommendations.push({
        type: 'warning',
        message: 'Pie charts work best with fewer categories',
        action: 'Group smaller categories into "Others" or use a bar chart instead',
        technicalDetails: 'Pie charts become unreadable with too many slices'
      });
    }
    
    return {
      recommendations,
      estimatedRenderTime,
      memoryUsage: estimatedMemoryMB,
      shouldUseWebGL,
      shouldSample,
      maxRecommendedRows: PERFORMANCE_THRESHOLDS.MAX_SAFE_ROWS
    };
  }
  
  /**
   * Estimates memory usage for chart rendering
   */
  static estimateChartMemoryUsage(data: ArrowTable, config: ChartConfig): number {
    const rowCount = data.numRows;
    const baseMemoryPerPoint = PERFORMANCE_THRESHOLDS.ESTIMATED_BYTES_PER_POINT;
    
    let multiplier = 1;
    
    // Different chart types have different memory overhead
    switch (config.type) {
      case 'scatter':
        multiplier = config.colorColumn || config.sizeColumn ? 1.5 : 1.0;
        break;
      case 'line':
        multiplier = 0.8; // Lines are more memory efficient
        break;
      case 'bar':
        multiplier = 1.2;
        break;
      case 'pie':
        multiplier = 0.5; // Pies typically have fewer points
        break;
      case 'histogram':
        multiplier = 0.3; // Histograms create binned data
        break;
    }
    
    return (rowCount * baseMemoryPerPoint * multiplier) / (1024 * 1024); // Convert to MB
  }
  
  /**
   * Estimates render time in milliseconds
   */
  static estimateRenderTime(rowCount: number, config: ChartConfig): number {
    // Base render time per 1000 points (milliseconds)
    const baseTimePerK = config.useWebGL ? 10 : 50;
    
    let multiplier = 1;
    
    // Chart type affects render complexity
    switch (config.type) {
      case 'scatter':
        multiplier = config.colorColumn ? 1.3 : 1.0;
        break;
      case 'line':
        multiplier = 0.7;
        break;
      case 'bar':
        multiplier = 1.1;
        break;
      case 'pie':
        multiplier = 0.8;
        break;
      case 'histogram':
        multiplier = 0.6;
        break;
    }
    
    return Math.max(100, (rowCount / 1000) * baseTimePerK * multiplier);
  }
  
  /**
   * Determines if WebGL should be recommended
   */
  static shouldUseWebGL(rowCount: number, config: ChartConfig): boolean {
    if (config.type === 'pie' || config.type === 'bar') {
      return false; // WebGL not beneficial for these chart types
    }
    
    return rowCount > PERFORMANCE_THRESHOLDS.WEBGL_RECOMMENDED_ROWS;
  }
  
  /**
   * Determines if data should be sampled
   */
  static shouldSampleData(rowCount: number, config: ChartConfig): boolean {
    return rowCount > PERFORMANCE_THRESHOLDS.SAMPLING_THRESHOLD_ROWS;
  }
  
  /**
   * Gets recommended sample size
   */
  static getRecommendedSampleSize(rowCount: number): number {
    if (rowCount <= PERFORMANCE_THRESHOLDS.MAX_SAFE_ROWS) {
      return rowCount;
    }
    
    // Progressive sampling: larger datasets get proportionally smaller samples
    if (rowCount > 1000000) return 10000;
    if (rowCount > 500000) return 25000;
    if (rowCount > 250000) return 50000;
    
    return Math.min(rowCount, PERFORMANCE_THRESHOLDS.MAX_SAFE_ROWS);
  }
  
  /**
   * Optimizes chart configuration for performance
   */
  static optimizeChartConfig(data: ArrowTable, config: ChartConfig): ChartConfig {
    const rowCount = data.numRows;
    const optimizedConfig = { ...config };
    
    // Auto-enable WebGL for large datasets
    if (this.shouldUseWebGL(rowCount, config) && !config.useWebGL) {
      optimizedConfig.useWebGL = true;
    }
    
    // Suggest title optimization for large datasets
    if (!config.title && rowCount > 10000) {
      optimizedConfig.title = `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart (${rowCount.toLocaleString()} rows)`;
    }
    
    return optimizedConfig;
  }
  
  /**
   * Generates SQL sampling query for performance optimization
   */
  static generateSamplingQuery(originalQuery: string, sampleSize: number): string {
    // Simple approach: wrap the original query and add sampling
    const trimmedQuery = originalQuery.trim().replace(/;$/, '');
    
    return `
WITH original_data AS (
  ${trimmedQuery}
)
SELECT * FROM original_data 
ORDER BY RANDOM() 
LIMIT ${sampleSize}
-- Original query returned more rows, sampled for performance
    `.trim();
  }
  
  /**
   * Validates if browser can handle the chart
   */
  static validateBrowserCapability(data: ArrowTable, config: ChartConfig): PerformanceRecommendation[] {
    const warnings: PerformanceRecommendation[] = [];
    const rowCount = data.numRows;
    const estimatedMemory = this.estimateChartMemoryUsage(data, config);
    
    // Check memory constraints
    if (estimatedMemory > PERFORMANCE_THRESHOLDS.MAX_BROWSER_MEMORY_MB) {
      warnings.push({
        type: 'error',
        message: `Chart may exceed browser memory limits (${estimatedMemory.toFixed(1)}MB estimated)`,
        action: 'Reduce data size or use server-side aggregation',
        technicalDetails: `Browser may freeze or crash with datasets this large`
      });
    }
    
    // Check WebGL context limits
    if (config.useWebGL && rowCount > 500000) {
      warnings.push({
        type: 'warning',
        message: 'Very large WebGL charts may hit browser limits',
        action: 'Monitor for rendering failures and consider data reduction',
        technicalDetails: 'Browsers limit WebGL context creation and memory'
      });
    }
    
    return warnings;
  }
}