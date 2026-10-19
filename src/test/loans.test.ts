import { describe, it, expect } from 'vitest';
import {
  calculateLoanSummary,
  calculateAccountBalance,
  calculateMonthlyExpenses,
} from '@/lib/accounting/calculations';
import { Loan, LoanPayment, Account } from '@/types';

describe('Loan & EMI Accounting Allocation', () => {
  const loan: Loan = {
    id: 'loan-1',
    user_id: 'user-1',
    name: 'Car Loan',
    lender: 'SBI',
    principal_amount: 500000,
    outstanding_principal: 500000,
    annual_interest_rate: 9.0,
    emi_amount: 15000,
    start_date: '2026-01-01',
    status: 'active',
    created_at: '',
    updated_at: '',
  };

  const bankAccount: Account = {
    id: 'acc-bank',
    user_id: 'user-1',
    name: 'Primary Bank',
    account_type: 'bank',
    opening_balance: 100000,
    currency: 'INR',
    is_archived: false,
    archived_at: null,
    created_at: '',
    updated_at: '',
  };

  it('allocates principal repayment and reduces outstanding debt accurately', () => {
    const payments: LoanPayment[] = [
      {
        id: 'pmt-1',
        user_id: 'user-1',
        loan_id: 'loan-1',
        account_id: 'acc-bank',
        paid_at: '2026-10-10T10:00:00Z',
        total_amount: 15000,
        principal_component: 11250,
        interest_component: 3750,
        fee_component: 0,
        created_at: '',
      },
    ];

    const summary = calculateLoanSummary(loan, payments);

    expect(summary.totalPaid).toBe(15000);
    expect(summary.totalPrincipalPaid).toBe(11250);
    expect(summary.totalInterestPaid).toBe(3750);
    // Outstanding should decrease by principal only: 500,000 - 11,250 = 488,750
    expect(summary.outstandingPrincipal).toBe(488750);
  });

  it('deducts full EMI from bank account without double counting', () => {
    const payments: LoanPayment[] = [
      {
        id: 'pmt-1',
        user_id: 'user-1',
        loan_id: 'loan-1',
        account_id: 'acc-bank',
        paid_at: '2026-10-10T10:00:00Z',
        total_amount: 15000,
        principal_component: 11250,
        interest_component: 3750,
        fee_component: 0,
        created_at: '',
      },
    ];

    const bankBalance = calculateAccountBalance(bankAccount, [], [], payments);
    // Bank should be 100,000 - 15,000 = 85,000
    expect(bankBalance).toBe(85000);
  });

  it('counts interest as true monthly expense while treating principal repayment as liability reduction', () => {
    const payments: LoanPayment[] = [
      {
        id: 'pmt-1',
        user_id: 'user-1',
        loan_id: 'loan-1',
        account_id: 'acc-bank',
        paid_at: '2026-10-10T10:00:00Z',
        total_amount: 15000,
        principal_component: 11250,
        interest_component: 3750,
        fee_component: 0,
        created_at: '',
      },
    ];

    // Expense calculation for October (index 9)
    const expenses = calculateMonthlyExpenses([], 2026, 9, null, payments);
    // Only the interest component (3,750) is counted as consumption expense
    expect(expenses).toBe(3750);
  });
});
