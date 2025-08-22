import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isOPFSSupported, DB_FILE_NAME, DB_VFS_PATH } from './opfsUtils';

describe('OPFS utils basics', () => {
  const originalNavigator = navigator;

  beforeEach(() => {
    globalThis.navigator = { ...originalNavigator } as any;
  });

  afterEach(() => {
    globalThis.navigator = originalNavigator as any;
  });

  it('exposes DB file constants', () => {
    expect(DB_FILE_NAME).toBe('session.duckdb');
    expect(DB_VFS_PATH).toBe(`opfs://${DB_FILE_NAME}`);
  });

  it('detects OPFS support based on navigator.storage.getDirectory', () => {
    // Initially false if not present
    delete (navigator as any).storage;
    expect(isOPFSSupported()).toBe(false);

    // Add minimal storage.getDirectory
    (navigator as any).storage = { getDirectory: async () => ({}) };
    expect(isOPFSSupported()).toBe(true);
  });
});

