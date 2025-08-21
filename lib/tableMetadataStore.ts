// IndexedDB store for table metadata to persist between sessions
const DB_NAME = 'homebench_metadata';
const DB_VERSION = 1;
const STORE_NAME = 'table_metadata';

interface TableMetadata {
  name: string;
  isUserCreated: boolean;
  sourceFile?: string;
  createdAt: string; // ISO string
}

class TableMetadataStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
          store.createIndex('isUserCreated', 'isUserCreated', { unique: false });
        }
      };
    });
  }

  async saveTableMetadata(metadata: TableMetadata): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(metadata);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTableMetadata(tableName: string): Promise<TableMetadata | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(tableName);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllTableMetadata(): Promise<TableMetadata[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getUserCreatedTables(): Promise<TableMetadata[]> {
    if (!this.db) await this.init();
    // Boolean keys are not valid IndexedDB keys in all browsers.
    // Avoid an index range query and filter in memory instead.
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const all = (request.result || []) as TableMetadata[];
        resolve(all.filter((m) => m.isUserCreated === true));
      };
    });
  }

  async deleteTableMetadata(tableName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(tableName);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllMetadata(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Global instance
export const tableMetadataStore = new TableMetadataStore();

// Helper functions for easy use
export async function markTableAsUploaded(tableName: string, sourceFile: string): Promise<void> {
  await tableMetadataStore.saveTableMetadata({
    name: tableName,
    isUserCreated: false,
    sourceFile,
    createdAt: new Date().toISOString()
  });
}

export async function markTableAsUserCreated(tableName: string): Promise<void> {
  await tableMetadataStore.saveTableMetadata({
    name: tableName,
    isUserCreated: true,
    createdAt: new Date().toISOString()
  });
}

export async function getUserCreatedTableNames(): Promise<string[]> {
  const tables = await tableMetadataStore.getUserCreatedTables();
  return tables.map(t => t.name);
}

export async function isTableUserCreated(tableName: string): Promise<boolean> {
  const metadata = await tableMetadataStore.getTableMetadata(tableName);
  return metadata?.isUserCreated || false;
}
