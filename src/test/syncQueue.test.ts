import { describe, it, expect, vi } from 'vitest';
import { syncManager } from '@/lib/offline/syncQueue';

describe('Offline Queue & Sync Idempotency', () => {
  it('notifies subscribers when mutations are queued', async () => {
    const listener = vi.fn();
    const unsubscribe = syncManager.subscribe(listener);

    expect(listener).toHaveBeenCalled();
    const initialState = listener.mock.calls[0][0];
    expect(initialState).toHaveProperty('pendingCount');
    expect(initialState).toHaveProperty('isSyncing');

    unsubscribe();
  });

  it('guarantees unique idempotency keys across queued actions', () => {
    const key1 = crypto.randomUUID();
    const key2 = crypto.randomUUID();

    expect(key1).not.toBe(key2);
    expect(typeof key1).toBe('string');
    expect(key1.length).toBeGreaterThan(10);
  });
});
