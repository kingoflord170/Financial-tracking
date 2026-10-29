import { db } from './index';
import { Account, Category, Transaction, Transfer, Loan, LoanPayment, Budget, Reminder, SavingsGoal } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

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
 * Initializes and syncs a user's local database directly from Supabase.
 * Ensures the 3 exact accounts (Canara Bank, Cash In Hand, Card) and 0 past transactions.
 */
export async function seedCleanUser(userId: string): Promise<void> {
  const now = new Date().toISOString();

  // If Supabase is available, sync directly from remote cloud database
  if (supabase && isSupabaseConfigured) {
    try {
      // 1. Sync Categories from Supabase
      const { data: remoteCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (remoteCategories && remoteCategories.length > 0) {
        await db.categories.where('user_id').equals(userId).delete();
        await db.categories.bulkPut(
          remoteCategories.map(c => ({
            ...c,
            is_default: Boolean(c.is_default),
          }))
        );
      } else {
        const categoriesToInsert = DEFAULT_CATEGORIES.map(c => ({
          user_id: userId,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          is_default: c.is_default,
        }));
        const { data: createdCats } = await supabase
          .from('categories')
          .insert(categoriesToInsert)
          .select('*');

        if (createdCats) {
          await db.categories.bulkPut(createdCats);
        }
      }

      // 2. Sync Accounts from Supabase
      const { data: remoteAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      const targetAccounts: Array<{ name: string; type: Account['account_type'] }> = [
        { name: 'Canara Bank', type: 'bank' },
        { name: 'Cash In Hand', type: 'cash' },
        { name: 'Card', type: 'credit_card' },
      ];

      if (remoteAccounts && remoteAccounts.length > 0) {
        await db.accounts.where('user_id').equals(userId).delete();
        const mappedAccounts: Account[] = remoteAccounts.map(a => ({
          id: a.id,
          user_id: a.user_id,
          name: a.name,
          account_type: a.account_type,
          opening_balance: Number(a.opening_balance || 0),
          currency: a.currency || 'INR',
          is_archived: Boolean(a.is_archived),
          archived_at: a.archived_at || null,
          created_at: a.created_at,
          updated_at: a.updated_at,
        }));
        await db.accounts.bulkPut(mappedAccounts);
      } else {
        // Insert the 3 required accounts to Supabase
        const accountsToInsert = targetAccounts.map(t => ({
          user_id: userId,
          name: t.name,
          account_type: t.type,
          opening_balance: 0,
          currency: 'INR',
        }));
        const { data: createdAccounts } = await supabase
          .from('accounts')
          .insert(accountsToInsert)
          .select('*');

        if (createdAccounts) {
          await db.accounts.bulkPut(
            createdAccounts.map(a => ({
              id: a.id,
              user_id: a.user_id,
              name: a.name,
              account_type: a.account_type,
              opening_balance: Number(a.opening_balance || 0),
              currency: a.currency || 'INR',
              is_archived: Boolean(a.is_archived),
              archived_at: a.archived_at || null,
              created_at: a.created_at,
              updated_at: a.updated_at,
            }))
          );
        }
      }

      // 3. Sync Transactions from Supabase
      const { data: remoteTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      await db.transactions.where('user_id').equals(userId).delete();
      if (remoteTx && remoteTx.length > 0) {
        const mappedTx: Transaction[] = remoteTx.map(t => ({
          ...t,
          amount: Number(t.amount || 0),
        }));
        await db.transactions.bulkPut(mappedTx);
      }

      // 4. Sync Transfers
      const { data: remoteTransfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', userId);
      await db.transfers.where('user_id').equals(userId).delete();
      if (remoteTransfers && remoteTransfers.length > 0) {
        await db.transfers.bulkPut(remoteTransfers.map(tr => ({ ...tr, amount: Number(tr.amount || 0) })));
      }

      // 5. Sync Loans
      const { data: remoteLoans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId);
      await db.loans.where('user_id').equals(userId).delete();
      if (remoteLoans && remoteLoans.length > 0) {
        await db.loans.bulkPut(
          remoteLoans.map(l => ({
            ...l,
            principal_amount: Number(l.principal_amount || 0),
            interest_rate: Number(l.interest_rate || 0),
            emi_amount: Number(l.emi_amount || 0),
          }))
        );
      }

      // 6. Sync Loan Payments
      const { data: remoteLoanPayments } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('user_id', userId);
      await db.loan_payments.where('user_id').equals(userId).delete();
      if (remoteLoanPayments && remoteLoanPayments.length > 0) {
        await db.loan_payments.bulkPut(
          remoteLoanPayments.map(p => ({
            ...p,
            amount_paid: Number(p.amount_paid || 0),
            principal_component: Number(p.principal_component || 0),
            interest_component: Number(p.interest_component || 0),
          }))
        );
      }

      return;
    } catch (e) {
      console.warn('Failed to pull initial sync from Supabase, falling back to local cache', e);
    }
  }

  // Fallback if offline / Supabase is unconfigured: Local cache initialization
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

  const targetAccounts: Array<{ name: string; type: Account['account_type'] }> = [
    { name: 'Canara Bank', type: 'bank' },
    { name: 'Cash In Hand', type: 'cash' },
    { name: 'Card', type: 'credit_card' },
  ];

  const currentAccounts = await db.accounts.where('user_id').equals(userId).toArray();
  const targetNames = new Set(targetAccounts.map(t => t.name.toLowerCase()));

  for (const acc of currentAccounts) {
    if (!targetNames.has(acc.name.toLowerCase())) {
      await db.accounts.delete(acc.id);
    }
  }

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
