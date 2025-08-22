import { getDuckDB } from './duckdbManager';

/**
 * Simplified durability operations - fail fast approach
 */

export interface WriteResult {
  success: boolean;
  rowsAffected?: number;
  error?: string;
  duration: number;
}

/**
 * Executes a write operation with immediate CHECKPOINT - fail fast approach
 */
export const executeDurableWrite = async (
  query: string, 
  params: any[] = []
): Promise<WriteResult> => {
  const startTime = performance.now();
  
  const db = await getDuckDB();
  const connection = await db.connect();
  
  try {
    // Start a transaction for write operations
    await connection.query('BEGIN TRANSACTION;');
    
    // Execute the write operation
    let result;
    try {
      if (params.length > 0) {
        const statement = await connection.prepare(query);
        try {
          result = await statement.query(...params);
        } finally {
          await statement.close();
        }
      } else {
        result = await connection.query(query);
      }
      
      // Commit the transaction
      await connection.query('COMMIT;');
      
    } catch (error) {
      // Rollback on error
      try {
        await connection.query('ROLLBACK;');
      } catch (rollbackError) {
        console.warn('Failed to rollback transaction:', rollbackError);
      }
      throw error;
    }
    
    // CRITICAL: Execute CHECKPOINT to ensure durability
    await connection.query('CHECKPOINT;');
    
    // CRITICAL: Flush to OPFS for persistent storage
    try {
      await db.flushFiles();
    } catch (flushError) {
      console.warn('Failed to flush to OPFS (data still saved):', flushError);
    }
    
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
  } finally {
    try {
      await connection.close();
    } catch (closeError) {
      console.warn('Failed to close connection:', closeError);
    }
  }
};

/**
 * Executes a read query - no checkpointing needed
 */
export const executeReadQuery = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  const db = await getDuckDB();
  const connection = await db.connect();
  
  try {
    if (params.length > 0) {
      const statement = await connection.prepare(query);
      try {
        return await statement.query(...params);
      } finally {
        await statement.close();
      }
    } else {
      return await connection.query(query);
    }
  } finally {
    await connection.close();
  }
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