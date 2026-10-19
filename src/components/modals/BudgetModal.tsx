import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Category, Budget } from '@/types';

export interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  currentMonth: string; // YYYY-MM
  editingBudget?: Budget | null;
  onSave: (
    categoryId: string | null,
    monthStr: string,
    limitAmount: number,
    thresholds: number[]
  ) => Promise<void>;
}

export function BudgetModal({
  open,
  onOpenChange,
  categories,
  currentMonth,
  editingBudget,
  onSave,
}: BudgetModalProps) {
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const [categoryId, setCategoryId] = useState<string>('overall');
  const [month, setMonth] = useState(currentMonth);
  const [limitAmount, setLimitAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingBudget) {
      setCategoryId(editingBudget.category_id || 'overall');
      setMonth(editingBudget.month.slice(0, 7));
      setLimitAmount(String(editingBudget.limit_amount));
    } else {
      setCategoryId('overall');
      setMonth(currentMonth);
      setLimitAmount('');
    }
    setError(null);
  }, [editingBudget, currentMonth, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedLimit = parseFloat(limitAmount);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setError('Please enter a valid non-negative budget limit.');
      return;
    }

    const monthStr = `${month}-01`;
    const selectedCategory = categoryId === 'overall' ? null : categoryId;

    try {
      setIsSubmitting(true);
      await onSave(selectedCategory, monthStr, parsedLimit, [50, 75, 90, 100]);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget Limit'}
      description="Define spending thresholds to receive real-time warnings before overspending."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Month Selector */}
        <Input
          label="Target Month"
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          required
        />

        {/* Scope: Overall vs Specific Category */}
        <Select
          label="Budget Scope"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          disabled={Boolean(editingBudget)}
        >
          <option value="overall">★ Total Overall Monthly Spending Limit</option>
          <optgroup label="Or Per-Category Limit">
            {expenseCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        </Select>

        {/* Limit Amount */}
        <Input
          label="Monthly Limit (INR)"
          type="number"
          step="0.01"
          placeholder="e.g. 50000"
          value={limitAmount}
          onChange={e => setLimitAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
          autoFocus
        />

        <div className="p-3 rounded-xl bg-card-elevated border border-border text-xs text-muted-foreground flex flex-col gap-1">
          <span className="font-semibold text-foreground">Automatic Alert Thresholds:</span>
          <div className="flex gap-2 mt-1">
            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono text-[11px]">50% Normal</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono text-[11px]">75% Notice</span>
            <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 font-mono text-[11px]">90% Warning</span>
            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono text-[11px]">100% Exceeded</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {editingBudget ? 'Save Budget' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
