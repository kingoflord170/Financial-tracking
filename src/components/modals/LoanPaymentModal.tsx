import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Loan, Account } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';

export interface LoanPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loans: Loan[];
  accounts: Account[];
  selectedLoanId?: string;
  onRecordPayment: (
    loanId: string,
    accountId: string,
    totalAmount: number,
    principal?: number,
    interest?: number,
    fees?: number,
    paidAt?: string,
    notes?: string
  ) => Promise<void>;
}

export function LoanPaymentModal({
  open,
  onOpenChange,
  loans,
  accounts,
  selectedLoanId,
  onRecordPayment,
}: LoanPaymentModalProps) {
  const activeLoans = loans.filter(l => l.status === 'active');
  const activeAccounts = accounts.filter(a => !a.is_archived);

  const [loanId, setLoanId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialLoan = (selectedLoanId && activeLoans.find(l => l.id === selectedLoanId)) || activeLoans[0];
    if (initialLoan) {
      setLoanId(initialLoan.id);
      setAmount(String(initialLoan.emi_amount || ''));
    } else {
      setLoanId('');
      setAmount('');
    }

    setAccountId(activeAccounts[0]?.id || '');
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDate(localIso);
    setError(null);
  }, [open, selectedLoanId, loans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);

    if (!loanId) {
      setError('Please select a loan.');
      return;
    }

    if (!accountId) {
      setError('Please select an account to pay from.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid repayment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordPayment(
        loanId,
        accountId,
        parsedAmount,
        parsedAmount,
        0,
        0,
        new Date(date).toISOString()
      );
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
      title="Record Loan Repayment"
      description="Record a monthly repayment towards your loan liability."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Loan Selection */}
        <Select
          label="Select Loan"
          value={loanId}
          onChange={e => {
            setLoanId(e.target.value);
            const selected = loans.find(l => l.id === e.target.value);
            if (selected) {
              setAmount(String(selected.emi_amount || ''));
            }
          }}
          required
        >
          {activeLoans.map(l => (
            <option key={l.id} value={l.id}>
              {l.name} • {l.lender} (Monthly Repayment: {formatINR(l.emi_amount)})
            </option>
          ))}
        </Select>

        {/* Account Selection */}
        <Select
          label="Paid From Account"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          required
        >
          {activeAccounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({formatINR(acc.computed_balance)})
            </option>
          ))}
        </Select>

        {/* Repayment Amount */}
        <Input
          label="Repayment Amount (INR)"
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
        />

        {/* Repayment Date & Time (Calendar & Clock Pickers) */}
        <DateTimePicker
          label="Repayment Date & Time"
          value={date}
          onChange={setDate}
          required
        />

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
            Record Repayment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
