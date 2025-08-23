/**
 * @fileoverview Multi-tab aware query execution helpers
 * 
 * These functions provide a consistent interface for components to execute
 * queries regardless of whether they're running on a leader or client tab.
 */

import { DuckDBManager } from './duckdbManager';

/**
 * Execute a read query through the multi-tab system
 * This replaces direct database connections in components
 */
export async function executeQuery(sql: string, args?: any[]): Promise<any> {
  const manager = DuckDBManager.getInstance();
  return manager.executeQuery(sql, args, 'ro');
}

/**
 * Execute a write query through the multi-tab system
 */
export async function executeWriteQuery(sql: string, args?: any[]): Promise<any> {
  const manager = DuckDBManager.getInstance();
  return manager.executeQuery(sql, args, 'rw');
}

/**
 * Execute multiple queries in parallel through the multi-tab system
 * Useful for components that need to run several read queries at once
 */
export async function executeQueries(queries: Array<{sql: string, args?: any[]}>): Promise<any[]> {
  const manager = DuckDBManager.getInstance();
  
  const promises = queries.map(query => 
    manager.executeQuery(query.sql, query.args, 'ro')
  );
  
  return Promise.all(promises);
}

/**
 * Execute a streaming query through the multi-tab system
 * Useful for large result sets
 */
export async function executeStreamingQuery(options: {
  sql: string;
  args?: any[];
  onArrowChunk?: (chunk: ArrayBuffer) => void;
  onJsonChunk?: (rows: any[]) => void;
  format?: 'arrow' | 'json';
}): Promise<void> {
  const manager = DuckDBManager.getInstance();
  
  return manager.executeStreamingQuery({
    sql: options.sql,
    args: options.args,
    mode: 'ro',
    fmt: options.format ?? 'arrow',
    onArrowChunk: options.onArrowChunk,
    onJsonChunk: options.onJsonChunk
  });
}