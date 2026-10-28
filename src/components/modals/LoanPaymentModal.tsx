import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loan, Account } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';
import { ShieldCheck, Info } from 'lucide-react';

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
    principal: number,
    interest: number,
    fees: number,
    paidAt: string,
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
  const [totalAmount, setTotalAmount] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialLoan = (selectedLoanId && activeLoans.find(l => l.id === selectedLoanId)) || activeLoans[0];
    if (initialLoan) {
      setLoanId(initialLoan.id);
      setTotalAmount(String(initialLoan.emi_amount));
      // Estimate simple split if interest rate available
      if (initialLoan.annual_interest_rate && initialLoan.outstanding_principal) {
        const monthlyInterest = Math.round(
          (initialLoan.outstanding_principal * (initialLoan.annual_interest_rate / 100)) / 12
        );
        const estPrincipal = Math.max(0, initialLoan.emi_amount - monthlyInterest);
        setInterest(String(monthlyInterest));
        setPrincipal(String(estPrincipal));
      } else {
        setPrincipal(String(initialLoan.emi_amount));
        setInterest('0');
      }
    } else {
      setLoanId('');
      setTotalAmount('');
      setPrincipal('');
      setInterest('0');
    }

    setFees('0');
    setAccountId(activeAccounts[0]?.id || '');
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDate(localIso);
    setNotes('');
    setError(null);
  }, [open, selectedLoanId, loans]);

  const currentLoan = loans.find(l => l.id === loanId);
  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedPrincipal = parseFloat(principal) || 0;
  const parsedInterest = parseFloat(interest) || 0;
  const parsedFees = parseFloat(fees) || 0;
  const componentsSum = Math.round((parsedPrincipal + parsedInterest + parsedFees) * 100) / 100;
  const isBalanced = Math.abs(parsedTotal - componentsSum) < 0.01;

  const autoBalancePrincipal = () => {
    const remaining = Math.max(0, parsedTotal - parsedInterest - parsedFees);
    setPrincipal(String(Math.round(remaining * 100) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loanId || !accountId) {
      setError('Please select both a loan and an account.');
      return;
    }

    if (parsedTotal <= 0) {
      setError('Total repayment amount must be greater than zero.');
      return;
    }

    if (!isBalanced) {
      setError(
        `Total payment (₹${parsedTotal}) must equal Principal (₹${parsedPrincipal}) + Interest (₹${parsedInterest}) + Fees (₹${parsedFees}) = ₹${componentsSum}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordPayment(
        loanId,
        accountId,
        parsedTotal,
        parsedPrincipal,
        parsedInterest,
        parsedFees,
        new Date(date).toISOString(),
        notes.trim() || undefined
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
      title="Record Loan / EMI Repayment"
      description="Properly allocate principal reduction and interest expenses to maintain accurate net worth and cash flow."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Accounting Rule Info Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Accounting Guarantee:</strong> The principal component reduces your debt liability, while interest and fees are counted as monthly expense. Your bank account is deducted once, preventing double counting.
          </span>
        </div>

        {/* Loan & Account Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Select Loan"
            value={loanId}
            onChange={e => {
              setLoanId(e.target.value);
              const selected = loans.find(l => l.id === e.target.value);
              if (selected) {
                setTotalAmount(String(selected.emi_amount));
                setPrincipal(String(selected.emi_amount));
                setInterest('0');
              }
            }}
            required
          >
            {activeLoans.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} — O/S {formatINR(l.outstanding_principal)}
              </option>
            ))}
          </Select>

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
        </div>

        {/* Total Amount */}
        <Input
          label="Total Payment Debited (INR)"
          type="number"
          step="0.01"
          value={totalAmount}
          onChange={e => setTotalAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
        />

        {/* Component Breakdown */}
        <div className="p-3.5 rounded-xl bg-card-elevated border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Component Allocation Breakdown
            </span>
            <button
              type="button"
              onClick={autoBalancePrincipal}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Auto-calculate Principal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Principal Component"
              type="number"
              step="0.01"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              helperText="Reduces loan balance"
              required
            />

            <Input
              label="Interest Component"
              type="number"
              step="0.01"
              value={interest}
              onChange={e => setInterest(e.target.value)}
              helperText="Counted as expense"
              required
            />

            <Input
              label="Late / Processing Fees"
              type="number"
              step="0.01"
              value={fees}
              onChange={e => setFees(e.target.value)}
              helperText="Counted as fee expense"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">Components Total:</span>
            <span
              className={`font-mono font-bold ${
                isBalanced ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatINR(componentsSum)} / {formatINR(parsedTotal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment Date & Time"
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
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
            Record Repayment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
