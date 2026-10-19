import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalance,
  calculateTotalBalance,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
} from '@/lib/accounting/calculations';
import { Account, Transfer, Transaction } from '@/types';

describe('Inter-Account Transfers Invariant', () => {
  const bankAccount: Account = {
    id: 'acc-bank',
    user_id: 'user-1',
    name: 'Primary Bank',
    account_type: 'bank',
    opening_balance: 100000,
    currency: 'INR',
    is_archived: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const cashAccount: Account = {
    id: 'acc-cash',
    user_id: 'user-1',
    name: 'Cash Wallet',
    account_type: 'cash',
    opening_balance: 5000,
    currency: 'INR',
    is_archived: false,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('adjusts source and destination balances equally and accurately', () => {
    const transfer: Transfer = {
      id: 'tr-1',
      user_id: 'user-1',
      source_account_id: 'acc-bank',
      destination_account_id: 'acc-cash',
      amount: 10000,
      occurred_at: '2026-10-05T12:00:00Z',
      notes: 'ATM Cash Withdrawal',
      created_at: '',
    };

    const bankBal = calculateAccountBalance(bankAccount, [], [transfer]);
    const cashBal = calculateAccountBalance(cashAccount, [], [transfer]);

    // Bank should be 100,000 - 10,000 = 90,000
    expect(bankBal).toBe(90000);

    // Cash should be 5,000 + 10,000 = 15,000
    expect(cashBal).toBe(15000);

    // Total net worth must remain conserved (105,000)
    const total = calculateTotalBalance([bankAccount, cashAccount], [], [transfer]);
    expect(total).toBe(105000);
  });

  it('transfers are strictly NEVER counted as income or expense', () => {
    const transfer: Transfer = {
      id: 'tr-2',
      user_id: 'user-1',
      source_account_id: 'acc-bank',
      destination_account_id: 'acc-cash',
      amount: 25000,
      occurred_at: '2026-10-08T10:00:00Z',
      created_at: '',
    };

    // Ordinary transaction list (empty)
    const txs: Transaction[] = [];

    const monthlyIncome = calculateMonthlyIncome(txs, 2026, 9);
    const monthlyExpense = calculateMonthlyExpenses(txs, 2026, 9);

    expect(monthlyIncome).toBe(0);
    expect(monthlyExpense).toBe(0);
  });
});
