import { describe, it, expect } from 'vitest';
import { getDatabaseFileSize, listOpfsFiles, downloadSavedSessionAsDuckDB, wipeOpfsData } from '../opfsUtils';
import { isOpfsSupported } from '../duckdbManager';

describe('opfsUtils (no OPFS support in test env)', () => {
  it('getDatabaseFileSize returns null when unsupported', async () => {
    expect(isOpfsSupported()).toBe(false);
    const size = await getDatabaseFileSize();
    expect(size).toBeNull();
  });

  it('listOpfsFiles returns empty when unsupported', async () => {
    const files = await listOpfsFiles();
    expect(files).toEqual([]);
  });

  it('downloadSavedSessionAsDuckDB throws when unsupported', async () => {
    await expect(downloadSavedSessionAsDuckDB()).rejects.toThrow('Origin Private File System is not supported');
  });

  it('wipeOpfsData throws when unsupported', async () => {
    await expect(wipeOpfsData()).rejects.toThrow('Origin Private File System is not supported');
  });
});

