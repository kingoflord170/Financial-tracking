import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loan, LoanStatus } from '@/types';
import { Calendar, Sparkles } from 'lucide-react';

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

const COMMON_DAYS = [1, 5, 10, 15, 20, 25, 28, 31];

export function LoanModal({ open, onOpenChange, editingLoan, onSave }: LoanModalProps) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [monthlyRepayment, setMonthlyRepayment] = useState('');
  const [repaymentDay, setRepaymentDay] = useState('10');
  const [calendarDate, setCalendarDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLender(editingLoan.lender);
      setAmount(String(editingLoan.principal_amount || ''));
      setMonthlyRepayment(String(editingLoan.emi_amount || ''));
      const day = editingLoan.due_day ? String(editingLoan.due_day) : '10';
      setRepaymentDay(day);

      // Construct a calendar date with that day
      const now = new Date();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      setCalendarDate(`${now.getFullYear()}-${monthStr}-${dayStr}`);
    } else {
      setName('');
      setLender('');
      setAmount('');
      setMonthlyRepayment('');
      setRepaymentDay('10');
      const now = new Date();
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      setCalendarDate(`${now.getFullYear()}-${monthStr}-10`);
    }
    setError(null);
  }, [editingLoan, open]);

  // Handle date selection from the calendar popup
  const handleCalendarDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCalendarDate(val);
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        if (day >= 1 && day <= 31) {
          setRepaymentDay(String(day));
        }
      }
    }
  };

  const openCalendarPicker = () => {
    try {
      datePickerRef.current?.showPicker();
    } catch {
      datePickerRef.current?.focus();
    }
  };

  // Compute next repayment date description
  const parsedDay = parseInt(repaymentDay, 10);
  const nextDueDateInfo = (() => {
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) return null;
    const now = new Date();
    const curDay = now.getDate();
    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();

    if (curDay > parsedDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(parsedDay, maxDays);
    const targetDate = new Date(targetYear, targetMonth, actualDay);

    const diffDays = Math.ceil((targetDate.getTime() - new Date(now.getFullYear(), now.getMonth(), curDay).getTime()) / (1000 * 60 * 60 * 24));
    const formatted = targetDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return { formatted, diffDays };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    const parsedRepayment = parseFloat(monthlyRepayment);
    const day = parseInt(repaymentDay, 10);

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

    if (isNaN(day) || day < 1 || day > 31) {
      setError('Please enter a valid monthly repayment date (between 1 and 31).');
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
        due_day: day,
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

        {/* 4. Monthly Repayment */}
        <Input
          label="Monthly Repayment (INR)"
          type="number"
          step="0.01"
          value={monthlyRepayment}
          onChange={e => setMonthlyRepayment(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
        />

        {/* 5. Monthly Date for Repayment (Interactive Calendar Picker) */}
        <div className="space-y-2 p-3.5 rounded-xl bg-card-elevated border border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-400" />
              Monthly Date for Repayment
              <span className="text-destructive">*</span>
            </label>

            {nextDueDateInfo && (
              <span className="text-[11px] font-medium text-amber-400">
                Next: {nextDueDateInfo.formatted} ({nextDueDateInfo.diffDays === 0 ? 'Today' : `${nextDueDateInfo.diffDays}d left`})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Direct Day Input */}
            <Input
              label="Day of Month (1 - 31)"
              type="number"
              min="1"
              max="31"
              value={repaymentDay}
              onChange={e => setRepaymentDay(e.target.value)}
              required
            />

            {/* Calendar Date Picker Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select via Calendar
              </label>
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={openCalendarPicker}
                  tabIndex={-1}
                  className="absolute left-3 text-primary hover:text-primary-hover p-0.5 cursor-pointer z-10"
                  title="Open Calendar Picker"
                >
                  <Calendar className="h-4 w-4" />
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={calendarDate}
                  onChange={handleCalendarDateSelect}
                  className="flex h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3 py-2 text-sm text-input-fg font-medium transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border"
                />
              </div>
            </div>
          </div>

          {/* Quick Select Preset Days */}
          <div className="pt-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1.5">
              Quick Select Common Due Dates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_DAYS.map(day => {
                const isSelected = parsedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setRepaymentDay(String(day));
                      const now = new Date();
                      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(day).padStart(2, '0');
                      setCalendarDate(`${now.getFullYear()}-${monthStr}-${dayStr}`);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary-hover'
                    }`}
                  >
                    {day === 1 ? '1st' : day === 31 ? 'Last (31st)' : `${day}th`}
                  </button>
                );
              })}
            </div>
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
            {editingLoan ? 'Save Loan' : 'Create Loan'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
