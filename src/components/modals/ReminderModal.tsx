import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Reminder, ReminderRecurrence, Account, Loan } from '@/types';

export interface ReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  loans: Loan[];
  editingReminder?: Reminder | null;
  onSave: (data: {
    title: string;
    amount?: number | null;
    due_at: string;
    recurrence_rule: ReminderRecurrence;
    related_account_id?: string | null;
    related_loan_id?: string | null;
    notes?: string;
    status: 'pending' | 'completed' | 'dismissed';
  }) => Promise<void>;
}

export function ReminderModal({
  open,
  onOpenChange,
  accounts,
  loans,
  editingReminder,
  onSave,
}: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('monthly');
  const [relatedAccountId, setRelatedAccountId] = useState('');
  const [relatedLoanId, setRelatedLoanId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      setAmount(editingReminder.amount !== undefined && editingReminder.amount !== null ? String(editingReminder.amount) : '');
      setDueAt(editingReminder.due_at.slice(0, 16));
      setRecurrence(editingReminder.recurrence_rule);
      setRelatedAccountId(editingReminder.related_account_id || '');
      setRelatedLoanId(editingReminder.related_loan_id || '');
      setNotes(editingReminder.notes || '');
    } else {
      setTitle('');
      setAmount('');
      const now = new Date();
      // default 3 days in future at 10:00 AM
      const future = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
      future.setHours(10, 0, 0, 0);
      const localIso = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setDueAt(localIso);
      setRecurrence('monthly');
      setRelatedAccountId('');
      setRelatedLoanId('');
      setNotes('');
    }
    setError(null);
  }, [editingReminder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Reminder title is required.');
      return;
    }

    const parsedAmount = amount ? parseFloat(amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        amount: parsedAmount,
        due_at: new Date(dueAt).toISOString(),
        recurrence_rule: recurrence,
        related_account_id: relatedAccountId || null,
        related_loan_id: relatedLoanId || null,
        notes: notes.trim() || undefined,
        status: editingReminder?.status || 'pending',
      });
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
      title={editingReminder ? 'Edit Bill / Reminder' : 'Set Payment Reminder'}
      description="Stay on top of rent, broadband, credit cards, insurance, and EMI dates."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Reminder Title"
          placeholder="e.g. Airtel Fiber Bill, Flat Rent, Credit Card Due"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Expected Amount (Optional INR)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            startAdornment={<span className="font-bold text-foreground">₹</span>}
          />

          <Input
            label="Due Date & Time"
            type="datetime-local"
            value={dueAt}
            onChange={e => setDueAt(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Recurrence Frequency"
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as ReminderRecurrence)}
          >
            <option value="none">One-time (No Recurrence)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly (e.g. Rent, Utilities)</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly (e.g. Insurance)</option>
          </Select>

          <Select
            label="Related Account (Optional)"
            value={relatedAccountId}
            onChange={e => setRelatedAccountId(e.target.value)}
          >
            <option value="">None / Not linked</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </Select>
        </div>

        {loans.length > 0 && (
          <Select
            label="Related Loan / EMI (Optional)"
            value={relatedLoanId}
            onChange={e => setRelatedLoanId(e.target.value)}
          >
            <option value="">None / Independent Bill</option>
            {loans.map(loan => (
              <option key={loan.id} value={loan.id}>
                {loan.name} ({loan.lender})
              </option>
            ))}
          </Select>
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
            {editingReminder ? 'Save Reminder' : 'Set Reminder'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
