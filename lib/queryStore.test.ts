import { describe, it, expect, beforeEach } from 'vitest';
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
} from './queryStore';

beforeEach(async () => {
  await db.savedQueries.clear();
  await db.preferences.clear();
});

describe('Saved queries', () => {
  it('saves and retrieves queries', async () => {
    const id = await saveQuery({ name: 'List', sql: 'SELECT * FROM t' });
    const fetched = await getQueryById(id);
    expect(fetched?.name).toBe('List');
    expect(fetched?.sql).toBe('SELECT * FROM t');
  });

  it('updates and sorts by updatedAt', async () => {
    const id1 = await saveQuery({ name: 'Q1', sql: 'S1' });
    await saveQuery({ name: 'Q2', sql: 'S2' });
    // Ensure updatedAt is later than previous writes for deterministic ordering
    await new Promise((r) => setTimeout(r, 5));
    await updateQuery(id1, { name: 'Q1-updated' });
    const all = await getAllQueries();
    expect(all[0].name).toBe('Q1-updated'); // most recently updated first
    expect(all[1].name).toBe('Q2');
  });

  it('deletes queries', async () => {
    const id = await saveQuery({ name: 'ToDelete', sql: 'S' });
    await deleteQuery(id);
    const q = await getQueryById(id);
    expect(q).toBeUndefined();
  });

  it('searches queries by name, sql, and description', async () => {
    await saveQuery({ name: 'Alpha', sql: 'select * from a', description: 'desc A' });
    await saveQuery({ name: 'Beta', sql: 'select * from b' });
    const byName = await searchQueries('bet');
    expect(byName.map(q => q.name)).toContain('Beta');
    const bySql = await searchQueries('from a');
    expect(bySql.map(q => q.name)).toContain('Alpha');
    const byDesc = await searchQueries('desc');
    expect(byDesc.map(q => q.name)).toContain('Alpha');
  });
});

describe('Preferences', () => {
  it('sets, gets, and removes preferences', async () => {
    await setPreference('theme', 'dark');
    await setPreference('pageSize', 50);
    expect(await getPreference('theme', 'light')).toBe('dark');
    expect(await getPreference('missing', 123)).toBe(123);
    await removePreference('theme');
    expect(await getPreference('theme', 'light')).toBe('light');
  });
});
