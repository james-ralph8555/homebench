// Session persistence using OPFS-backed DuckDB database file

// Force persistence of database changes to OPFS
export async function saveSession(db: any): Promise<void> {
  try {
    // First, try to flush any pending writes
    if (typeof (db as any).flushFiles === 'function') {
      await (db as any).flushFiles();
      console.log('Flushed database files to OPFS');
    }
    
    // Force a checkpoint to ensure all changes are written
    const connection = await db.connect();
    try {
      await connection.query('CHECKPOINT');
      console.log('Performed checkpoint');
    } catch (error) {
      console.warn('Unable to perform checkpoint:', error);
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.warn('Error during save session:', error);
    throw error;
  }
}

// DB is already opened persistently by the context; force a checkpoint to ensure writes are flushed
export async function loadSession(db: any): Promise<void> {
  try {
    // Force a checkpoint to ensure any pending writes are committed to OPFS
    const connection = await db.connect();
    try {
      await connection.query('CHECKPOINT');
    } catch (error) {
      // Checkpoint might not be available in all configurations, that's ok
      console.warn('Unable to perform checkpoint:', error);
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.warn('Error during load session:', error);
  }
}

export async function checkSessionExists(db?: any): Promise<boolean> {
  const { isOPFSSupported } = await import('./opfsUtils');
  if (!isOPFSSupported()) return false;
  
  // Check if there are any tables in the database as a proxy for saved session
  if (!db) return false;
  
  try {
    const connection = await db.connect();
    try {
      const result = await connection.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      `);
      const count = result.toArray()[0]?.table_count || 0;
      return count > 0;
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.warn('Error checking for saved session:', error);
    return false;
  }
}

export async function deleteSession(): Promise<void> {
  const { deleteDatabaseFromOPFS } = await import('./opfsUtils');
  await deleteDatabaseFromOPFS();
}

export async function getSessionSize(): Promise<number | null> {
  const { getDatabaseFileSize } = await import('./opfsUtils');
  return getDatabaseFileSize();
}
