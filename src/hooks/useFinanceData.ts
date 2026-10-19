import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { syncManager } from '@/lib/offline/syncQueue';
import { useAuth } from './useAuth';
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
  DashboardSummary,
} from '@/types';
import {
  calculateAccountBalance,
  calculateTotalBalance,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  roundMoney,
} from '@/lib/accounting/calculations';
import { toast } from '@/components/ui/toast';

export function useFinanceData() {
  const { user, isDemoMode } = useAuth();
  const userId = user?.id || 'demo-user-myfinance-in';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsGoalContributions, setSavingsGoalContributions] = useState<SavingsGoalContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [syncState, setSyncState] = useState({
    pendingCount: 0,
    isSyncing: false,
    lastError: null as string | null,
  });

  // Subscribe to sync queue updates
  useEffect(() => {
    return syncManager.subscribe(setSyncState);
  }, []);

  // Fetch all user records from Dexie IndexedDB
  const reloadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [
        accs,
        cats,
        txs,
        trfs,
        bdgs,
        lns,
        lnPmts,
        rmds,
        goals,
        goalCtrs,
      ] = await Promise.all([
        db.accounts.where('user_id').equals(userId).toArray(),
        db.categories.where('user_id').equals(userId).toArray(),
        db.transactions.where('user_id').equals(userId).reverse().sortBy('occurred_at'),
        db.transfers.where('user_id').equals(userId).reverse().sortBy('occurred_at'),
        db.budgets.where('user_id').equals(userId).toArray(),
        db.loans.where('user_id').equals(userId).toArray(),
        db.loan_payments.where('user_id').equals(userId).reverse().sortBy('paid_at'),
        db.reminders.where('user_id').equals(userId).sortBy('due_at'),
        db.savings_goals.where('user_id').equals(userId).toArray(),
        db.savings_goal_contributions.where('user_id').equals(userId).toArray(),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs);
      setTransfers(trfs);
      setBudgets(bdgs);
      setLoans(lns);
      setLoanPayments(lnPmts);
      setReminders(rmds);
      setSavingsGoals(goals);
      setSavingsGoalContributions(goalCtrs);
    } catch (err) {
      console.error('Failed to load local finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Derived: Accounts with dynamically calculated current balances
  const accountsWithBalances = useMemo(() => {
    return accounts.map(acc => ({
      ...acc,
      computed_balance: calculateAccountBalance(acc, transactions, transfers, loanPayments),
    }));
  }, [accounts, transactions, transfers, loanPayments]);

  // Derived: Total liquid net balance
  const totalBalance = useMemo(() => {
    return calculateTotalBalance(accounts, transactions, transfers, loanPayments);
  }, [accounts, transactions, transfers, loanPayments]);

  // Derived: Dashboard summary for specified month/year
  const getDashboardSummary = useCallback(
    (year: number, monthIndex: number, accountId?: string | null): DashboardSummary => {
      const inc = calculateMonthlyIncome(transactions, year, monthIndex, accountId);
      const exp = calculateMonthlyExpenses(transactions, year, monthIndex, accountId, loanPayments);
      const net = roundMoney(inc - exp);

      // Find overall monthly budget
      const targetMonthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const overallBudget = budgets.find(b => b.category_id === null && b.month === targetMonthKey);
      const budgetLimit = overallBudget ? Number(overallBudget.limit_amount) : 0;
      const budgetRemaining = budgetLimit > 0 ? roundMoney(budgetLimit - exp) : 0;
      const budgetUsagePercent = budgetLimit > 0 ? roundMoney((exp / budgetLimit) * 100) : 0;

      const savingsTotal = savingsGoals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
      const upcomingRemindersCount = reminders.filter(r => r.status === 'pending').length;
      const overdueRemindersCount = reminders.filter(
        r => r.status === 'pending' && new Date(r.due_at) < new Date()
      ).length;

      const activeLoans = loans.filter(l => l.status === 'active');
      const totalOutstandingDebt = activeLoans.reduce((sum, l) => sum + (Number(l.outstanding_principal) || 0), 0);

      return {
        totalBalance: accountId
          ? accountsWithBalances.find(a => a.id === accountId)?.computed_balance || 0
          : totalBalance,
        monthlyIncome: inc,
        monthlyExpense: exp,
        netCashFlow: net,
        budgetLimit,
        budgetSpent: exp,
        budgetRemaining,
        budgetUsagePercent,
        savingsTotal,
        upcomingRemindersCount,
        overdueRemindersCount,
        activeLoansCount: activeLoans.length,
        totalOutstandingLoanDebt: roundMoney(totalOutstandingDebt),
      };
    },
    [transactions, loanPayments, budgets, savingsGoals, reminders, loans, accountsWithBalances, totalBalance]
  );

  // --------------------------------------------------------------------------
  // TRANSACTIONS CRUD
  // --------------------------------------------------------------------------
  const addTransaction = async (data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const id = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: Transaction = {
      ...data,
      id,
      user_id: userId,
      idempotency_key: idempotencyKey,
      sync_status: isDemoMode ? 'synced' : 'pending',
      created_at: now,
      updated_at: now,
    };

    await db.transactions.add(record);
    if (!isDemoMode) {
      await syncManager.enqueue('transactions', 'insert', record as unknown as Record<string, unknown>, idempotencyKey);
    }
    await reloadData();
    toast.success(`${record.type === 'income' ? 'Income' : 'Expense'} added successfully`);
    return record;
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    const now = new Date().toISOString();
    const updatePayload = { ...data, updated_at: now };

    await db.transactions.update(id, updatePayload);
    if (!isDemoMode) {
      await syncManager.enqueue('transactions', 'update', { id, ...updatePayload }, crypto.randomUUID());
    }
    await reloadData();
    toast.success('Transaction updated');
  };

  const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
    if (!isDemoMode) {
      await syncManager.enqueue('transactions', 'delete', { id }, crypto.randomUUID());
    }
    await reloadData();
    toast.info('Transaction deleted');
  };

  const duplicateTransaction = async (tx: Transaction) => {
    const { id, created_at, updated_at, idempotency_key, sync_status, ...rest } = tx;
    void id; void created_at; void updated_at; void idempotency_key; void sync_status;
    return addTransaction({
      ...rest,
      occurred_at: new Date().toISOString(),
      notes: rest.notes ? `${rest.notes} (Copy)` : 'Copy',
    });
  };

  // --------------------------------------------------------------------------
  // TRANSFERS (Atomic balance transfer without income/expense inflation)
  // --------------------------------------------------------------------------
  const executeTransfer = async (
    sourceAccountId: string,
    destinationAccountId: string,
    amount: number,
    occurredAt: string,
    notes?: string
  ) => {
    if (sourceAccountId === destinationAccountId) {
      throw new Error('Source and destination accounts must be distinct');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero');
    }

    const id = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const now = new Date().toISOString();

    const transfer: Transfer = {
      id,
      user_id: userId,
      source_account_id: sourceAccountId,
      destination_account_id: destinationAccountId,
      amount: roundMoney(amount),
      occurred_at: occurredAt || now,
      notes,
      idempotency_key: idempotencyKey,
      sync_status: isDemoMode ? 'synced' : 'pending',
      created_at: now,
    };

    await db.transfers.add(transfer);
    if (!isDemoMode) {
      await syncManager.enqueue('transfers', 'insert', transfer as unknown as Record<string, unknown>, idempotencyKey);
    }
    await reloadData();
    toast.success('Transfer recorded successfully');
    return transfer;
  };

  // --------------------------------------------------------------------------
  // ACCOUNTS CRUD & RECONCILIATION
  // --------------------------------------------------------------------------
  const addAccount = async (data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const account: Account = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await db.accounts.add(account);
    if (!isDemoMode) {
      await syncManager.enqueue('accounts', 'insert', account as unknown as Record<string, unknown>, crypto.randomUUID());
    }
    await reloadData();
    toast.success(`Account "${account.name}" created`);
    return account;
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    const now = new Date().toISOString();
    await db.accounts.update(id, { ...data, updated_at: now });
    if (!isDemoMode) {
      await syncManager.enqueue('accounts', 'update', { id, ...data, updated_at: now }, crypto.randomUUID());
    }
    await reloadData();
    toast.success('Account updated');
  };

  const archiveAccount = async (id: string, isArchived: boolean) => {
    const now = new Date().toISOString();
    await db.accounts.update(id, {
      is_archived: isArchived,
      archived_at: isArchived ? now : null,
      updated_at: now,
    });
    if (!isDemoMode) {
      await syncManager.enqueue('accounts', 'update', { id, is_archived: isArchived, archived_at: isArchived ? now : null }, crypto.randomUUID());
    }
    await reloadData();
    toast.info(isArchived ? 'Account archived' : 'Account unarchived');
  };

  /**
   * Reconciles an account to match actual bank statement.
   * Creates an adjustment transaction (income or expense) to balance out the difference.
   */
  const reconcileAccount = async (accountId: string, statementBalance: number, notes?: string) => {
    const acc = accountsWithBalances.find(a => a.id === accountId);
    if (!acc) throw new Error('Account not found');

    const currentBal = acc.computed_balance || 0;
    const diff = roundMoney(statementBalance - currentBal);

    if (Math.abs(diff) < 0.01) {
      toast.info('Account is already balanced with statement.');
      return;
    }

    let miscCatId = categories.find(c => c.name.toLowerCase().includes('miscellaneous'))?.id || null;
    if (!miscCatId && categories.length > 0) {
      miscCatId = categories[0].id;
    }

    if (diff > 0) {
      // Adjustment Income
      await addTransaction({
        account_id: accountId,
        type: 'income',
        amount: Math.abs(diff),
        category_id: miscCatId,
        occurred_at: new Date().toISOString(),
        payment_method: 'other',
        notes: notes || `Reconciliation balance adjustment (+₹${Math.abs(diff)})`,
        tags: ['reconciliation'],
      });
    } else {
      // Adjustment Expense
      await addTransaction({
        account_id: accountId,
        type: 'expense',
        amount: Math.abs(diff),
        category_id: miscCatId,
        occurred_at: new Date().toISOString(),
        payment_method: 'other',
        notes: notes || `Reconciliation balance adjustment (-₹${Math.abs(diff)})`,
        tags: ['reconciliation'],
      });
    }
    toast.success('Account reconciled successfully');
  };

  // --------------------------------------------------------------------------
  // BUDGETS CRUD
  // --------------------------------------------------------------------------
  const setBudget = async (
    categoryId: string | null,
    monthStr: string, // YYYY-MM-01
    limitAmount: number,
    thresholds: number[] = [50, 75, 90, 100]
  ) => {
    const existing = budgets.find(b => b.category_id === categoryId && b.month === monthStr);
    const now = new Date().toISOString();

    if (existing) {
      await db.budgets.update(existing.id, {
        limit_amount: roundMoney(limitAmount),
        warning_thresholds: thresholds,
        updated_at: now,
      });
      if (!isDemoMode) {
        await syncManager.enqueue('budgets', 'update', { id: existing.id, limit_amount: limitAmount, updated_at: now }, crypto.randomUUID());
      }
    } else {
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        user_id: userId,
        category_id: categoryId,
        month: monthStr,
        limit_amount: roundMoney(limitAmount),
        warning_thresholds: thresholds,
        created_at: now,
        updated_at: now,
      };
      await db.budgets.add(newBudget);
      if (!isDemoMode) {
        await syncManager.enqueue('budgets', 'insert', newBudget as unknown as Record<string, unknown>, crypto.randomUUID());
      }
    }
    await reloadData();
    toast.success('Budget saved');
  };

  const copyPreviousMonthBudgets = async (sourceMonth: string, targetMonth: string) => {
    const prevBudgets = budgets.filter(b => b.month === sourceMonth);
    if (prevBudgets.length === 0) {
      toast.info('No budgets found in previous month to copy.');
      return;
    }

    for (const b of prevBudgets) {
      await setBudget(b.category_id, targetMonth, b.limit_amount, b.warning_thresholds);
    }
    toast.success(`Copied ${prevBudgets.length} budgets to ${targetMonth}`);
  };

  // --------------------------------------------------------------------------
  // LOANS & EMI REPAYMENTS
  // --------------------------------------------------------------------------
  const addLoan = async (data: Omit<Loan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const loan: Loan = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await db.loans.add(loan);
    if (!isDemoMode) {
      await syncManager.enqueue('loans', 'insert', loan as unknown as Record<string, unknown>, crypto.randomUUID());
    }
    await reloadData();
    toast.success(`Loan "${loan.name}" added`);
    return loan;
  };

  const updateLoan = async (id: string, data: Partial<Loan>) => {
    const now = new Date().toISOString();
    await db.loans.update(id, { ...data, updated_at: now });
    if (!isDemoMode) {
      await syncManager.enqueue('loans', 'update', { id, ...data, updated_at: now }, crypto.randomUUID());
    }
    await reloadData();
    toast.success('Loan updated');
  };

  /**
   * Records a loan payment with explicit principal, interest, and fee components.
   * Updates outstanding principal on the loan, deducts cash from account,
   * and prevents double counting.
   */
  const recordLoanPayment = async (
    loanId: string,
    accountId: string,
    totalAmount: number,
    principalComponent: number,
    interestComponent: number,
    feeComponent: number,
    paidAt: string,
    notes?: string
  ) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Loan not found');

    const expectedTotal = roundMoney(principalComponent + interestComponent + feeComponent);
    if (Math.abs(roundMoney(totalAmount) - expectedTotal) > 0.01) {
      throw new Error(`Total amount (₹${totalAmount}) must match sum of Principal (₹${principalComponent}) + Interest (₹${interestComponent}) + Fees (₹${feeComponent})`);
    }

    const pmtId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const now = new Date().toISOString();

    const payment: LoanPayment = {
      id: pmtId,
      user_id: userId,
      loan_id: loanId,
      account_id: accountId,
      paid_at: paidAt || now,
      total_amount: roundMoney(totalAmount),
      principal_component: roundMoney(principalComponent),
      interest_component: roundMoney(interestComponent),
      fee_component: roundMoney(feeComponent),
      notes,
      idempotency_key: idempotencyKey,
      sync_status: isDemoMode ? 'synced' : 'pending',
      created_at: now,
    };

    // Update loan outstanding balance
    const newOutstanding = Math.max(0, roundMoney(loan.outstanding_principal - principalComponent));
    const isPaidOff = newOutstanding <= 0;

    await db.transaction('rw', [db.loan_payments, db.loans], async () => {
      await db.loan_payments.add(payment);
      await db.loans.update(loanId, {
        outstanding_principal: newOutstanding,
        status: isPaidOff ? 'paid_off' : loan.status,
        updated_at: now,
      });
    });

    if (!isDemoMode) {
      await syncManager.enqueue('loan_payments', 'insert', payment as unknown as Record<string, unknown>, idempotencyKey);
      await syncManager.enqueue('loans', 'update', { id: loanId, outstanding_principal: newOutstanding, status: isPaidOff ? 'paid_off' : loan.status }, crypto.randomUUID());
    }

    await reloadData();
    toast.success('Loan repayment recorded successfully');
  };

  // --------------------------------------------------------------------------
  // REMINDERS & RECURRING PAYMENTS
  // --------------------------------------------------------------------------
  const addReminder = async (data: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const reminder: Reminder = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await db.reminders.add(reminder);
    if (!isDemoMode) {
      await syncManager.enqueue('reminders', 'insert', reminder as unknown as Record<string, unknown>, crypto.randomUUID());
    }
    await reloadData();
    toast.success('Reminder scheduled');
    return reminder;
  };

  const updateReminder = async (id: string, data: Partial<Reminder>) => {
    const now = new Date().toISOString();
    await db.reminders.update(id, { ...data, updated_at: now });
    if (!isDemoMode) {
      await syncManager.enqueue('reminders', 'update', { id, ...data, updated_at: now }, crypto.randomUUID());
    }
    await reloadData();
    toast.success('Reminder updated');
  };

  const markReminderComplete = async (reminderId: string, autoRecordExpense = false) => {
    const rem = reminders.find(r => r.id === reminderId);
    if (!rem) return;

    const now = new Date().toISOString();
    await db.reminders.update(reminderId, {
      status: 'completed',
      completed_at: now,
      updated_at: now,
    });

    // Optionally auto-record the expense in chosen or default account
    if (autoRecordExpense && rem.amount && rem.amount > 0) {
      const defaultAccId = rem.related_account_id || accounts[0]?.id;
      if (defaultAccId) {
        let catId = categories.find(c => c.name.toLowerCase().includes('utilities') || c.name.toLowerCase().includes('bills'))?.id;
        if (!catId && categories.length > 0) catId = categories[0].id;

        await addTransaction({
          account_id: defaultAccId,
          type: 'expense',
          amount: rem.amount,
          category_id: catId || null,
          occurred_at: now,
          payment_method: 'upi',
          notes: `Paid: ${rem.title}`,
          tags: ['reminder_bill'],
        });
      }
    }

    if (!isDemoMode) {
      await syncManager.enqueue('reminders', 'update', { id: reminderId, status: 'completed', completed_at: now }, crypto.randomUUID());
    }
    await reloadData();
    toast.success(`Completed "${rem.title}"`);
  };

  // --------------------------------------------------------------------------
  // SAVINGS GOALS
  // --------------------------------------------------------------------------
  const addSavingsGoal = async (data: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const goal: SavingsGoal = {
      ...data,
      id,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await db.savings_goals.add(goal);
    if (!isDemoMode) {
      await syncManager.enqueue('savings_goals', 'insert', goal as unknown as Record<string, unknown>, crypto.randomUUID());
    }
    await reloadData();
    toast.success(`Savings goal "${goal.name}" set`);
    return goal;
  };

  const contributeToGoal = async (goalId: string, amount: number, accountId?: string, notes?: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) throw new Error('Savings goal not found');

    const contributionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newSaved = roundMoney(goal.saved_amount + amount);
    const isAchieved = newSaved >= goal.target_amount;

    const contribution: SavingsGoalContribution = {
      id: contributionId,
      user_id: userId,
      goal_id: goalId,
      account_id: accountId || null,
      amount: roundMoney(amount),
      contributed_at: now,
      notes,
      created_at: now,
    };

    await db.transaction('rw', [db.savings_goal_contributions, db.savings_goals], async () => {
      await db.savings_goal_contributions.add(contribution);
      await db.savings_goals.update(goalId, {
        saved_amount: newSaved,
        status: isAchieved ? 'achieved' : goal.status,
        updated_at: now,
      });
    });

    if (!isDemoMode) {
      await syncManager.enqueue('savings_goal_contributions', 'insert', contribution as unknown as Record<string, unknown>, crypto.randomUUID());
      await syncManager.enqueue('savings_goals', 'update', { id: goalId, saved_amount: newSaved, status: isAchieved ? 'achieved' : goal.status }, crypto.randomUUID());
    }

    await reloadData();
    toast.success(`Added ₹${amount} towards "${goal.name}"!`);
  };

  return {
    accounts: accountsWithBalances,
    categories,
    transactions,
    transfers,
    budgets,
    loans,
    loanPayments,
    reminders,
    savingsGoals,
    savingsGoalContributions,
    totalBalance,
    isLoading,
    syncState,
    reloadData,
    getDashboardSummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    duplicateTransaction,
    executeTransfer,
    addAccount,
    updateAccount,
    archiveAccount,
    reconcileAccount,
    setBudget,
    copyPreviousMonthBudgets,
    addLoan,
    updateLoan,
    recordLoanPayment,
    addReminder,
    updateReminder,
    markReminderComplete,
    addSavingsGoal,
    contributeToGoal,
  };
}
