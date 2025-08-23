import Dexie, { Table } from 'dexie';

export interface SavedQuery {
  id?: number;
  name: string;
  sql: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface QueryHistory {
  id?: number;
  sql: string;
  executedAt: Date;
}

export interface UserPreference {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

class HomeBenchDatabase extends Dexie {
  public savedQueries!: Table<SavedQuery, number>;
  public queryHistory!: Table<QueryHistory, number>;
  public preferences!: Table<UserPreference, number>;

  public constructor() {
    super('HomeBenchDB');
    this.version(1).stores({
      savedQueries: '++id, name, createdAt, updatedAt, *tags',
      preferences: '++id, &key, updatedAt',
    });
    
    this.version(2).stores({
      savedQueries: '++id, name, createdAt, updatedAt, *tags',
      queryHistory: '++id, executedAt, sql',
      preferences: '++id, &key, updatedAt',
    });
  }
}

export const db = new HomeBenchDatabase();

// Query management functions
export async function saveQuery(query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  return await db.savedQueries.add({
    ...query,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateQuery(id: number, updates: Partial<SavedQuery>): Promise<void> {
  await db.savedQueries.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteQuery(id: number): Promise<void> {
  await db.savedQueries.delete(id);
}

export async function getAllQueries(): Promise<SavedQuery[]> {
  return await db.savedQueries.orderBy('updatedAt').reverse().toArray();
}

export async function getQueryById(id: number): Promise<SavedQuery | undefined> {
  return await db.savedQueries.get(id);
}

export async function searchQueries(searchTerm: string): Promise<SavedQuery[]> {
  return await db.savedQueries
    .filter(query => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        query.name.toLowerCase().includes(lowerSearchTerm) ||
        query.sql.toLowerCase().includes(lowerSearchTerm) ||
        (query.description ? query.description.toLowerCase().includes(lowerSearchTerm) : false)
      );
    })
    .toArray();
}

// Preferences management functions
export async function setPreference(key: string, value: any): Promise<void> {
  const now = new Date();
  await db.preferences.put({
    key,
    value,
    updatedAt: now,
  });
}

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  const pref = await db.preferences.where('key').equals(key).first();
  return pref ? pref.value : defaultValue;
}

export async function removePreference(key: string): Promise<void> {
  await db.preferences.where('key').equals(key).delete();
}

// Utility functions
export async function exportAllData() {
  return {
    queries: await getAllQueries(),
    preferences: await db.preferences.toArray(),
    exportedAt: new Date(),
  };
}

// Query history management functions
export async function addQueryToHistory(sql: string): Promise<number> {
  const trimmedSql = sql.trim();
  if (!trimmedSql) return -1;
  
  // Don't add duplicate queries that were executed within the last minute
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const recentDuplicate = await db.queryHistory
    .where('sql').equals(trimmedSql)
    .and(query => query.executedAt > oneMinuteAgo)
    .first();
    
  if (recentDuplicate) return recentDuplicate.id!;
  
  return await db.queryHistory.add({
    sql: trimmedSql,
    executedAt: new Date(),
  });
}

export async function getQueryHistory(limit: number = 50): Promise<QueryHistory[]> {
  return await db.queryHistory
    .orderBy('executedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function searchQueryHistory(searchTerm: string, limit: number = 50): Promise<QueryHistory[]> {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return await db.queryHistory
    .filter(query => query.sql.toLowerCase().includes(lowerSearchTerm))
    .reverse()
    .limit(limit)
    .toArray();
}

export async function clearQueryHistory(): Promise<void> {
  await db.queryHistory.clear();
}

export async function removeQueryFromHistory(id: number): Promise<void> {
  await db.queryHistory.delete(id);
}

export async function importData(data: { queries?: SavedQuery[], preferences?: UserPreference[] }) {
  if (data.queries) {
    await db.savedQueries.clear();
    await db.savedQueries.bulkAdd(data.queries.map(q => ({ ...q, id: undefined })));
  }
  
  if (data.preferences) {
    await db.preferences.clear();
    await db.preferences.bulkAdd(data.preferences.map(p => ({ ...p, id: undefined })));
  }
}