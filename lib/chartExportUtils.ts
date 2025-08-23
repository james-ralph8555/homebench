import { ChartConfig, PlotlyData } from './plotlyTransform';
import { Table as ArrowTable } from 'apache-arrow';

export type ExportFormat = 'png' | 'svg' | 'html' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  width?: number;
  height?: number;
  scale?: number;
  quality?: number; // For JPEG/PNG (0-1)
}

export interface ChartExportResult {
  success: boolean;
  error?: string;
  filename?: string;
  data?: string | Blob;
}

/**
 * Chart export utilities for HomeBench
 * Handles exporting charts to various formats while maintaining privacy
 */
export class ChartExporter {
  
  /**
   * Exports a chart using the Plotly.js download API
   * This happens entirely client-side, no data is sent to servers
   */
  static async exportChart(
    plotElement: any, // Plotly plot element
    config: ChartConfig,
    options: ExportOptions
  ): Promise<ChartExportResult> {
    try {
      if (!plotElement) {
        return { success: false, error: 'Chart element not found' };
      }

      const filename = options.filename || this.generateFilename(config, options.format);
      
      switch (options.format) {
        case 'png':
        case 'svg':
          return await this.exportImage(plotElement, options, filename);
        case 'html':
          return await this.exportHTML(plotElement, config, filename);
        default:
          return { success: false, error: `Unsupported export format: ${options.format}` };
      }
    } catch (error: any) {
      return { success: false, error: `Export failed: ${error.message}` };
    }
  }

  /**
   * Exports chart data (not the visual chart) to CSV or JSON
   */
  static async exportChartData(
    data: ArrowTable,
    config: ChartConfig,
    options: ExportOptions
  ): Promise<ChartExportResult> {
    try {
      const filename = options.filename || this.generateFilename(config, options.format);
      
      switch (options.format) {
        case 'csv':
          return this.exportDataAsCSV(data, config, filename);
        case 'json':
          return this.exportDataAsJSON(data, config, filename);
        default:
          return { success: false, error: `Unsupported data format: ${options.format}` };
      }
    } catch (error: any) {
      return { success: false, error: `Data export failed: ${error.message}` };
    }
  }

  /**
   * Exports chart as PNG or SVG image
   */
  private static async exportImage(
    plotElement: any,
    options: ExportOptions,
    filename: string
  ): Promise<ChartExportResult> {
    try {
      // Use Plotly's toImage function which handles the export client-side
      const format = options.format as 'png' | 'svg';
      const imageOptions = {
        format,
        width: options.width || 800,
        height: options.height || 600,
        scale: options.scale || 2
      };

      // This requires the plotly.js-dist-min package
      const Plotly = await import('plotly.js-dist-min');
      
      if (format === 'svg') {
        const svgString = await Plotly.toImage(plotElement, { 
          ...imageOptions, 
          format: 'svg' 
        });
        this.downloadFile(svgString, filename, 'image/svg+xml');
      } else {
        const imageDataUrl = await Plotly.toImage(plotElement, imageOptions);
        this.downloadDataUrl(imageDataUrl, filename);
      }

      return { success: true, filename };
    } catch (error: any) {
      return { success: false, error: `Image export failed: ${error.message}` };
    }
  }

  /**
   * Exports chart as interactive HTML
   */
  private static async exportHTML(
    plotElement: any,
    config: ChartConfig,
    filename: string
  ): Promise<ChartExportResult> {
    try {
      // Get the plot data and layout from the element
      const plotData = plotElement.data;
      const plotLayout = plotElement.layout;
      
      // Generate HTML with embedded Plotly
      const htmlContent = this.generateHTMLContent(plotData, plotLayout, config);
      
      // Create and download the HTML file
      this.downloadFile(htmlContent, filename, 'text/html');
      
      return { success: true, filename };
    } catch (error: any) {
      return { success: false, error: `HTML export failed: ${error.message}` };
    }
  }

