import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DuckDBManager used by durableOperations
vi.mock('../duckdbManager', () => {
  const makeConn = () => ({
    queries: [] as any[],
    preparedArgs: [] as any[],
    query: vi.fn(async function(this: any, sql: string) {
      this.queries.push(sql);
      // Handle the transactional query format from durableOperations
      if (sql.includes('USER_SQL_THROWS')) throw new Error('boom');
      // simulate returning numRows for write
      return { numRows: 3 } as any;
    }),
    prepare: vi.fn(async function(this: any, _sql: string) {
      return {
        query: vi.fn(async (..._args: any[]) => ({ numRows: 2 })),
        close: vi.fn(async () => {}),
      };
    }),
    close: vi.fn(async () => {}),
  });

  const db = {
    _conn: makeConn(),
    connect: vi.fn(async function(this: any) { return this._conn; }),
    flushFiles: vi.fn(async () => {}),
  } as any;

  // Mock DuckDBManager class
  const mockManager = {
    executeQuery: vi.fn(async (sql: string, _args?: any[], _mode?: string) => {
      const conn = db._conn;
      return conn.query(sql);
    }),
    getDatabaseState: vi.fn(async () => ({ db, isOpfsSupported: true }))
  };

  return {
    DuckDBManager: {
      getInstance: () => mockManager
    },
    getDuckDB: async () => db,
    __db: db,
    __manager: mockManager,
  };
});

import { executeDurableWrite, executeReadQuery } from '../durableOperations';
import * as duckdbModule from '../duckdbManager';

describe('durableOperations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // reset recorded queries between tests
    const db = (duckdbModule as any).__db;
    if (db && db._conn) db._conn.queries = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes durable write with checkpoint and flush', async () => {
    const res = await executeDurableWrite('INSERT INTO t VALUES (1)');
    expect(res.success).toBe(true);
    expect(res.rowsAffected).toBe(3);
    // Check that the manager was called with the transactional query
    const manager = (duckdbModule as any).__manager;
    expect(manager.executeQuery).toHaveBeenCalledWith(
      expect.stringContaining('BEGIN TRANSACTION'),
      [],
      'rw'
    );
    expect(manager.executeQuery).toHaveBeenCalledWith(
      expect.stringContaining('CHECKPOINT'),
      [],
      'rw'
    );
  });

  it('rolls back and returns error on failure', async () => {
    const res = await executeDurableWrite('USER_SQL_THROWS');
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe('string');
  });

  it('executes read query (no checkpoint)', async () => {
    const manager = (duckdbModule as any).__manager;
    manager.executeQuery.mockClear();
    
    const rows = await executeReadQuery('SELECT 1');
    expect(rows).toBeTruthy();
    
    // Check that read query was executed without transactional wrapper
    expect(manager.executeQuery).toHaveBeenCalledWith('SELECT 1', [], 'ro');
    expect(manager.executeQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('CHECKPOINT'),
      expect.anything(),
      expect.anything()
    );
  });
});
