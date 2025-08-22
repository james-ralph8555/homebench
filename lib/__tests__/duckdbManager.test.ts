import { describe, it, expect } from 'vitest';
import { isOpfsSupported } from '../duckdbManager';

describe('duckdbManager: isOpfsSupported', () => {
  it('returns false without navigator.storage.getDirectory', () => {
    // jsdom default lacks OPFS API
    expect(isOpfsSupported()).toBe(false);
  });

  it('returns true when OPFS APIs are present', () => {
    const origNav = globalThis.navigator as any;
    const fakeStorage = { getDirectory: () => ({}) } as any;
    Object.defineProperty(globalThis, 'navigator', { value: { ...origNav, storage: fakeStorage }, configurable: true });
    expect(isOpfsSupported()).toBe(true);
    Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true });
  });
});

