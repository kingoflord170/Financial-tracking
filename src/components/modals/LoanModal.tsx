import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  const [principalAmount, setPrincipalAmount] = useState('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<LoanStatus>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLender(editingLoan.lender);
      setPrincipalAmount(String(editingLoan.principal_amount));
      setOutstandingPrincipal(String(editingLoan.outstanding_principal));
      setInterestRate(editingLoan.annual_interest_rate !== undefined ? String(editingLoan.annual_interest_rate) : '');
      setEmiAmount(String(editingLoan.emi_amount));
      setDueDay(editingLoan.due_day ? String(editingLoan.due_day) : '10');
      setStartDate(editingLoan.start_date);
      setStatus(editingLoan.status);
      setNotes(editingLoan.notes || '');
    } else {
      setName('');
      setLender('');
      setPrincipalAmount('');
      setOutstandingPrincipal('');
      setInterestRate('');
      setEmiAmount('');
      setDueDay('10');
      setStartDate(new Date().toISOString().slice(0, 10));
      setStatus('active');
      setNotes('');
    }
    setError(null);
  }, [editingLoan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrincipal = parseFloat(principalAmount);
    const parsedOutstanding = parseFloat(outstandingPrincipal || principalAmount);
    const parsedEmi = parseFloat(emiAmount);
    const parsedRate = interestRate ? parseFloat(interestRate) : undefined;
    const parsedDueDay = dueDay ? parseInt(dueDay, 10) : undefined;

    if (isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
      setError('Please enter a valid positive principal amount.');
      return;
    }

    if (isNaN(parsedEmi) || parsedEmi < 0) {
      setError('Please enter a valid monthly EMI amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        lender: lender.trim(),
        principal_amount: parsedPrincipal,
        outstanding_principal: isNaN(parsedOutstanding) ? parsedPrincipal : parsedOutstanding,
        annual_interest_rate: parsedRate,
        emi_amount: parsedEmi,
        due_day: parsedDueDay,
        start_date: startDate,
        status,
        notes: notes.trim() || undefined,
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
      title={editingLoan ? 'Edit Loan Account' : 'Add New Loan or EMI'}
      description="Track auto loans, home loans, education loans, or personal debt."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Loan Name"
            placeholder="e.g. Car Loan (Nexon EV), Home Loan"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Lender / Bank"
            placeholder="e.g. HDFC Bank, SBI, Tata Capital"
            value={lender}
            onChange={e => setLender(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Original Principal (INR)"
            type="number"
            step="0.01"
            placeholder="500000"
            value={principalAmount}
            onChange={e => {
              setPrincipalAmount(e.target.value);
              if (!editingLoan && !outstandingPrincipal) {
                setOutstandingPrincipal(e.target.value);
              }
            }}
            startAdornment={<span className="font-bold text-foreground">₹</span>}
            required
          />

          <Input
            label="Current Outstanding Principal (INR)"
            type="number"
            step="0.01"
            placeholder="420000"
            value={outstandingPrincipal}
            onChange={e => setOutstandingPrincipal(e.target.value)}
            startAdornment={<span className="font-bold text-foreground">₹</span>}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Annual Interest Rate (%)"
            type="number"
            step="0.01"
            placeholder="8.5"
            value={interestRate}
            onChange={e => setInterestRate(e.target.value)}
            endAdornment={<span className="text-muted-foreground font-mono text-xs">%</span>}
          />

          <Input
            label="Monthly EMI (INR)"
            type="number"
            step="0.01"
            placeholder="12500"
            value={emiAmount}
            onChange={e => setEmiAmount(e.target.value)}
            startAdornment={<span className="font-bold text-foreground">₹</span>}
            required
          />

          <Input
            label="Due Day of Month"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={e => setDueDay(e.target.value)}
            placeholder="10"
            helperText="1 - 31"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />

          <Select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value as LoanStatus)}
          >
            <option value="active">Active Loan</option>
            <option value="paid_off">Paid Off</option>
            <option value="closed">Closed / Foreclosed</option>
          </Select>
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
