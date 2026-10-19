import { db } from './index';
import { Account, Category, Transaction, Transfer, Budget, Loan, LoanPayment, Reminder, SavingsGoal } from '@/types';

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
 * Initializes default categories and standard zero-balance accounts for a clean user.
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

  // Check if accounts already exist
  const existingAccCount = await db.accounts.where('user_id').equals(userId).count();
  if (existingAccCount === 0) {
    const defaultAccounts: Account[] = [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'HDFC Salary Account',
        account_type: 'bank',
        opening_balance: 0,
        currency: 'INR',
        is_archived: false,
        archived_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Cash in Hand',
        account_type: 'cash',
        opening_balance: 0,
        currency: 'INR',
        is_archived: false,
        archived_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Google Pay / UPI Wallet',
        account_type: 'wallet',
        opening_balance: 0,
        currency: 'INR',
        is_archived: false,
        archived_at: null,
        created_at: now,
        updated_at: now,
      },
    ];
    await db.accounts.bulkAdd(defaultAccounts);
  }
}

/**
 * Seeds rich, realistic demonstration data for exploration in Demo Mode.
 * Distinctly populated for Oct 2026.
 */
export async function seedDemoData(userId: string): Promise<void> {
  // Clear any existing data for clean demo state
  await clearUserData(userId);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${currentYear}-${currentMonth}-01`;

  // 1. Categories
  const categories: Category[] = DEFAULT_CATEGORIES.map(c => ({
    id: crypto.randomUUID(),
    user_id: userId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    is_default: c.is_default,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }));
  await db.categories.bulkAdd(categories);

  const getCatId = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id || null;

  // 2. Accounts with realistic opening balances
  const accBankId = crypto.randomUUID();
  const accCashId = crypto.randomUUID();
  const accUpiId = crypto.randomUUID();
  const accSavingsId = crypto.randomUUID();

  const accounts: Account[] = [
    {
      id: accBankId,
      user_id: userId,
      name: 'HDFC Premium Salary A/C',
      account_type: 'bank',
      opening_balance: 45000,
      currency: 'INR',
      is_archived: false,
      archived_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: accSavingsId,
      user_id: userId,
      name: 'SBI Emergency Reserve',
      account_type: 'bank',
      opening_balance: 150000,
      currency: 'INR',
      is_archived: false,
      archived_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: accUpiId,
      user_id: userId,
      name: 'Google Pay / Paytm Wallet',
      account_type: 'wallet',
      opening_balance: 3200,
      currency: 'INR',
      is_archived: false,
      archived_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: accCashId,
      user_id: userId,
      name: 'Physical Cash in Hand',
      account_type: 'cash',
      opening_balance: 5500,
      currency: 'INR',
      is_archived: false,
      archived_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  await db.accounts.bulkAdd(accounts);

  // 3. Transactions for current month
  const transactions: Transaction[] = [
    // Income
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accBankId,
      type: 'income',
      amount: 115000,
      category_id: getCatId('Monthly Salary'),
      occurred_at: new Date(currentYear, now.getMonth(), 1, 9, 30).toISOString(),
      payment_method: 'net_banking',
      notes: 'October Tech Lead Salary - Net Credit',
      tags: ['salary', 'techcorp'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accBankId,
      type: 'income',
      amount: 22500,
      category_id: getCatId('Freelance'),
      occurred_at: new Date(currentYear, now.getMonth(), 8, 16, 0).toISOString(),
      payment_method: 'upi',
      notes: 'UI/UX Mobile App Redesign Consultation',
      tags: ['freelance', 'client'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accUpiId,
      type: 'income',
      amount: 450,
      category_id: getCatId('Cashback'),
      occurred_at: new Date(currentYear, now.getMonth(), 10, 11, 15).toISOString(),
      payment_method: 'upi',
      notes: 'Cred UPI Cash Reward',
      tags: ['cashback'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },

    // Expenses
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accBankId,
      type: 'expense',
      amount: 28000,
      category_id: getCatId('Housing & Rent'),
      occurred_at: new Date(currentYear, now.getMonth(), 2, 10, 0).toISOString(),
      payment_method: 'net_banking',
      notes: 'October Apartment Rent to Landlord',
      tags: ['rent', 'fixed'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accUpiId,
      type: 'expense',
      amount: 4850,
      category_id: getCatId('Groceries'),
      occurred_at: new Date(currentYear, now.getMonth(), 4, 18, 45).toISOString(),
      payment_method: 'upi',
      notes: 'Blinkit Monthly Grocery Restock',
      tags: ['groceries', 'home'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accUpiId,
      type: 'expense',
      amount: 1420,
      category_id: getCatId('Food & Dining Out'),
      occurred_at: new Date(currentYear, now.getMonth(), 6, 21, 15).toISOString(),
      payment_method: 'upi',
      notes: 'Dinner at Social Cafe with Team',
      tags: ['dining', 'weekend'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accBankId,
      type: 'expense',
      amount: 2200,
      category_id: getCatId('Utilities'),
      occurred_at: new Date(currentYear, now.getMonth(), 7, 14, 0).toISOString(),
      payment_method: 'upi',
      notes: 'Electricity Bill (BESCOM) + Broadband',
      tags: ['utility'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accCashId,
      type: 'expense',
      amount: 850,
      category_id: getCatId('Transit'),
      occurred_at: new Date(currentYear, now.getMonth(), 9, 8, 30).toISOString(),
      payment_method: 'cash',
      notes: 'Fuel Auto Refill & Metro Card Recharge',
      tags: ['commute'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accUpiId,
      type: 'expense',
      amount: 3200,
      category_id: getCatId('Shopping'),
      occurred_at: new Date(currentYear, now.getMonth(), 12, 17, 30).toISOString(),
      payment_method: 'card',
      notes: 'Winter jacket & office essentials from Myntra',
      tags: ['shopping'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: accUpiId,
      type: 'expense',
      amount: 699,
      category_id: getCatId('Entertainment'),
      occurred_at: new Date(currentYear, now.getMonth(), 14, 19, 0).toISOString(),
      payment_method: 'card',
      notes: 'Netflix Premium 4K Family Subscription',
      tags: ['subscription'],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  await db.transactions.bulkAdd(transactions);

  // 4. Transfers (Transfers between accounts: never count as income/expense!)
  const transfers: Transfer[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      source_account_id: accBankId,
      destination_account_id: accUpiId,
      amount: 5000,
      occurred_at: new Date(currentYear, now.getMonth(), 3, 11, 0).toISOString(),
      notes: 'Top-up Google Pay UPI balance for weekly expenses',
      created_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      source_account_id: accBankId,
      destination_account_id: accCashId,
      amount: 2000,
      occurred_at: new Date(currentYear, now.getMonth(), 5, 15, 30).toISOString(),
      notes: 'ATM Cash Withdrawal for emergency wallet',
      created_at: now.toISOString(),
    },
  ];
  await db.transfers.bulkAdd(transfers);

  // 5. Budgets for current month
  const budgets: Budget[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      category_id: null, // Overall monthly budget
      month: monthKey,
      limit_amount: 65000,
      warning_thresholds: [50, 75, 90, 100],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      category_id: getCatId('Food & Dining Out'),
      month: monthKey,
      limit_amount: 6000,
      warning_thresholds: [50, 75, 90, 100],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      category_id: getCatId('Groceries'),
      month: monthKey,
      limit_amount: 8000,
      warning_thresholds: [50, 75, 90, 100],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      category_id: getCatId('Shopping'),
      month: monthKey,
      limit_amount: 5000,
      warning_thresholds: [50, 75, 90, 100],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  await db.budgets.bulkAdd(budgets);

  // 6. Loans & EMI
  const loanId = crypto.randomUUID();
  const loan: Loan = {
    id: loanId,
    user_id: userId,
    name: 'Tata Nexon EV Car Loan',
    lender: 'HDFC Bank',
    principal_amount: 850000,
    outstanding_principal: 680000,
    annual_interest_rate: 8.65,
    emi_amount: 17500,
    due_day: 10,
    start_date: '2025-04-10',
    status: 'active',
    notes: '5-year fixed tenure car loan, auto-debit from HDFC',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  await db.loans.add(loan);

  // Loan Payment for this month
  const loanPayment: LoanPayment = {
    id: crypto.randomUUID(),
    user_id: userId,
    loan_id: loanId,
    account_id: accBankId,
    paid_at: new Date(currentYear, now.getMonth(), 10, 10, 0).toISOString(),
    total_amount: 17500,
    principal_component: 12600,
    interest_component: 4900,
    fee_component: 0,
    notes: 'EMI #19 debited automatically',
    created_at: now.toISOString(),
  };
  await db.loan_payments.add(loanPayment);

  // 7. Reminders
  const reminders: Reminder[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'Airtel Xstream Fiber Broadband Due',
      amount: 943,
      due_at: new Date(currentYear, now.getMonth(), 24, 18, 0).toISOString(),
      recurrence_rule: 'monthly',
      related_account_id: accUpiId,
      status: 'pending',
      notes: 'Recharge before connection throttles',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'Car Loan EMI Auto Debit',
      amount: 17500,
      due_at: new Date(currentYear, now.getMonth() + 1, 10, 10, 0).toISOString(),
      recurrence_rule: 'monthly',
      related_loan_id: loanId,
      related_account_id: accBankId,
      status: 'pending',
      notes: 'Ensure minimum ₹20,000 balance in HDFC Salary A/C',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'Health Insurance Premium (HDFC Ergo)',
      amount: 14500,
      due_at: new Date(currentYear, now.getMonth(), 28, 12, 0).toISOString(),
      recurrence_rule: 'yearly',
      related_account_id: accBankId,
      status: 'pending',
      notes: 'Annual renewal for parents floater cover',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  await db.reminders.bulkAdd(reminders);

  // 8. Savings Goals
  const savingsGoals: SavingsGoal[] = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      name: 'Emergency Fund (6 Months Expenses)',
      target_amount: 300000,
      saved_amount: 150000,
      target_date: `${currentYear}-12-31`,
      status: 'in_progress',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      name: 'Japan Autumn Trip 2027',
      target_amount: 250000,
      saved_amount: 85000,
      target_date: `${currentYear + 1}-10-15`,
      status: 'in_progress',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  await db.savings_goals.bulkAdd(savingsGoals);
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
