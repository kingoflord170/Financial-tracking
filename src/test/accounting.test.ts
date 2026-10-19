import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalance,
  calculateTotalBalance,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  roundMoney,
} from '@/lib/accounting/calculations';
import { Account, Transaction, Transfer } from '@/types';

describe('Accounting Invariants & Calculations', () => {
  const dummyAccount: Account = {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'HDFC Savings',
    account_type: 'bank',
    opening_balance: 50000,
    currency: 'INR',
    is_archived: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('calculates account balance correctly: opening + income - expense', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'income',
        amount: 25000,
        category_id: null,
        occurred_at: '2026-10-01T10:00:00Z',
        payment_method: 'net_banking',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'tx-2',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'expense',
        amount: 8000,
        category_id: null,
        occurred_at: '2026-10-02T15:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
    ];

    const balance = calculateAccountBalance(dummyAccount, transactions, []);
    // 50,000 + 25,000 - 8,000 = 67,000
    expect(balance).toBe(67000);
  });

  it('prevents floating point arithmetic drift', () => {
    // 0.1 + 0.2 usually results in 0.30000000000000004 in IEEE 754
    const rounded = roundMoney(0.1 + 0.2);
    expect(rounded).toBe(0.3);

    const fractionalAccount: Account = {
      ...dummyAccount,
      opening_balance: 100.1,
    };
    const txs: Transaction[] = [
      {
        id: 'tx-f1',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'income',
        amount: 200.2,
        category_id: null,
        occurred_at: '2026-10-01T10:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
    ];

    const result = calculateAccountBalance(fractionalAccount, txs, []);
    expect(result).toBe(300.3);
  });

  it('calculates total balance across active accounts and excludes archived accounts', () => {
    const activeAcc: Account = { ...dummyAccount, id: 'acc-active', opening_balance: 10000 };
    const archivedAcc: Account = { ...dummyAccount, id: 'acc-archived', opening_balance: 5000, is_archived: true };

    const total = calculateTotalBalance([activeAcc, archivedAcc], [], []);
    expect(total).toBe(10000);
  });

  it('filters monthly income and expenses within strict month boundaries', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-oct-1',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'income',
        amount: 15000,
        category_id: null,
        occurred_at: '2026-10-15T12:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'tx-sep-1',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'income',
        amount: 10000,
        category_id: null,
        occurred_at: '2026-09-30T23:59:59Z', // Prior month
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'tx-oct-exp',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'expense',
        amount: 4500,
        category_id: null,
        occurred_at: '2026-10-20T10:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
    ];

    // Oct 2026 is month index 9 (0-indexed)
    const octIncome = calculateMonthlyIncome(txs, 2026, 9);
    const octExpense = calculateMonthlyExpenses(txs, 2026, 9);

    expect(octIncome).toBe(15000);
    expect(octExpense).toBe(4500);

    // Sep 2026 is month index 8
    const sepIncome = calculateMonthlyIncome(txs, 2026, 8);
    expect(sepIncome).toBe(10000);
  });
});
