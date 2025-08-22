import { describe, it, expect, vi } from 'vitest';
import { suggestFileName, exportQueryAsFile, downloadDatabaseFile, type ExportFormat } from './exportUtils';

describe('suggestFileName', () => {
  it('uses table name from FROM clause', () => {
    const name = suggestFileName('SELECT * FROM my_table', 'CSV');
    expect(name.startsWith('my_table_')).toBe(true);
    expect(name.endsWith('.csv')).toBe(true);
  });

  it('falls back to query_result when no table', () => {
    const name = suggestFileName('SELECT 1', 'JSON');
    expect(name.startsWith('query_result_')).toBe(true);
    expect(name.endsWith('.json')).toBe(true);
  });
});

// Minimal fake DuckDB interface for export tests
function createFakeDb() {
  const state: any = { commands: [] as string[], copied: [] as string[], dropped: [] as string[] };
  return {
    state,
    async connect() {
      return {
        async query(cmd: string) {
          state.commands.push(cmd);
        },
        async close() {},
      };
    },
    async copyFileToBuffer(fileName: string) {
      state.copied.push(fileName);
      return new Uint8Array([1, 2, 3]);
    },
    async dropFile(fileName: string) {
      state.dropped.push(fileName);
    },
  };
}

describe('exportQueryAsFile', () => {
  it('throws on non-SELECT statements', async () => {
    const db = createFakeDb();
    await expect(() => exportQueryAsFile(db as any, 'DELETE FROM t;', 'x.csv', 'CSV')).rejects.toThrow();
  });

  it('runs COPY for SELECT queries and triggers download', async () => {
    const db = createFakeDb();
    const aAppend = vi.spyOn(document.body, 'appendChild');
    const aRemove = vi.spyOn(document.body, 'removeChild');
    await exportQueryAsFile(db as any, 'SELECT * FROM t', 'out.csv', 'CSV');
    // ensure COPY command is constructed
    expect(db.state.commands.length).toBe(1);
    expect(db.state.commands[0].toUpperCase()).toMatch(/^COPY \(SELECT \* FROM T\)/);
    // ensure file buffer was read and cleaned up
    expect(db.state.copied.length).toBe(1);
    expect(db.state.dropped.length).toBeGreaterThanOrEqual(1);
    expect(aAppend).toHaveBeenCalled();
    expect(aRemove).toHaveBeenCalled();
  });
});

describe('downloadDatabaseFile', () => {
  it('uses VACUUM INTO and downloads a file', async () => {
    const db = createFakeDb();
    const aAppend = vi.spyOn(document.body, 'appendChild');
    const aRemove = vi.spyOn(document.body, 'removeChild');
    await downloadDatabaseFile(db as any);
    expect(db.state.commands.some((c: string) => /VACUUM INTO/.test(c))).toBe(true);
    expect(db.state.copied.length).toBe(1);
    expect(db.state.dropped.length).toBeGreaterThanOrEqual(1);
    expect(aAppend).toHaveBeenCalled();
    expect(aRemove).toHaveBeenCalled();
  });
});
