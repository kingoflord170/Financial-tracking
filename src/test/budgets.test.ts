import { describe, it, expect } from 'vitest';
import { calculateBudgetUsage } from '@/lib/accounting/calculations';
import { Budget, Transaction } from '@/types';

describe('Budget Calculations & Threshold Warnings', () => {
  const overallBudget: Budget = {
    id: 'b-overall',
    user_id: 'user-1',
    category_id: null,
    month: '2026-10-01',
    limit_amount: 50000,
    warning_thresholds: [50, 75, 90, 100],
    created_at: '',
    updated_at: '',
  };

  const diningBudget: Budget = {
    id: 'b-dining',
    user_id: 'user-1',
    category_id: 'cat-dining',
    month: '2026-10-01',
    limit_amount: 10000,
    warning_thresholds: [50, 75, 90, 100],
    created_at: '',
    updated_at: '',
  };

  it('accurately computes spent, remaining, and percentage used', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'expense',
        amount: 25000,
        category_id: 'cat-groceries',
        occurred_at: '2026-10-05T12:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
    ];

    const status = calculateBudgetUsage(overallBudget, txs);
    expect(status.spent).toBe(25000);
    expect(status.remaining).toBe(25000);
    expect(status.percentageUsed).toBe(50);
    expect(status.isOverBudget).toBe(false);
    expect(status.alertLevel).toBe('info');
  });

  it('triggers warning and danger thresholds when spending approaches or exceeds limit', () => {
    // 75% spending
    const tx75: Transaction = {
      id: 'tx-75',
      user_id: 'user-1',
      account_id: 'acc-1',
      type: 'expense',
      amount: 37500,
      category_id: null,
      occurred_at: '2026-10-10T12:00:00Z',
      payment_method: 'upi',
      created_at: '',
      updated_at: '',
    };
    const status75 = calculateBudgetUsage(overallBudget, [tx75]);
    expect(status75.alertLevel).toBe('warning');

    // 95% spending
    const tx95: Transaction = {
      ...tx75,
      amount: 47500,
    };
    const status95 = calculateBudgetUsage(overallBudget, [tx95]);
    expect(status95.alertLevel).toBe('danger');
    expect(status95.isOverBudget).toBe(false);

    // 105% spending (Over Budget)
    const tx105: Transaction = {
      ...tx75,
      amount: 52500,
    };
    const status105 = calculateBudgetUsage(overallBudget, [tx105]);
    expect(status105.alertLevel).toBe('danger');
    expect(status105.isOverBudget).toBe(true);
    expect(status105.remaining).toBe(-2500);
  });

  it('filters category budgets strictly by category_id', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-dining',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'expense',
        amount: 3500,
        category_id: 'cat-dining',
        occurred_at: '2026-10-12T20:00:00Z',
        payment_method: 'upi',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'tx-fuel',
        user_id: 'user-1',
        account_id: 'acc-1',
        type: 'expense',
        amount: 2000,
        category_id: 'cat-fuel', // Different category
        occurred_at: '2026-10-13T10:00:00Z',
        payment_method: 'card',
        created_at: '',
        updated_at: '',
      },
    ];

    const diningStatus = calculateBudgetUsage(diningBudget, txs);
    // Only the 3,500 dining expense should count towards the dining budget
    expect(diningStatus.spent).toBe(3500);
    expect(diningStatus.remaining).toBe(6500);
    expect(diningStatus.percentageUsed).toBe(35);
  });
});
