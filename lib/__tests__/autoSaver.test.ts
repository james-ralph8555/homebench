import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWrite, makeRunner, batchWrite } from '../autoSaver';

describe('autoSaver: isWrite', () => {
  it('detects mutating SQL', () => {
    expect(isWrite('INSERT INTO t VALUES (1)')).toBe(true);
    expect(isWrite('  pragma checkpoint')).toBe(true);
    expect(isWrite('select * from t')).toBe(false);
  });
});

describe('autoSaver: makeRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const makeFakes = () => {
    const flushFiles = vi.fn().mockResolvedValue(undefined);
    const db = { flushFiles } as any;

    const prepared = {
      query: vi.fn(async (..._args: any[]) => ({ ok: true })),
      close: vi.fn(async () => {}),
    };

    const conn = {
      query: vi.fn(async (_sql: string) => ({ ok: true })),
      prepare: vi.fn(async (_sql: string) => prepared),
    } as any;

    return { db, conn, flushFiles, prepared };
  };

  it('persists write operations (checkpoint + flush) and toggles saving state', async () => {
    const { db, conn, flushFiles } = makeFakes();
    const states: boolean[] = [];
    const runner = makeRunner(db, (s) => states.push(s), 50);

    await runner(conn, 'INSERT INTO t VALUES (1)');
    // hide is delayed to ensure minShowMs
    expect(states[0]).toBe(true);
    expect(flushFiles).toHaveBeenCalled();

    // Release hide timer
    vi.advanceTimersByTime(60);
    expect(states.at(-1)).toBe(false);
    // CHECKPOINT was issued
    expect(conn.query).toHaveBeenCalledWith('CHECKPOINT');
  });

  it('does not persist for non-write operations', async () => {
    const { db, conn, flushFiles } = makeFakes();
    const states: boolean[] = [];
    const runner = makeRunner(db, (s) => states.push(s), 10);

    await runner(conn, 'select 1');
    expect(flushFiles).not.toHaveBeenCalled();
    expect(states.length).toBe(0);
  });

  it('uses prepared statements when params are given', async () => {
    const { db, conn, prepared } = makeFakes();
    const runner = makeRunner(db, () => {}, 0);
    await runner(conn, 'UPDATE t SET a = ? WHERE id = ?', [1, 2]);
    expect(conn.prepare).toHaveBeenCalled();
    expect(prepared.query).toHaveBeenCalledWith(1, 2);
  });
});

describe('autoSaver: batchWrite', () => {
  it('wraps operations in transaction and persists once', async () => {
    const conn = {
      _calls: [] as string[],
      query: vi.fn(async function(this: any, sql: string) {
        this._calls.push(sql);
        if (sql === 'ROLLBACK') return {};
        return {};
      }),
      prepare: vi.fn(async (_sql: string) => ({
        query: vi.fn(async (..._args: any[]) => ({})),
        close: vi.fn(async () => {}),
      })),
      close: vi.fn(async () => {}),
    } as any;

    const db = {
      connect: vi.fn(async () => conn),
      flushFiles: vi.fn(async () => {}),
    } as any;

    const ops = [
      { sql: 'INSERT INTO t VALUES (1)' },
      { sql: 'UPDATE t SET a=? WHERE id=?', params: [1, 2] },
    ];
    const states: boolean[] = [];
    const res = await batchWrite(db, (s) => states.push(s), ops);
    expect(res.length).toBe(2);
    expect(db.flushFiles).toHaveBeenCalled();
    expect(states).toEqual([true, false]);
    // Ensure order contains BEGIN -> COMMIT -> CHECKPOINT (allowing inner ops)
    const calls = conn._calls;
    const iBegin = calls.indexOf('BEGIN');
    const iCommit = calls.indexOf('COMMIT');
    const iCheckpoint = calls.indexOf('CHECKPOINT');
    expect(iBegin).toBeGreaterThanOrEqual(0);
    expect(iCommit).toBeGreaterThan(iBegin);
    expect(iCheckpoint).toBeGreaterThan(iCommit);
  });

  it('rolls back on error', async () => {
    const conn = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'FAIL') throw new Error('fail');
        return {};
      }),
      close: vi.fn(async () => {}),
    } as any;
    const db = { connect: vi.fn(async () => conn) } as any;
    await expect(batchWrite(db, () => {}, [{ sql: 'BEGIN' }, { sql: 'FAIL' } as any])).rejects.toThrow('fail');
  });
});
