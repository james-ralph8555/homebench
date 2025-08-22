import { describe, it, expect, vi } from 'vitest';
import { saveSession, loadSession, checkSessionExists, deleteSession, getSessionSize } from '../persistence';

// Mock opfsUtils for deleteSession/getSessionSize
vi.mock('../opfsUtils', () => ({
  wipeOpfsData: vi.fn(async () => {}),
  getDatabaseFileSize: vi.fn(async () => 123456),
}));

describe('persistence: save/load', () => {
  it('saveSession flushes files and checkpoints', async () => {
    const conn = {
      query: vi.fn(async (_: string) => {}),
      close: vi.fn(async () => {}),
    } as any;
    const db = {
      flushFiles: vi.fn(async () => {}),
      connect: vi.fn(async () => conn),
    } as any;
    await saveSession(db);
    expect(db.flushFiles).toHaveBeenCalled();
    expect(conn.query).toHaveBeenCalledWith('CHECKPOINT');
    expect(conn.close).toHaveBeenCalled();
  });

  it('loadSession attempts checkpoint', async () => {
    const conn = {
      query: vi.fn(async (_: string) => {}),
      close: vi.fn(async () => {}),
    } as any;
    const db = { connect: vi.fn(async () => conn) } as any;
    await loadSession(db);
    expect(conn.query).toHaveBeenCalledWith('CHECKPOINT');
  });
});

describe('persistence: helpers', () => {
  it('checkSessionExists returns false when OPFS unsupported or db missing', async () => {
    const existsNoDb = await checkSessionExists(undefined);
    expect(existsNoDb).toBe(false);
  });

  it('deleteSession delegates to wipeOpfsData', async () => {
    await deleteSession();
    const mod = await import('../opfsUtils');
    expect((mod.wipeOpfsData as any).mock.calls.length).toBeGreaterThan(0);
  });

  it('getSessionSize delegates to getDatabaseFileSize', async () => {
    const size = await getSessionSize();
    expect(size).toBe(123456);
  });
});

