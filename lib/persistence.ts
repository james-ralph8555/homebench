// Session persistence using OPFS-backed DuckDB database file

export async function saveSession(db: any): Promise<void> {
  const { saveDatabaseToOPFS } = await import('./opfsUtils');
  await saveDatabaseToOPFS(db);
}

export async function loadSession(db: any): Promise<void> {
  const { DB_FILE_NAME } = await import('./opfsUtils');
  const duckdb = await import('@duckdb/duckdb-wasm');
  if (typeof (db as any).open === 'function') {
    await (db as any).open({ path: DB_FILE_NAME, accessMode: (duckdb as any).DuckDBAccessMode?.READ_WRITE });
  }
}

export async function checkSessionExists(): Promise<boolean> {
  const { isOPFSSupported, checkOPFSDatabaseExists } = await import('./opfsUtils');
  if (!isOPFSSupported()) return false;
  return checkOPFSDatabaseExists();
}

export async function deleteSession(): Promise<void> {
  const { deleteDatabaseFromOPFS } = await import('./opfsUtils');
  await deleteDatabaseFromOPFS();
}

export async function getSessionSize(): Promise<number | null> {
  const { getDatabaseFileSize } = await import('./opfsUtils');
  return getDatabaseFileSize();
}
