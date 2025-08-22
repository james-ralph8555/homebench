import { describe, it, expect, beforeEach } from 'vitest';
import {
  tableMetadataStore,
  markTableAsUploaded,
  markTableAsUserCreated,
  getUserCreatedTableNames,
  isTableUserCreated,
} from './tableMetadataStore';

beforeEach(async () => {
  await tableMetadataStore.clearAllMetadata();
});

describe('TableMetadataStore', () => {
  it('saves and retrieves metadata', async () => {
    await markTableAsUploaded('t1', 'file.csv');
    const all = await tableMetadataStore.getAllTableMetadata();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('t1');
    expect(all[0].sourceFile).toBe('file.csv');
  });

  it('tracks user-created tables', async () => {
    await markTableAsUserCreated('u1');
    await markTableAsUploaded('u2', 'x.csv');
    const userTables = await getUserCreatedTableNames();
    expect(userTables).toEqual(['u1']);
    expect(await isTableUserCreated('u1')).toBe(true);
    expect(await isTableUserCreated('u2')).toBe(false);
  });
});

