export const DB_FILE_NAME = 'homebench.db';
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
import { logger } from '@/lib/logger';

export async function downloadSavedSessionAsDuckDB(): Promise<void> {
  const { isOpfsSupported } = await import('./duckdbManager');
  if (!isOpfsSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(DB_FILE_NAME);
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      throw new Error('Database file is empty. Create some tables first.');
    }

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
    
    logger.info(`Downloaded session database: ${downloadName} (${formatFileSize(file.size)})`);
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('No saved session database found. Upload some data first.');
    }
    throw new Error(`Download failed: ${error.message}`);
  }
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Wipe all OPFS data
export async function wipeOpfsData(): Promise<void> {
  const { isOpfsSupported, DuckDBManager } = await import('./duckdbManager');
  if (!isOpfsSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  
  try {
    // First, close the database connection to release any locks
    const manager = DuckDBManager.getInstance();
    await manager.reset();
    logger.info('Database connections closed');
    
    // Small delay to ensure database is fully closed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const opfsRoot = await navigator.storage.getDirectory();
    
    // List all files and directories
    const itemsToDelete: string[] = [];
    for await (const [name, handle] of (opfsRoot as any).entries()) {
      itemsToDelete.push(name);
    }
    
    if (itemsToDelete.length === 0) {
      logger.info('OPFS already empty');
      return;
    }
    
    // Delete all files and directories
    let deletedCount = 0;
    for (const name of itemsToDelete) {
      try {
        await opfsRoot.removeEntry(name, { recursive: true });
        deletedCount++;
        logger.info(`Deleted OPFS item: ${name}`);
      } catch (error) {
        logger.warn(`Failed to delete OPFS item ${name}:`, error);
        // Don't throw on individual file failures
      }
    }
    
    logger.info(`OPFS wiped successfully (${deletedCount}/${itemsToDelete.length} items deleted)`);
  } catch (error: any) {
    logger.error('Failed to wipe OPFS:', error);
    throw new Error(`Failed to wipe OPFS: ${error.message || error}`);
  }
}

// List all files in OPFS
export async function listOpfsFiles(): Promise<Array<{name: string, size: number, type: 'file' | 'directory'}>> {
  const { isOpfsSupported } = await import('./duckdbManager');
  if (!isOpfsSupported()) {
    return [];
  }
  
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    const files: Array<{name: string, size: number, type: 'file' | 'directory'}> = [];
    
    for await (const [name, handle] of (opfsRoot as any).entries()) {
      try {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          files.push({
            name,
            size: file.size,
            type: 'file'
          });
        } else if (handle.kind === 'directory') {
          files.push({
            name,
            size: 0,
            type: 'directory'
          });
        }
      } catch (error) {
        logger.warn(`Could not get info for ${name}:`, error);
        files.push({
          name,
          size: 0,
          type: 'file'
        });
      }
    }
    
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.warn('Could not list OPFS files:', error);
    return [];
  }
}
