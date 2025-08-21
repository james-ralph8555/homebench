import * as duckdb from '@duckdb/duckdb-wasm';

export const DB_FILE_NAME = 'session.duckdb';

// Check if OPFS is supported in the current browser
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

// Saves the current in-memory database to an OPFS file (reference approach)
export async function saveDatabaseToOPFS(db: duckdb.AsyncDuckDB): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  const buffer = await (db as any).exportFileBuffer(duckdb.DuckDBDataProtocol.BROWSER_FSACCESS);
  const opfsRoot = await navigator.storage.getDirectory();
  const fileHandle = await opfsRoot.getFileHandle(DB_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
}

// Checks if a database file exists in OPFS
export async function checkOPFSDatabaseExists(): Promise<boolean> {
  if (!isOPFSSupported()) return false;
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    await opfsRoot.getFileHandle(DB_FILE_NAME);
    return true;
  } catch (e) {
    return false;
  }
}

// Deletes the database file from OPFS
export async function deleteDatabaseFromOPFS(): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  const opfsRoot = await navigator.storage.getDirectory();
  await opfsRoot.removeEntry(DB_FILE_NAME);
}

// Returns the size in bytes of the persisted OPFS DuckDB file, or null if absent/unknown
export async function getDatabaseFileSize(): Promise<number | null> {
  if (!isOPFSSupported()) return null;
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(DB_FILE_NAME);
    const file = await fileHandle.getFile();
    return file.size;
  } catch (e) {
    return null;
  }
}
