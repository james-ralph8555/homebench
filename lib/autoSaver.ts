import * as duckdb from '@duckdb/duckdb-wasm';
import { logger } from '@/lib/logger';

// Regex pattern to detect SQL statements that modify data
export const MUTATING_SQL = /^(?:\s*)(BEGIN|COMMIT|CREATE|INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|COPY|ATTACH|DETACH|MERGE|TRUNCATE|VACUUM|PRAGMA\s+checkpoint|CHECKPOINT)\b/i;

/**
 * Determines if a SQL statement is a write operation
 */
export function isWrite(sql: string): boolean {
  return MUTATING_SQL.test(sql);
}

/**
 * Creates a SQL runner that automatically handles persistence for write operations
 * 
 * @param db - DuckDB instance
 * @param setSaving - Function to update saving state in UI
 * @param minShowMs - Minimum time to show saving indicator (prevents flicker)
 * @returns SQL runner function
 */
export function makeRunner(
  db: duckdb.AsyncDuckDB, 
  setSaving: (saving: boolean) => void, 
  minShowMs = 300
) {
  let savingTimer: NodeJS.Timeout | null = null;
  let visibleSince = 0;

  const show = () => { 
    if (!savingTimer) { 
      setSaving(true); 
      visibleSince = Date.now(); 
    }
  };

  const hide = () => {
    const dt = Date.now() - visibleSince;
    const wait = Math.max(0, minShowMs - dt);
    
    if (savingTimer) clearTimeout(savingTimer);
    savingTimer = setTimeout(() => { 
      setSaving(false); 
      savingTimer = null; 
    }, wait);
  };

  return async function runSQL(conn: duckdb.AsyncDuckDBConnection, sql: string, params?: any[]) {
    const doWrite = isWrite(sql);
    if (doWrite) show();
    
    try {
      // Execute the SQL statement
      let result;
      if (params && params.length > 0) {
        const statement = await conn.prepare(sql);
        try {
          result = await statement.query(...params);
        } finally {
          await statement.close();
        }
      } else {
        result = await conn.query(sql);
      }

      if (doWrite) {
        // 1) Ensure DB file reflects WAL
        await conn.query("CHECKPOINT");
        // 2) Persist to OPFS
        await db.flushFiles();
        logger.info('Write operation persisted to OPFS');
      }
      
      return result;
    } finally {
      if (doWrite) hide();
    }
  };
}

/**
 * Batched write operation helper - groups multiple operations with single persistence
 */
export async function batchWrite(
  db: duckdb.AsyncDuckDB,
  setSaving: (saving: boolean) => void,
  operations: Array<{ sql: string; params?: any[] }>
): Promise<any[]> {
  setSaving(true);
  const conn = await db.connect();
  
  try {
    await conn.query("BEGIN");
    
    const results = [];
    for (const op of operations) {
      let result;
      if (op.params && op.params.length > 0) {
        const statement = await conn.prepare(op.sql);
        try {
          result = await statement.query(...op.params);
        } finally {
          await statement.close();
        }
      } else {
        result = await conn.query(op.sql);
      }
      results.push(result);
    }
    
    await conn.query("COMMIT");
    await conn.query("CHECKPOINT");
    await db.flushFiles();
    logger.info('Batch write operations persisted to OPFS');
    
    return results;
  } catch (error) {
    try {
      await conn.query("ROLLBACK");
    } catch (rollbackError) {
      logger.warn('Failed to rollback transaction:', rollbackError);
    }
    throw error;
  } finally {
    await conn.close();
    setSaving(false);
  }
}
