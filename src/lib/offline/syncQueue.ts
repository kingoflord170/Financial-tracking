import { db } from '../db';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { SyncQueueItem, SyncStatus } from '@/types';

type SyncListener = (state: { pendingCount: number; isSyncing: boolean; lastError: string | null }) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private lastError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({
      pendingCount: 0,
      isSyncing: this.isSyncing,
      lastError: this.lastError,
    });
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    const pendingCount = await this.getPendingCount();
    const state = {
      pendingCount,
      isSyncing: this.isSyncing,
      lastError: this.lastError,
    };
    this.listeners.forEach(fn => fn(state));
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.sync_queue.count();
    } catch {
      return 0;
    }
  }

  /**
   * Enqueues an action for cloud sync and persists it in IndexedDB.
   */
  public async enqueue(
    table: string,
    action: 'insert' | 'update' | 'delete',
    payload: Record<string, unknown>,
    idempotency_key: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      table,
      action,
      payload,
      idempotency_key,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };

    await db.sync_queue.add(item);
    this.notify();

    // Trigger sync attempt if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Processes all pending items in the sync queue in chronological order.
   */
  public async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isSyncing) return { processed: 0, failed: 0 };
    if (!isSupabaseConfigured || !supabase) {
      // Supabase is not configured; local-first mode
      return { processed: 0, failed: 0 };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let processed = 0;
    let failed = 0;

    try {
      const items = await db.sync_queue.orderBy('created_at').toArray();

      for (const item of items) {
        try {
          const success = await this.syncItem(item);
          if (success) {
            await db.sync_queue.delete(item.id);
            // Mark entity in local DB as synced
            await this.markEntityStatus(item.table, (item.payload.id as string) || item.idempotency_key, 'synced');
            processed++;
          } else {
            failed++;
            break; // Stop and retry later to maintain order
          }
        } catch (err: unknown) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          this.lastError = message;
          await db.sync_queue.update(item.id, {
            attempts: item.attempts + 1,
            last_error: message,
          });
          await this.markEntityStatus(item.table, (item.payload.id as string) || item.idempotency_key, 'error');
          break;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { processed, failed };
  }

  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    if (!supabase) return false;

    const { table, action, payload } = item;

    if (action === 'insert') {
      // Idempotent upsert based on primary key id
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) {
        // If it's already present (unique constraint violation on idempotency_key), treat as success
        if (error.code === '23505') {
          return true;
        }
        throw new Error(`Sync insert failed for ${table}: ${error.message}`);
      }
      return true;
    }

    if (action === 'update') {
      const id = payload.id as string;
      if (!id) return true;
      const { error } = await supabase.from(table).update(payload).eq('id', id);
      if (error) {
        throw new Error(`Sync update failed for ${table}: ${error.message}`);
      }
      return true;
    }

    if (action === 'delete') {
      const id = payload.id as string;
      if (!id) return true;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        throw new Error(`Sync delete failed for ${table}: ${error.message}`);
      }
      return true;
    }

    return true;
  }

  private async markEntityStatus(table: string, id: string, status: SyncStatus): Promise<void> {
    try {
      if (table === 'transactions') {
        await db.transactions.update(id, { sync_status: status });
      } else if (table === 'transfers') {
        await db.transfers.update(id, { sync_status: status });
      } else if (table === 'accounts') {
        await db.accounts.update(id, { sync_status: status });
      } else if (table === 'loan_payments') {
        await db.loan_payments.update(id, { sync_status: status });
      }
    } catch {
      // Non-critical if table doesn't have sync_status column
    }
  }
}

export const syncManager = new SyncManager();