  /**
   * Exports the underlying data as CSV
   */
  private static exportDataAsCSV(
    data: ArrowTable,
    config: ChartConfig,
    filename: string
  ): ChartExportResult {
    try {
      // Convert Arrow table to objects
      const rows = data.toArray().map(row => row.toJSON());
      
      if (rows.length === 0) {
        return { success: false, error: 'No data to export' };
      }

      // Create CSV content
      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape values that contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      this.downloadFile(csvContent, filename, 'text/csv');
      
      return { success: true, filename };
    } catch (error: any) {
      return { success: false, error: `CSV export failed: ${error.message}` };
    }
  }

  /**
   * Exports the underlying data as JSON
   */
  private static exportDataAsJSON(
    data: ArrowTable,
    config: ChartConfig,
    filename: string
  ): ChartExportResult {
    try {
      // Convert Arrow table to objects
      const rows = data.toArray().map(row => row.toJSON());
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          chartType: config.type,
          rowCount: data.numRows,
          columns: data.schema.fields.map(field => ({
            name: field.name,
            type: field.type.toString()
          }))
        },
        data: rows
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      this.downloadFile(jsonContent, filename, 'application/json');
      
      return { success: true, filename };
    } catch (error: any) {
      return { success: false, error: `JSON export failed: ${error.message}` };
    }
  }

  /**
   * Generates HTML content with embedded Plotly chart
   */
  private static generateHTMLContent(
    plotData: any[],
    plotLayout: any,
    config: ChartConfig
  ): string {
    const title = config.title || 'HomeBench Chart';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .chart-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
            margin: 0 auto;
            max-width: 1200px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #333;
            margin: 0 0 10px 0;
        }
        .header p {
            color: #666;
            margin: 0;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="header">
            <h1>${title}</h1>
            <p>Generated by HomeBench on ${new Date().toLocaleDateString()}</p>
        </div>
        <div id="plotly-chart" style="width:100%;height:600px;"></div>
        <div class="footer">
            <p>Interactive chart powered by Plotly.js • <a href="https://github.com/anthropics/claude-code" target="_blank">HomeBench</a></p>
        </div>
    </div>
    
    <script>
        const plotData = ${JSON.stringify(plotData)};
        const plotLayout = ${JSON.stringify({ ...plotLayout, autosize: true })};
        const plotConfig = { responsive: true, displayModeBar: true };
        
        Plotly.newPlot('plotly-chart', plotData, plotLayout, plotConfig);
        
        // Handle window resize
        window.addEventListener('resize', function() {
            Plotly.Plots.resize('plotly-chart');
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generates a filename based on chart config and format
   */
  private static generateFilename(config: ChartConfig, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const chartType = config.type;
    const title = config.title ? 
      config.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : 
      'chart';
    
    return `homebench-${title}-${chartType}-${timestamp}.${format}`;
  }

  /**
   * Downloads a file using the browser's download API
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Downloads a data URL as a file
   */
  private static downloadDataUrl(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Gets available export formats based on chart type and browser capabilities
   */
  static getAvailableFormats(config: ChartConfig): ExportFormat[] {
    const formats: ExportFormat[] = ['png', 'svg', 'html'];
    
    // Data formats are always available
    formats.push('csv', 'json');
    
    return formats;
  }

  /**
   * Gets the display name for an export format
   */
  static getFormatDisplayName(format: ExportFormat): string {
    switch (format) {
      case 'png': return 'PNG Image';
      case 'svg': return 'SVG Vector';
      case 'html': return 'Interactive HTML';
      case 'csv': return 'CSV Data';
      case 'json': return 'JSON Data';
      default: return format;
    }
  }

  /**
   * Gets the recommended format based on use case
   */
  static getRecommendedFormat(useCase: 'presentation' | 'web' | 'print' | 'data'): ExportFormat {
    switch (useCase) {
      case 'presentation': return 'png';
      case 'web': return 'html';
      case 'print': return 'svg';
      case 'data': return 'csv';
      default: return 'png';
    }
  }
}