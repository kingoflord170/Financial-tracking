import Dexie, { type EntityTable } from 'dexie';
import {
  Account,
  Category,
  Transaction,
  Transfer,
  Budget,
  Loan,
  LoanPayment,
  Reminder,
  SavingsGoal,
  SavingsGoalContribution,
  SyncQueueItem,
} from '@/types';

export interface AppMetaItem {
  key: string;
  value: unknown;
  updated_at: string;
}

export class MyFinanceDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  loans!: EntityTable<Loan, 'id'>;
  loan_payments!: EntityTable<LoanPayment, 'id'>;
  reminders!: EntityTable<Reminder, 'id'>;
  savings_goals!: EntityTable<SavingsGoal, 'id'>;
  savings_goal_contributions!: EntityTable<SavingsGoalContribution, 'id'>;
  sync_queue!: EntityTable<SyncQueueItem, 'id'>;
  app_meta!: EntityTable<AppMetaItem, 'key'>;

  constructor() {
    super('MyFinanceDB');
    this.version(1).stores({
      accounts: 'id, user_id, name, account_type, is_archived, sync_status',
      categories: 'id, user_id, name, type, is_default',
      transactions: 'id, user_id, account_id, type, category_id, occurred_at, sync_status, idempotency_key',
      transfers: 'id, user_id, source_account_id, destination_account_id, occurred_at, sync_status, idempotency_key',
      budgets: 'id, user_id, category_id, month',
      loans: 'id, user_id, status',
      loan_payments: 'id, user_id, loan_id, account_id, paid_at, sync_status, idempotency_key',
      reminders: 'id, user_id, status, due_at',
      savings_goals: 'id, user_id, status',
      savings_goal_contributions: 'id, user_id, goal_id',
      sync_queue: 'id, table, action, idempotency_key, created_at, attempts',
      app_meta: 'key',
    });
  }
}

export const db = new MyFinanceDatabase();
