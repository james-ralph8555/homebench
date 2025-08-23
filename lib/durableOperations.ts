import { DuckDBManager } from './duckdbManager';

/**
 * Multi-tab aware durability operations with streaming support
 */

export interface WriteResult {
  success: boolean;
  rowsAffected?: number;
  error?: string;
  duration: number;
}

export interface StreamingQueryOptions {
  onArrowChunk?: (chunk: ArrayBuffer) => void;
  onJsonChunk?: (rows: any[]) => void;
  onProgress?: (processed: number) => void;
  format?: 'arrow' | 'json';
  chunkRows?: number;
}

/**
 * Executes a write operation through the multi-tab system with automatic durability
 */
export const executeDurableWrite = async (
  query: string, 
  params: any[] = []
): Promise<WriteResult> => {
  const startTime = performance.now();
  
  try {
    const manager = DuckDBManager.getInstance();
    
    // Wrap the query in a transaction with checkpoint for durability
    const transactionalQuery = `
      BEGIN TRANSACTION;
      ${query};
      COMMIT;
      CHECKPOINT;
    `;
    
    // Execute through multi-tab system as a write operation
    const result = await manager.executeQuery(transactionalQuery, params, 'rw');
    
    const duration = performance.now() - startTime;
    
    return {
      success: true,
      rowsAffected: result?.numRows,
      duration
    };
    
  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error(`Write operation failed after ${duration.toFixed(2)}ms:`, error);
    
    return {
      success: false,
      error: error.message || String(error),
      duration
    };
  }
};

/**
 * Executes a read query through the multi-tab system
 */
export const executeReadQuery = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  const manager = DuckDBManager.getInstance();
  return manager.executeQuery(query, params, 'ro');
};

/**
 * Executes a streaming read query with chunked results
 */
export const executeStreamingReadQuery = async (
  query: string,
  params: any[] = [],
  options: StreamingQueryOptions = {}
): Promise<void> => {
  const manager = DuckDBManager.getInstance();
  
  return manager.executeStreamingQuery({
    sql: query,
    args: params,
    mode: 'ro',
    fmt: options.format ?? 'arrow',
    chunkRows: options.chunkRows,
    onArrowChunk: options.onArrowChunk,
    onJsonChunk: options.onJsonChunk
  });
};

/**
 * Creates a table from a file - simplified
 */
export const createTableFromFile = async (
  tableName: string,
  fileName: string,
  fileExtension: string
): Promise<WriteResult> => {
  let query = '';
  
  switch (fileExtension.toLowerCase()) {
    case 'csv':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}')`;
      break;
    case 'parquet':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_parquet('${fileName}')`;
      break;
    case 'json':
    case 'jsonl':
    case 'ndjson':
      query = `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${fileName}', maximum_object_size = 104857600)`;
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
  
  return executeDurableWrite(query);
};