// Set up globals and polyfills for tests
import 'fake-indexeddb/auto';

// Some browser APIs are not implemented in jsdom. Provide minimal stubs.
if (typeof URL.createObjectURL !== 'function') {
  // @ts-ignore
  URL.createObjectURL = () => 'blob:mock-url';
}

if (typeof URL.revokeObjectURL !== 'function') {
  // @ts-ignore
  URL.revokeObjectURL = () => {};
}

// Ensure navigator exists with reasonable defaults
Object.defineProperty(globalThis, 'navigator', {
  value: globalThis.navigator || {
    hardwareConcurrency: 4,
  },
  writable: true,
});

