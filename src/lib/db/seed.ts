import { db } from './index';
import { Account, Category } from '@/types';

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = [
  // Expenses
  { name: 'Groceries & Provisions', type: 'expense', icon: 'ShoppingCart', color: '#10b981', is_default: true },
  { name: 'Food & Dining Out', type: 'expense', icon: 'Utensils', color: '#f59e0b', is_default: true },
  { name: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#6366f1', is_default: true },
  { name: 'Utilities & WiFi', type: 'expense', icon: 'Zap', color: '#06b6d4', is_default: true },
  { name: 'Transit & Fuel', type: 'expense', icon: 'Car', color: '#8b5cf6', is_default: true },
  { name: 'Shopping & Apparel', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', is_default: true },
  { name: 'Healthcare & Medical', type: 'expense', icon: 'HeartPulse', color: '#ef4444', is_default: true },
  { name: 'Entertainment & OTT', type: 'expense', icon: 'Film', color: '#3b82f6', is_default: true },
  { name: 'EMI & Debt Payments', type: 'expense', icon: 'CreditCard', color: '#f97316', is_default: true },
  { name: 'Education & Courses', type: 'expense', icon: 'BookOpen', color: '#14b8a6', is_default: true },
  { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#d946ef', is_default: true },
  { name: 'Miscellaneous', type: 'expense', icon: 'MoreHorizontal', color: '#64748b', is_default: true },

  // Income
  { name: 'Monthly Salary', type: 'income', icon: 'Briefcase', color: '#10b981', is_default: true },
  { name: 'Freelance & Consulting', type: 'income', icon: 'Laptop', color: '#3b82f6', is_default: true },
  { name: 'Mutual Funds & Stock Dividends', type: 'income', icon: 'TrendingUp', color: '#8b5cf6', is_default: true },
  { name: 'Cashback & UPI Refunds', type: 'income', icon: 'RotateCcw', color: '#06b6d4', is_default: true },
  { name: 'Family Contribution', type: 'income', icon: 'Users', color: '#f59e0b', is_default: true },
  { name: 'Other Income', type: 'income', icon: 'PlusCircle', color: '#64748b', is_default: true },
];

/**
 * Initializes default categories and sets up the 3 requested accounts for a real user:
 * 1. Canara Bank
 * 2. Cash In Hand
 * 3. Card
 * With 0 transactions and 0 opening balances.
 */
export async function seedCleanUser(userId: string): Promise<void> {
  const now = new Date().toISOString();

  // Check if categories already exist
  const existingCatCount = await db.categories.where('user_id').equals(userId).count();
  if (existingCatCount === 0) {
    const categoriesToInsert: Category[] = DEFAULT_CATEGORIES.map(c => ({
      id: crypto.randomUUID(),
      user_id: userId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      is_default: c.is_default,
      created_at: now,
      updated_at: now,
    }));
    await db.categories.bulkAdd(categoriesToInsert);
  }

  // 1. Delete all transactions
  await db.transactions.where('user_id').equals(userId).delete();
  await db.transfers.where('user_id').equals(userId).delete();
  await db.loan_payments.where('user_id').equals(userId).delete();
  await db.sync_queue.clear();

  // 2. Setup the exact 3 requested accounts: Canara Bank, Cash In Hand, Card
  const targetAccounts: Array<{ name: string; type: Account['account_type'] }> = [
    { name: 'Canara Bank', type: 'bank' },
    { name: 'Cash In Hand', type: 'cash' },
    { name: 'Card', type: 'credit_card' },
  ];

  const currentAccounts = await db.accounts.where('user_id').equals(userId).toArray();
  const targetNames = new Set(targetAccounts.map(t => t.name.toLowerCase()));

  // Remove any accounts not matching the 3 target accounts
  for (const acc of currentAccounts) {
    if (!targetNames.has(acc.name.toLowerCase())) {
      await db.accounts.delete(acc.id);
    }
  }

  // Refresh remaining accounts
  const remaining = await db.accounts.where('user_id').equals(userId).toArray();
  const existingMap = new Map(remaining.map(a => [a.name.toLowerCase(), a]));

  for (const target of targetAccounts) {
    const existing = existingMap.get(target.name.toLowerCase());
    if (existing) {
      await db.accounts.update(existing.id, {
        name: target.name,
        account_type: target.type,
        opening_balance: 0,
        is_archived: false,
        updated_at: now,
      });
    } else {
      await db.accounts.add({
        id: crypto.randomUUID(),
        user_id: userId,
        name: target.name,
        account_type: target.type,
        opening_balance: 0,
        currency: 'INR',
        is_archived: false,
        archived_at: null,
        created_at: now,
        updated_at: now,
      });
    }
  }
}

/**
 * Clean initialization for real-time use (Demo Mode removed).
 */
export async function seedDemoData(userId: string): Promise<void> {
  await seedCleanUser(userId);
}

/**
 * Completely clears all data for a user in the local database.
 */
export async function clearUserData(userId: string): Promise<void> {
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
      db.sync_queue,
    ],
    async () => {
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
      await db.sync_queue.clear();
    }
  );
}
