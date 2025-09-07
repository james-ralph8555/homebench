import { logger } from '@/lib/logger';
import type { 
  ExportFormat as TypedExportFormat, 
  ExportBuffer, 
  ExportResult,
  DuckDatabase,
  DuckConnection
} from './types';
import { toErrorMessage } from './utils';

export type ExportFormat = TypedExportFormat;

// Function to export a query result to a file
export async function exportQueryAsFile(
  db: DuckDatabase,
  sqlQuery: string,
  fileName: string,
  format: ExportFormat
): Promise<void> {
  const connection = await db.connect();
  try {
    // Generate a unique temporary filename
    const tempFileName = `export_${Date.now()}.${format.toLowerCase()}`;
    
    // Remove trailing semicolon from sqlQuery to avoid syntax errors
    const cleanQuery = sqlQuery.trim().replace(/;+$/, '');
    
    // Remove comments and check if the query contains non-SELECT statements
    // These cannot be wrapped in COPY() syntax
    const queryWithoutComments = cleanQuery.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const isNonSelectQuery = /\b(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER)\s+/i.test(queryWithoutComments);
    
    let copyCommand = '';
    if (isNonSelectQuery) {
      // For non-SELECT queries, execute them first, then we can't export their "results"
      // Instead, we should throw an error or handle this case differently
      throw new Error('Cannot export results of CREATE/INSERT/UPDATE/DELETE statements. Use SELECT queries to export data.');
    } else {
      // For SELECT queries, wrap in COPY
      switch (format) {
        case 'CSV':
          copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT CSV, HEADER);`;
          break;
        case 'PARQUET':
          copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT PARQUET);`;
          break;
        case 'JSON':
          copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT JSON, ARRAY true);`;
          break;
      }
    }
    
    try {
      await connection.query(copyCommand);
    } catch (queryError) {
      logger.error('Failed to execute export query:', queryError);
      throw new Error(`Export query failed: ${toErrorMessage(queryError)}`);
    }
    
    // Get the file buffer from DuckDB's virtual filesystem
    let buffer: ExportBuffer;
    try {
      buffer = await db.copyFileToBuffer(tempFileName);
    } catch (bufferError) {
      logger.error('Failed to retrieve export file buffer:', bufferError);
      throw new Error(`Failed to retrieve exported ${format} file: ${toErrorMessage(bufferError)}`);
    }
    
    // Validate buffer before proceeding
    if (!buffer || buffer.byteLength === 0) {
      throw new Error(`Export failed: Generated ${format} file is empty`);
    }
    
    logger.debug(`Export buffer info: size=${buffer.byteLength} bytes, format=${format}`);
    
    // Trigger browser download with appropriate MIME type
    const getMimeType = (format: ExportFormat) => {
      switch (format) {
        case 'CSV': return 'text/csv';
        case 'JSON': return 'application/json';
        case 'PARQUET': return 'application/octet-stream';
        default: return 'application/octet-stream';
      }
    };

    const blob = new Blob([buffer instanceof ArrayBuffer ? buffer : (buffer as any).buffer || buffer], { type: getMimeType(format) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Clean up the temporary file
    try {
      await db.dropFile(tempFileName);
    } catch (cleanupError) {
      // Log but don't fail the export for cleanup errors
      logger.warn('Failed to clean up temporary export file:', tempFileName, cleanupError);
    }
  } finally {
    await connection.close();
  }
}

// Function to download the entire database as a .duckdb file
export async function downloadDatabaseFile(db: DuckDatabase): Promise<void> {
  const connection = await db.connect();
  try {
    // Generate a unique temporary filename to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const tempDbFile = `download_export_${timestamp}_${randomId}.duckdb`;

    // Ensure any existing temp file is cleaned up first
    try {
      await db.dropFile(tempDbFile);
    } catch {}

    // Use VACUUM INTO to produce a full database snapshot as a valid .duckdb file
    await connection.query(`VACUUM INTO '${tempDbFile}';`);

    // Get the database file as a buffer
    const buffer = await db.copyFileToBuffer(tempDbFile);
    
    // Generate filename with timestamp
    const fileTimestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `homebench_database_${fileTimestamp}.duckdb`;
    
    // Trigger browser download
    const blob = new Blob([buffer instanceof ArrayBuffer ? buffer : (buffer as any).buffer || buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Clean up the temporary file
    try {
      await db.dropFile(tempDbFile);
    } catch (e) {
      logger.warn('Failed to clean up temporary file:', tempDbFile, e);
    }
  } finally {
    await connection.close();
  }
}

// Utility function to suggest filename based on query
export function suggestFileName(query: string, format: ExportFormat): string {
  // Extract table name from query if possible
  const tableMatch = query.match(/FROM\s+["`']?([^"`'\s]+)["`']?/i);
  const tableName = tableMatch ? tableMatch[1] : 'query_result';
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const extension = format.toLowerCase();
  return `${tableName}_${timestamp}.${extension}`;
}
