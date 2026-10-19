import { Account, Transaction, Transfer, Loan, LoanPayment, Budget } from '@/types';

/**
 * Rounds a monetary amount to 2 decimal places using standard financial rounding
 * to prevent IEEE 754 floating point drift.
 */
export function roundMoney(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the authoritative current balance of a single account:
 * Opening balance
 * + Posted income for this account
 * - Posted expenses for this account
 * + Incoming transfers into this account
 * - Outgoing transfers from this account
 * - Direct loan payments drawn from this account (if not already counted via a linked expense transaction)
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  transfers: Transfer[],
  loanPayments: LoanPayment[] = []
): number {
  let balance = Number(account.opening_balance) || 0;

  // 1. Transactions (Income adds, Expense subtracts)
  for (const tx of transactions) {
    if (tx.account_id !== account.id) continue;
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      balance += amount;
    } else if (tx.type === 'expense') {
      balance -= amount;
    }
  }

  // 2. Transfers (Never counted as income or expense!)
  for (const tr of transfers) {
    const amount = Number(tr.amount) || 0;
    if (tr.destination_account_id === account.id) {
      balance += amount;
    }
    if (tr.source_account_id === account.id) {
      balance -= amount;
    }
  }

  // 3. Loan payments:
  // If a loan payment does NOT have a linked_expense_transaction_id in the transactions list,
  // it directly reduces this account balance to prevent double counting.
  for (const lp of loanPayments) {
    if (lp.account_id !== account.id) continue;
    // Check if there is already an expense transaction recording this payment
    const hasLinkedTx = lp.linked_expense_transaction_id && 
      transactions.some(t => t.id === lp.linked_expense_transaction_id);
    if (!hasLinkedTx) {
      balance -= Number(lp.total_amount) || 0;
    }
  }

  return roundMoney(balance);
}

/**
 * Calculates the total net worth across all non-archived liquid accounts.
 */
export function calculateTotalBalance(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  loanPayments: LoanPayment[] = []
): number {
  const activeAccounts = accounts.filter(a => !a.is_archived);
  let total = 0;
  for (const acc of activeAccounts) {
    total += calculateAccountBalance(acc, transactions, transfers, loanPayments);
  }
  return roundMoney(total);
}

/**
 * Checks if a date falls within the target year and month (0-indexed month: 0=Jan, 11=Dec).
 */
export function isDateInMonth(dateInput: string | Date, year: number, month: number): boolean {
  if (typeof dateInput === 'string' && dateInput.length >= 7) {
    const parts = dateInput.slice(0, 7).split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        return y === year && m === month;
      }
    }
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() === month;
}

/**
 * Calculates monthly posted income. Transfers are strictly excluded.
 */
export function calculateMonthlyIncome(
  transactions: Transaction[],
  year: number,
  month: number,
  accountId?: string | null
): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    if (accountId && tx.account_id !== accountId) continue;
    if (isDateInMonth(tx.occurred_at, year, month)) {
      sum += Number(tx.amount) || 0;
    }
  }
  return roundMoney(sum);
}

/**
 * Calculates monthly posted expenses.
 * Transfers are strictly excluded.
 */
export function calculateMonthlyExpenses(
  transactions: Transaction[],
  year: number,
  month: number,
  accountId?: string | null,
  loanPayments: LoanPayment[] = []
): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (accountId && tx.account_id !== accountId) continue;
    if (isDateInMonth(tx.occurred_at, year, month)) {
      sum += Number(tx.amount) || 0;
    }
  }

  // Add any unlinked interest/fee component of loan payments (principal is asset transfer, not consumption)
  for (const lp of loanPayments) {
    if (accountId && lp.account_id !== accountId) continue;
    if (isDateInMonth(lp.paid_at, year, month)) {
      const hasLinkedTx = lp.linked_expense_transaction_id && 
        transactions.some(t => t.id === lp.linked_expense_transaction_id);
      if (!hasLinkedTx) {
        // Interest + fees are true expenses
        const expensePortion = (Number(lp.interest_component) || 0) + (Number(lp.fee_component) || 0);
        sum += expensePortion;
      }
    }
  }

  return roundMoney(sum);
}

/**
 * Calculates budget usage for an overall or category-specific budget for a given month.
 */
export function calculateBudgetUsage(
  budget: Budget,
  transactions: Transaction[]
): {
  limit: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  alertLevel: 'normal' | 'info' | 'warning' | 'danger';
} {
  const [bYear, bMonth] = budget.month.split('-').map(Number);
  const targetYear = bYear;
  const targetMonth = bMonth - 1; // 0-indexed month

  let spent = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!isDateInMonth(tx.occurred_at, targetYear, targetMonth)) continue;

    // If budget is category specific, filter by category
    if (budget.category_id) {
      if (tx.category_id === budget.category_id) {
        spent += Number(tx.amount) || 0;
      }
    } else {
      // Overall monthly budget
      spent += Number(tx.amount) || 0;
    }
  }

  const limit = Number(budget.limit_amount) || 0;
  const roundedSpent = roundMoney(spent);
  const remaining = roundMoney(limit - roundedSpent);
  const percentageUsed = limit > 0 ? roundMoney((roundedSpent / limit) * 100) : 0;
  const isOverBudget = roundedSpent > limit;

  let alertLevel: 'normal' | 'info' | 'warning' | 'danger' = 'normal';
  if (percentageUsed >= 100) {
    alertLevel = 'danger';
  } else if (percentageUsed >= 90) {
    alertLevel = 'danger';
  } else if (percentageUsed >= 75) {
    alertLevel = 'warning';
  } else if (percentageUsed >= 50) {
    alertLevel = 'info';
  }

  return {
    limit,
    spent: roundedSpent,
    remaining,
    percentageUsed,
    isOverBudget,
    alertLevel,
  };
}

/**
 * Calculates current loan summary:
 * - Total principal paid
 * - Total interest paid
 * - Total fees paid
 * - Current real-time outstanding principal
 */
export function calculateLoanSummary(
  loan: Loan,
  payments: LoanPayment[]
): {
  originalPrincipal: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalFeesPaid: number;
  totalPaid: number;
  outstandingPrincipal: number;
  repaymentProgressPercent: number;
} {
  const loanPayments = payments.filter(p => p.loan_id === loan.id);
  
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalFeesPaid = 0;
  let totalPaid = 0;

  for (const p of loanPayments) {
    totalPrincipalPaid += Number(p.principal_component) || 0;
    totalInterestPaid += Number(p.interest_component) || 0;
    totalFeesPaid += Number(p.fee_component) || 0;
    totalPaid += Number(p.total_amount) || 0;
  }

  const originalPrincipal = Number(loan.principal_amount) || 0;
  // Outstanding is original principal minus all principal repayments
  const outstandingPrincipal = Math.max(0, roundMoney(originalPrincipal - totalPrincipalPaid));
  const repaymentProgressPercent = originalPrincipal > 0 
    ? roundMoney((totalPrincipalPaid / originalPrincipal) * 100) 
    : 100;

  return {
    originalPrincipal,
    totalPrincipalPaid: roundMoney(totalPrincipalPaid),
    totalInterestPaid: roundMoney(totalInterestPaid),
    totalFeesPaid: roundMoney(totalFeesPaid),
    totalPaid: roundMoney(totalPaid),
    outstandingPrincipal,
    repaymentProgressPercent: Math.min(100, repaymentProgressPercent),
  };
}
