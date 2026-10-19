import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Account } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';
import { ArrowRightLeft, Info, AlertTriangle } from 'lucide-react';

export interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onExecute: (
    sourceId: string,
    destId: string,
    amount: number,
    date: string,
    notes?: string
  ) => Promise<void>;
}

export function TransferModal({
  open,
  onOpenChange,
  accounts,
  onExecute,
}: TransferModalProps) {
  const activeAccounts = accounts.filter(a => !a.is_archived);

  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeAccounts.length >= 2) {
      setSourceId(activeAccounts[0].id);
      setDestId(activeAccounts[1].id);
    } else if (activeAccounts.length === 1) {
      setSourceId(activeAccounts[0].id);
      setDestId('');
    }
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDate(localIso);
    setAmount('');
    setNotes('');
    setError(null);
  }, [open, accounts]);

  const sourceAccount = accounts.find(a => a.id === sourceId);
  const destAccount = accounts.find(a => a.id === destId);
  const sourceBalance = sourceAccount?.computed_balance ?? 0;
  const parsedAmount = parseFloat(amount) || 0;
  const isOverdraft = parsedAmount > sourceBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceId || !destId) {
      setError('Please select both source and destination accounts.');
      return;
    }

    if (sourceId === destId) {
      setError('Source and Destination accounts must be different.');
      return;
    }

    if (parsedAmount <= 0) {
      setError('Transfer amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onExecute(sourceId, destId, parsedAmount, new Date(date).toISOString(), notes.trim() || undefined);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer Funds Between Accounts"
      description="Move money between your bank accounts, wallets, or cash reserves."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Accounting Rule Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Accounting Invariant:</strong> Transfers adjust the balances of both accounts equally and do <em>not</em> count as income or expense in your budgets and reports.
          </span>
        </div>

        {/* Source & Destination Account Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Select
              label="Transfer From (Source)"
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              required
            >
              {activeAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.computed_balance)})
                </option>
              ))}
            </Select>
            {sourceAccount && (
              <span className="text-[11px] text-muted-foreground">
                Available: <strong className="text-foreground">{formatINR(sourceBalance)}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Select
              label="Transfer To (Destination)"
              value={destId}
              onChange={e => setDestId(e.target.value)}
              required
            >
              <option value="">Select Destination Account</option>
              {activeAccounts
                .filter(a => a.id !== sourceId)
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatINR(acc.computed_balance)})
                  </option>
                ))}
            </Select>
            {destAccount && (
              <span className="text-[11px] text-muted-foreground">
                Current: <strong className="text-foreground">{formatINR(destAccount.computed_balance)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <Input
          label="Transfer Amount (INR)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
        />

        {/* Low balance warning */}
        {isOverdraft && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Warning: Transfer amount exceeds available balance in source account.</span>
          </div>
        )}

        {/* Date & Time */}
        <Input
          label="Date & Time"
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        {/* Notes */}
        <Input
          label="Notes / Reason"
          placeholder="e.g. ATM withdrawal, Bank to GPay recharge"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
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
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="gap-1.5"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Confirm Transfer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
