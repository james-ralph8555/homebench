import { describe, it, expect, beforeEach } from 'vitest';
import {
  tableMetadataStore,
  markTableAsUploaded,
  markTableAsUserCreated,
  getUserCreatedTableNames,
  isTableUserCreated,
} from '../tableMetadataStore';

describe('tableMetadataStore (IndexedDB)', () => {
  beforeEach(async () => {
    await tableMetadataStore.clearAllMetadata();
  });

  it('saves and retrieves table metadata', async () => {
    await markTableAsUserCreated('users');
    await markTableAsUploaded('events', 'events.csv');

    const userTables = await getUserCreatedTableNames();
    expect(userTables).toContain('users');
    expect(userTables).not.toContain('events');

    const uploadedIsUser = await isTableUserCreated('events');
    expect(uploadedIsUser).toBe(false);

    const all = await tableMetadataStore.getAllTableMetadata();
    expect(all.map(a => a.name).sort()).toEqual(['events', 'users']);
  });

  it('deletes table metadata', async () => {
    await markTableAsUserCreated('temp');
    await tableMetadataStore.deleteTableMetadata('temp');
    const names = await getUserCreatedTableNames();
    expect(names).not.toContain('temp');
  });
});

