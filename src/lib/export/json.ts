import { db } from '../db';
import { downloadFile } from './csv';

export interface MyFinanceBackupData {
  version: string;
  exportedAt: string;
  currency: string;
  locale: string;
  data: {
    accounts: unknown[];
    categories: unknown[];
    transactions: unknown[];
    transfers: unknown[];
    budgets: unknown[];
    loans: unknown[];
    loan_payments: unknown[];
    reminders: unknown[];
    savings_goals: unknown[];
    savings_goal_contributions: unknown[];
  };
}

/**
 * Creates a complete JSON backup of the user's financial database.
 */
export async function createFullBackup(userId: string): Promise<string> {
  const accounts = await db.accounts.where('user_id').equals(userId).toArray();
  const categories = await db.categories.where('user_id').equals(userId).toArray();
  const transactions = await db.transactions.where('user_id').equals(userId).toArray();
  const transfers = await db.transfers.where('user_id').equals(userId).toArray();
  const budgets = await db.budgets.where('user_id').equals(userId).toArray();
  const loans = await db.loans.where('user_id').equals(userId).toArray();
  const loan_payments = await db.loan_payments.where('user_id').equals(userId).toArray();
  const reminders = await db.reminders.where('user_id').equals(userId).toArray();
  const savings_goals = await db.savings_goals.where('user_id').equals(userId).toArray();
  const savings_goal_contributions = await db.savings_goal_contributions.where('user_id').equals(userId).toArray();

  const backup: MyFinanceBackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    currency: 'INR',
    locale: 'en-IN',
    data: {
      accounts,
      categories,
      transactions,
      transfers,
      budgets,
      loans,
      loan_payments,
      reminders,
      savings_goals,
      savings_goal_contributions,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Downloads the JSON backup directly to user's device.
 */
export async function downloadBackup(userId: string): Promise<void> {
  const json = await createFullBackup(userId);
  const filename = `myfinance_backup_${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(json, filename, 'application/json;charset=utf-8;');
}

/**
 * Validates and restores a JSON backup file into IndexedDB.
 */
export async function restoreBackup(
  jsonText: string,
  userId: string,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string; recordCounts: Record<string, number> }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { success: false, message: 'Invalid JSON file format.', recordCounts: {} };
  }

  const backup = parsed as Partial<MyFinanceBackupData>;
  if (!backup.data || !backup.version) {
    return {
      success: false,
      message: 'Unrecognized backup structure. Missing required data payloads.',
      recordCounts: {},
    };
  }

  const {
    accounts = [],
    categories = [],
    transactions = [],
    transfers = [],
    budgets = [],
    loans = [],
    loan_payments = [],
    reminders = [],
    savings_goals = [],
    savings_goal_contributions = [],
  } = backup.data;

  // Prepare records and assign current user_id for isolation
  const prepare = <T extends Record<string, unknown>>(list: unknown[]): T[] => {
    return (list as T[]).map(item => ({
      ...item,
      user_id: userId,
    }));
  };

  try {
    await db.transaction(
      'rw',
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.transfers,
        db.budgets,
        db.loans,
        db.loan_payments,
        db.reminders,
        db.savings_goals,
        db.savings_goal_contributions,
      ],
      async () => {
        if (mode === 'replace') {
          await db.accounts.where('user_id').equals(userId).delete();
          await db.categories.where('user_id').equals(userId).delete();
          await db.transactions.where('user_id').equals(userId).delete();
          await db.transfers.where('user_id').equals(userId).delete();
          await db.budgets.where('user_id').equals(userId).delete();
          await db.loans.where('user_id').equals(userId).delete();
          await db.loan_payments.where('user_id').equals(userId).delete();
          await db.reminders.where('user_id').equals(userId).delete();
          await db.savings_goals.where('user_id').equals(userId).delete();
          await db.savings_goal_contributions.where('user_id').equals(userId).delete();
        }

        if (accounts.length) await db.accounts.bulkPut(prepare(accounts));
        if (categories.length) await db.categories.bulkPut(prepare(categories));
        if (transactions.length) await db.transactions.bulkPut(prepare(transactions));
        if (transfers.length) await db.transfers.bulkPut(prepare(transfers));
        if (budgets.length) await db.budgets.bulkPut(prepare(budgets));
        if (loans.length) await db.loans.bulkPut(prepare(loans));
        if (loan_payments.length) await db.loan_payments.bulkPut(prepare(loan_payments));
        if (reminders.length) await db.reminders.bulkPut(prepare(reminders));
        if (savings_goals.length) await db.savings_goals.bulkPut(prepare(savings_goals));
        if (savings_goal_contributions.length)
          await db.savings_goal_contributions.bulkPut(prepare(savings_goal_contributions));
      }
    );

    return {
      success: true,
      message: `Successfully restored backup in ${mode} mode.`,
      recordCounts: {
        accounts: accounts.length,
        categories: categories.length,
        transactions: transactions.length,
        transfers: transfers.length,
        budgets: budgets.length,
        loans: loans.length,
        reminders: reminders.length,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Database restore transaction failed: ${msg}`,
      recordCounts: {},
    };
  }
}
