import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loan, LoanStatus } from '@/types';

export interface LoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLoan?: Loan | null;
  onSave: (data: {
    name: string;
    lender: string;
    principal_amount: number;
    outstanding_principal: number;
    annual_interest_rate?: number;
    emi_amount: number;
    due_day?: number;
    start_date: string;
    status: LoanStatus;
    notes?: string;
  }) => Promise<void>;
}

export function LoanModal({ open, onOpenChange, editingLoan, onSave }: LoanModalProps) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [monthlyRepayment, setMonthlyRepayment] = useState('');
  const [repaymentDay, setRepaymentDay] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLender(editingLoan.lender);
      setAmount(String(editingLoan.principal_amount || ''));
      setMonthlyRepayment(String(editingLoan.emi_amount || ''));
      setRepaymentDay(editingLoan.due_day ? String(editingLoan.due_day) : '10');
    } else {
      setName('');
      setLender('');
      setAmount('');
      setMonthlyRepayment('');
      setRepaymentDay('10');
    }
    setError(null);
  }, [editingLoan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    const parsedRepayment = parseFloat(monthlyRepayment);
    const parsedDay = parseInt(repaymentDay, 10);

    if (!name.trim()) {
      setError('Please enter the loan name.');
      return;
    }

    if (!lender.trim()) {
      setError('Please enter the lender name.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid loan amount.');
      return;
    }

    if (isNaN(parsedRepayment) || parsedRepayment <= 0) {
      setError('Please enter a valid monthly repayment amount.');
      return;
    }

    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError('Please enter a valid repayment day between 1 and 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        lender: lender.trim(),
        principal_amount: parsedAmount,
        outstanding_principal: editingLoan?.outstanding_principal ?? parsedAmount,
        emi_amount: parsedRepayment,
        due_day: parsedDay,
        start_date: editingLoan?.start_date || new Date().toISOString().slice(0, 10),
        status: editingLoan?.status || 'active',
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
      title={editingLoan ? 'Edit Loan' : 'Add Loan'}
      description="Enter the loan details, amount, and monthly repayment terms."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 1. Loan Name */}
        <Input
          label="Loan Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />

        {/* 2. Lender Name */}
        <Input
          label="Lender Name"
          value={lender}
          onChange={e => setLender(e.target.value)}
          required
        />

        {/* 3. Amount */}
        <Input
          label="Amount (INR)"
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
        />

        {/* 4. Monthly Repayment & 5. Monthly Date for Repayment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Monthly Repayment (INR)"
            type="number"
            step="0.01"
            value={monthlyRepayment}
            onChange={e => setMonthlyRepayment(e.target.value)}
            startAdornment={<span className="font-bold text-foreground">₹</span>}
            required
          />

          <Input
            label="Monthly Date for Repayment"
            type="number"
            min="1"
            max="31"
            value={repaymentDay}
            onChange={e => setRepaymentDay(e.target.value)}
            helperText="Day of month (1 - 31)"
            required
          />
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
            {editingLoan ? 'Save Loan' : 'Create Loan'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
