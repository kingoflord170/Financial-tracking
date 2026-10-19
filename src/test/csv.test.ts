import { describe, it, expect } from 'vitest';
import { parseAndValidateCsv } from '@/lib/export/csv';
import { Transaction, Account } from '@/types';

describe('CSV Parsing, Validation & Duplicate Detection', () => {
  const dummyAccounts: Account[] = [
    {
      id: 'acc-hdfc',
      user_id: 'user-1',
      name: 'HDFC Bank',
      account_type: 'bank',
      opening_balance: 10000,
      currency: 'INR',
      is_archived: false,
      archived_at: null,
      created_at: '',
      updated_at: '',
    },
  ];

  const existingTransactions: Transaction[] = [
    {
      id: 'tx-existing',
      user_id: 'user-1',
      account_id: 'acc-hdfc',
      type: 'expense',
      amount: 1450,
      category_id: null,
      occurred_at: '2026-10-15T10:00:00.000Z',
      payment_method: 'upi',
      notes: 'Dinner at Social',
      created_at: '',
      updated_at: '',
    },
  ];

  it('correctly parses valid CSV rows with Indian Rupee formatting', () => {
    const csvContent = `Date,Type,Amount,Category,Account,Notes
2026-10-16,Expense,2500,Groceries,HDFC Bank,Weekly supermarket restock
2026-10-17,Income,₹45000,Salary,HDFC Bank,Consulting payment`;

    const result = parseAndValidateCsv(csvContent, existingTransactions, dummyAccounts);

    expect(result.totalRows).toBe(2);
    expect(result.validRows.length).toBe(2);
    expect(result.errorRows.length).toBe(0);

    expect(result.validRows[0].amount).toBe(2500);
    expect(result.validRows[0].type).toBe('expense');

    expect(result.validRows[1].amount).toBe(45000);
    expect(result.validRows[1].type).toBe('income');
  });

  it('detects duplicate entries matching existing transaction date, amount and type', () => {
    const csvContent = `Date,Type,Amount,Category,Account,Notes
2026-10-15,Expense,1450,Food,HDFC Bank,Dinner at Social
2026-10-18,Expense,850,Fuel,HDFC Bank,Auto recharge`;

    const result = parseAndValidateCsv(csvContent, existingTransactions, dummyAccounts);

    expect(result.totalRows).toBe(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.validRows[0].isDuplicate).toBe(true);
    expect(result.validRows[1].isDuplicate).toBe(false);
  });

  it('flags invalid rows with missing or malformed amounts', () => {
    const csvContent = `Date,Type,Amount,Category,Notes
2026-10-16,Expense,INVALID_AMOUNT,Food,Test note
2026-10-17,Expense,-500,Shopping,Negative amount invalid`;

    const result = parseAndValidateCsv(csvContent, existingTransactions, dummyAccounts);

    expect(result.validRows.length).toBe(0);
    expect(result.errorRows.length).toBe(2);
  });
});
