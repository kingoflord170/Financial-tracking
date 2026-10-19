// Test setup for vitest
import '@testing-library/jest-dom';

// Ensure crypto.randomUUID is available in test environment
if (!globalThis.crypto) {
  // @ts-expect-error mock crypto
  globalThis.crypto = {};
}

if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = (() => {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (
        Number(c) ^
        (Math.floor(Math.random() * 16) >> (Number(c) / 4))
      ).toString(16)
    );
  }) as any;
}
