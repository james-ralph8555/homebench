import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportQueryAsFile, downloadDatabaseFile, suggestFileName } from '../exportUtils';

describe('exportUtils: suggestFileName', () => {
  it('derives table name when present', () => {
    const name = suggestFileName('SELECT * FROM "MyTable" WHERE id=1', 'CSV');
    expect(name.toLowerCase()).toContain('mytable');
    expect(name.endsWith('.csv')).toBe(true);
  });

  it('falls back to query_result when table missing', () => {
    const name = suggestFileName('SELECT 1', 'JSON');
    expect(name).toMatch(/query_result_.*\.json$/);
  });
});

describe('exportUtils: exportQueryAsFile', () => {
  const makeDb = () => {
    const executed: any[] = [];
    const conn = {
      query: vi.fn(async (sql: string) => { executed.push(sql); return {}; }),
      close: vi.fn(async () => {}),
    } as any;
    const db = {
      connect: vi.fn(async () => conn),
      copyFileToBuffer: vi.fn(async (_name: string) => new Uint8Array([1,2,3])),
      dropFile: vi.fn(async (_name: string) => {}),
    } as any;
    return { db, conn, executed };
  };

  it('throws on non-SELECT queries', async () => {
    const { db } = makeDb();
    await expect(exportQueryAsFile(db, 'CREATE TABLE t(a int);', 'x.csv', 'CSV')).rejects.toThrow(
      'Cannot export results of CREATE/INSERT/UPDATE/DELETE statements.'
    );
  });

  it('wraps SELECT in COPY for CSV/JSON/PARQUET', async () => {
    const { db, executed } = makeDb();
    await exportQueryAsFile(db, 'SELECT 1', 'x.csv', 'CSV');
    expect(executed[0].toUpperCase()).toContain('COPY (SELECT 1)');
    expect(executed[0].toUpperCase()).toContain('FORMAT CSV');

    executed.length = 0;
    await exportQueryAsFile(db, 'SELECT 1', 'x.json', 'JSON');
    expect(executed[0].toUpperCase()).toContain('FORMAT JSON');

    executed.length = 0;
    await exportQueryAsFile(db, 'SELECT 1', 'x.parquet', 'PARQUET');
    expect(executed[0].toUpperCase()).toContain('FORMAT PARQUET');
  });
});

describe('exportUtils: downloadDatabaseFile', () => {
  it('runs VACUUM INTO and downloads buffer', async () => {
    const conn = { query: vi.fn(async (_: string) => {}), close: vi.fn(async () => {}) } as any;
    const db = {
      connect: vi.fn(async () => conn),
      copyFileToBuffer: vi.fn(async (_name: string) => new Uint8Array([1,2,3])),
      dropFile: vi.fn(async (_name: string) => {}),
    } as any;
    await downloadDatabaseFile(db);
    expect(conn.query).toHaveBeenCalledWith(expect.stringMatching(/VACUUM INTO 'download_export_/));
    expect(db.copyFileToBuffer).toHaveBeenCalled();
    expect(db.dropFile).toHaveBeenCalled();
  });
});

