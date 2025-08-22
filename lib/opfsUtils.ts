import * as duckdb from '@duckdb/duckdb-wasm';

export const DB_FILE_NAME = 'session.duckdb';
export const DB_VFS_PATH = `opfs://${DB_FILE_NAME}`;

// Check if OPFS is supported in the current browser
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

// Note: With OPFS VFS integration, the database is automatically saved
// This function is kept for compatibility but may not be needed
export async function saveDatabaseToOPFS(db: duckdb.AsyncDuckDB): Promise<void> {
  // With OPFS VFS path, database writes are automatically persisted
  // Force a flush if available
  try {
    if (typeof (db as any).flushFiles === 'function') {
      await (db as any).flushFiles();
    }
  } catch (error) {
    console.warn('Unable to flush files to OPFS:', error);
  }
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

// Deletes the database file from OPFS with aggressive corruption cleanup
export async function deleteDatabaseFromOPFS(): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  const opfsRoot = await navigator.storage.getDirectory();
  
  console.log('Starting aggressive OPFS cleanup...');
  
  // List all files to see what we're dealing with
  const allFiles: string[] = [];
  try {
    for await (const [name, handle] of (opfsRoot as any).entries()) {
      allFiles.push(name);
      console.log(`Found OPFS file: ${name}`);
    }
  } catch (error) {
    console.warn('Could not enumerate OPFS files:', error);
  }
  
  // Try to remove main database file
  try {
    await opfsRoot.removeEntry(DB_FILE_NAME);
    console.log(`✓ Removed ${DB_FILE_NAME} from OPFS`);
  } catch (error) {
    console.warn(`Could not remove ${DB_FILE_NAME}:`, error);
  }
  
  // Also try to remove WAL file if it exists
  try {
    await opfsRoot.removeEntry(DB_FILE_NAME + '.wal');
    console.log(`✓ Removed ${DB_FILE_NAME}.wal from OPFS`);
  } catch (error) {
    console.warn(`Could not remove ${DB_FILE_NAME}.wal:`, error);
  }
  
  // Also try to remove SHM file if it exists
  try {
    await opfsRoot.removeEntry(DB_FILE_NAME + '.shm');
    console.log(`✓ Removed ${DB_FILE_NAME}.shm from OPFS`);
  } catch (error) {
    console.warn(`Could not remove ${DB_FILE_NAME}.shm:`, error);
  }
  
  // Remove any other database-related files that might be causing issues
  const dbRelatedFiles = allFiles.filter(name => 
    name.includes('.duckdb') || 
    name.includes('.wal') || 
    name.includes('.shm') ||
    name.includes('session')
  );
  
  for (const fileName of dbRelatedFiles) {
    if (fileName !== DB_FILE_NAME && 
        fileName !== DB_FILE_NAME + '.wal' && 
        fileName !== DB_FILE_NAME + '.shm') {
      try {
        await opfsRoot.removeEntry(fileName);
        console.log(`✓ Removed additional file: ${fileName}`);
      } catch (error) {
        console.warn(`Could not remove ${fileName}:`, error);
      }
    }
  }
  
  console.log('OPFS cleanup completed');
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

// Note: With OPFS VFS integration, the database is automatically loaded
// This function is kept for compatibility but may not be needed  
export async function loadDatabaseFromOPFS(db: duckdb.AsyncDuckDB): Promise<void> {
  // With OPFS VFS path, database is automatically loaded on open
  // Force a checkpoint to ensure consistency
  try {
    const connection = await db.connect();
    try {
      await connection.query('CHECKPOINT');
    } catch (error) {
      // WAL mode might not be enabled, that's ok
      console.warn('Unable to checkpoint WAL:', error);
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.warn('Error during database load verification:', error);
  }
}

// Downloads the saved OPFS-backed session as a .duckdb file
export async function downloadSavedSessionAsDuckDB(): Promise<void> {
  if (!isOPFSSupported()) {
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

// Emergency cleanup function for manual use in browser console
export async function forceCleanupOPFS(): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error('Origin Private File System is not supported in this browser');
  }
  
  console.log('Starting force cleanup of OPFS...');
  const opfsRoot = await navigator.storage.getDirectory();
  
  // List all files first
  const files: string[] = [];
  for await (const [name, handle] of (opfsRoot as any).entries()) {
    files.push(name);
    console.log(`Found OPFS file: ${name}`);
  }
  
  // Remove all DuckDB-related files
  const dbFiles = files.filter(name => 
    name.includes('session.duckdb') || 
    name.includes('.duckdb') ||
    name.includes('.wal') ||
    name.includes('.shm')
  );
  
  for (const fileName of dbFiles) {
    try {
      await opfsRoot.removeEntry(fileName);
      console.log(`Force removed: ${fileName}`);
    } catch (error) {
      console.error(`Failed to remove ${fileName}:`, error);
    }
  }
  
  console.log('Force cleanup complete. Please refresh the page.');
}

// Debug function to check OPFS in DevTools
export async function debugOPFS(): Promise<void> {
  console.log('🔍 OPFS Debug Information:');
  
  if (!isOPFSSupported()) {
    console.log('❌ OPFS not supported');
    return;
  }

  try {
    const opfsRoot = await navigator.storage.getDirectory();
    console.log('✅ OPFS Root obtained:', opfsRoot);
    
    // List all files
    const files: { name: string; size: number; type: string }[] = [];
    for await (const [name, handle] of (opfsRoot as any).entries()) {
      console.log(`📁 Found: ${name} (${handle.kind})`);
      
      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          files.push({ name, size: file.size, type: 'file' });
          console.log(`📄 File: ${name} - Size: ${file.size} bytes`);
        } catch (error) {
          console.warn(`⚠️ Could not read file ${name}:`, error);
        }
      }
    }
    
    // Check specifically for DuckDB files
    const dbFile = files.find(f => f.name.includes('session.duckdb'));
    if (dbFile) {
      console.log('✅ Database file found:', dbFile);
    } else {
      console.log('❌ No database file found');
    }
    
    // Storage usage
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log('💾 Storage Estimate:', estimate);
    }
    
    console.log('📊 Total OPFS files:', files.length);
  } catch (error) {
    console.error('❌ OPFS Debug failed:', error);
  }
}

// Complete application data reset function
export async function resetApplicationData(): Promise<void> {
  console.log('🔄 Starting complete application data reset...');
  
  // Clear OPFS
  await forceCleanupOPFS();
  
  // Clear IndexedDB
  try {
    if ('indexedDB' in window) {
      // Clear any IndexedDB databases used by the app
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          console.log(`Deleting IndexedDB: ${db.name}`);
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(void 0);
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        }
      }
    }
  } catch (error) {
    console.warn('Error clearing IndexedDB:', error);
  }
  
  // Clear localStorage
  try {
    localStorage.clear();
    console.log('✓ Cleared localStorage');
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('✓ Cleared sessionStorage');
  } catch (error) {
    console.warn('Error clearing sessionStorage:', error);
  }
  
  console.log('✅ Application data reset complete. Please refresh the page.');
}

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  (window as any).forceCleanupOPFS = forceCleanupOPFS;
  (window as any).debugOPFS = debugOPFS;
  (window as any).resetApplicationData = resetApplicationData;
}
