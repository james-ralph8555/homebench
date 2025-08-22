export const DB_FILE_NAME = 'session.duckdb';
export const DB_VFS_PATH = `opfs://${DB_FILE_NAME}`;

// Get database file size
export async function getDatabaseFileSize(): Promise<number | null> {
  const { isOpfsSupported } = await import('./duckdbManager');
  if (!isOpfsSupported()) return null;
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(DB_FILE_NAME);
    const file = await fileHandle.getFile();
    return file.size;
  } catch (e) {
    return null;
  }
}

// Download database file
export async function downloadSavedSessionAsDuckDB(): Promise<void> {
  const { isOpfsSupported } = await import('./duckdbManager');
  if (!isOpfsSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  const opfsRoot = await navigator.storage.getDirectory();
  const fileHandle = await opfsRoot.getFileHandle(DB_FILE_NAME);
  const file = await fileHandle.getFile();

  const fileTimestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const downloadName = `homebench_session_${fileTimestamp}.duckdb`;

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
