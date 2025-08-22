import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  db,
  saveQuery,
  updateQuery,
  deleteQuery,
  getAllQueries,
  getQueryById,
  searchQueries,
  setPreference,
  getPreference,
  removePreference,
  exportAllData,
  importData,
} from '../queryStore';

describe('queryStore (Dexie + IndexedDB)', () => {
  beforeEach(async () => {
    await db.savedQueries.clear();
    await db.preferences.clear();
  });

  it('saves, updates, queries and deletes saved queries', async () => {
    const id = await saveQuery({ name: 'Test', sql: 'SELECT 1', description: 'Demo', tags: ['demo'] });
    let q = await getQueryById(id);
    expect(q?.name).toBe('Test');

    // Advance system time to ensure updatedAt changes
    vi.setSystemTime(new Date(Date.now() + 1000));
    await updateQuery(id, { name: 'Updated' });
    q = await getQueryById(id);
    expect(q?.name).toBe('Updated');

    const all = await getAllQueries();
    expect(all.length).toBe(1);

    const found = await searchQueries('updated');
    expect(found.length).toBe(1);

    await deleteQuery(id);
    const empty = await getAllQueries();
    expect(empty.length).toBe(0);
  });

  it('stores and retrieves preferences with defaults', async () => {
    const defaultTheme = await getPreference('theme', 'light');
    expect(defaultTheme).toBe('light');

    await setPreference('theme', 'dark');
    const theme = await getPreference('theme', 'light');
    expect(theme).toBe('dark');

    await removePreference('theme');
    const after = await getPreference('theme', 'light');
    expect(after).toBe('light');
  });

  it('exports and imports all data', async () => {
    await saveQuery({ name: 'Q', sql: 'SELECT 1' });
    await setPreference('p', 123);

    const dump = await exportAllData();
    expect(dump.queries.length).toBe(1);
    expect(dump.preferences.length).toBe(1);

    // Import the exported dataset (roundtrip)
    await importData({ queries: dump.queries as any, preferences: dump.preferences as any });

    const all = await getAllQueries();
    expect(all.length).toBe(1);
    expect(all.map((q) => q.name)).toContain('Q');
    const p = await getPreference('p', null as any);
    expect(p).toBe(123);
  });
});
