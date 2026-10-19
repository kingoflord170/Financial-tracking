export type AccountType = 'bank' | 'cash' | 'wallet' | 'credit_card' | 'investment' | 'other';
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'upi' | 'cash' | 'card' | 'net_banking' | 'cheque' | 'other';
export type LoanStatus = 'active' | 'paid_off' | 'closed';
export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ReminderStatus = 'pending' | 'completed' | 'dismissed';
export type SavingsGoalStatus = 'in_progress' | 'achieved' | 'paused';
export type SyncStatus = 'synced' | 'pending' | 'error';
export type AppTheme = 'dark' | 'light' | 'system';

export interface Profile {
  id: string;
  display_name: string;
  currency: string;
  timezone: string;
  preferences: {
    theme: AppTheme;
    budget_alert_thresholds: number[];
    default_account_id: string | null;
    browser_notifications: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  opening_balance: number;
  currency: string;
  is_archived: boolean;
  archived_at: string | null;
  sync_status?: SyncStatus;
  created_at: string;
  updated_at: string;
  // Computed balance (not persisted in raw row)
  computed_balance?: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  occurred_at: string; // ISO 8601
  payment_method: PaymentMethod;
  notes?: string;
  tags?: string[];
  transfer_group_id?: string | null;
  idempotency_key?: string;
  sync_status?: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  occurred_at: string;
  notes?: string;
  idempotency_key?: string;
  sync_status?: SyncStatus;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null; // null for overall monthly limit
  month: string; // YYYY-MM-01
  limit_amount: number;
  warning_thresholds: number[];
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  lender: string;
  principal_amount: number;
  outstanding_principal: number;
  annual_interest_rate?: number; // e.g. 8.75%
  emi_amount: number;
  due_day?: number;
  start_date: string;
  status: LoanStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  user_id: string;
  loan_id: string;
  account_id: string;
  paid_at: string;
  total_amount: number;
  principal_component: number;
  interest_component: number;
  fee_component: number;
  linked_expense_transaction_id?: string | null;
  idempotency_key?: string;
  notes?: string;
  sync_status?: SyncStatus;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  amount?: number | null;
  due_at: string;
  recurrence_rule: ReminderRecurrence;
  related_loan_id?: string | null;
  related_account_id?: string | null;
  status: ReminderStatus;
  completed_at?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date?: string | null;
  status: SavingsGoalStatus;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  account_id?: string | null;
  amount: number;
  contributed_at: string;
  notes?: string;
  created_at: string;
}

export interface SyncQueueItem {
  id: string; // UUID
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
  attempts: number;
  last_error?: string | null;
}

// Aggregated Dashboard Summary
export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashFlow: number;
  budgetLimit: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetUsagePercent: number;
  savingsTotal: number;
  upcomingRemindersCount: number;
  overdueRemindersCount: number;
  activeLoansCount: number;
  totalOutstandingLoanDebt: number;
}
