import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SavingsGoal, Account } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';
import { Target, PiggyBank } from 'lucide-react';

export interface SavingsGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  mode?: 'create' | 'contribute';
  selectedGoal?: SavingsGoal | null;
  onSaveGoal: (data: {
    name: string;
    target_amount: number;
    saved_amount: number;
    target_date?: string | null;
    status: 'in_progress' | 'achieved' | 'paused';
  }) => Promise<void>;
  onContribute: (goalId: string, amount: number, accountId?: string, notes?: string) => Promise<void>;
}

export function SavingsGoalModal({
  open,
  onOpenChange,
  accounts,
  mode = 'create',
  selectedGoal,
  onSaveGoal,
  onContribute,
}: SavingsGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialSaved, setInitialSaved] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'create') {
      setName('');
      setTargetAmount('');
      setInitialSaved('0');
      // 1 year from now
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      setTargetDate(future.toISOString().slice(0, 10));
    } else {
      setContributionAmount('');
      setAccountId(accounts[0]?.id || '');
      setNotes('');
    }
    setError(null);
  }, [mode, selectedGoal, accounts, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'contribute') {
      if (!selectedGoal) return;
      const parsedAmount = parseFloat(contributionAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid contribution amount greater than zero.');
        return;
      }
      try {
        setIsSubmitting(true);
        await onContribute(selectedGoal.id, parsedAmount, accountId || undefined, notes.trim() || undefined);
        onOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }

    const parsedTarget = parseFloat(targetAmount);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }

    const parsedInitial = parseFloat(initialSaved) || 0;

    try {
      setIsSubmitting(true);
      await onSaveGoal({
        name: name.trim(),
        target_amount: parsedTarget,
        saved_amount: parsedInitial,
        target_date: targetDate || null,
        status: parsedInitial >= parsedTarget ? 'achieved' : 'in_progress',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isContribute = mode === 'contribute';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isContribute ? `Add Savings to "${selectedGoal?.name}"` : 'Create New Savings Goal'}
      description={
        isContribute
          ? 'Allocate money from an account towards your dedicated savings milestone.'
          : 'Set a target for an emergency fund, home deposit, vacation, or gadget.'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isContribute ? (
          <>
            <div className="p-3.5 rounded-xl bg-card-elevated border border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Currently Saved</span>
                <p className="text-lg font-bold text-foreground">
                  {formatINR(selectedGoal?.saved_amount)} / {formatINR(selectedGoal?.target_amount)}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <Input
              label="Contribution Amount (INR)"
              type="number"
              step="0.01"
              value={contributionAmount}
              onChange={e => setContributionAmount(e.target.value)}
              startAdornment={<span className="font-bold text-foreground">₹</span>}
              required
              autoFocus
            />

            <Select
              label="Deduct From Account (Optional)"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
            >
              <option value="">None / External Allocation</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.computed_balance)})
                </option>
              ))}
            </Select>
          </>
        ) : (
          <>
            <Input
              label="Goal Name"
              value={name}
              onChange={e => setName(e.target.value)}
              startAdornment={<Target className="h-4 w-4 text-muted-foreground" />}
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Target Amount (INR)"
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                startAdornment={<span className="font-bold text-foreground">₹</span>}
                required
              />

              <Input
                label="Already Saved (Starting Amount)"
                type="number"
                step="0.01"
                value={initialSaved}
                onChange={e => setInitialSaved(e.target.value)}
                startAdornment={<span className="font-bold text-foreground">₹</span>}
              />
            </div>

            <Input
              label="Target Completion Date"
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </>
        )}

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
            {isContribute ? 'Add Contribution' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
