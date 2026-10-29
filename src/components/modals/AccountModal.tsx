import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Account, AccountType } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';

export interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAccount?: Account | null;
  mode?: 'create' | 'edit' | 'reconcile';
  onSave: (data: {
    name: string;
    account_type: AccountType;
    opening_balance: number;
    currency: string;
    is_archived: boolean;
    archived_at: string | null;
  }) => Promise<void>;
  onReconcile?: (accountId: string, statementBalance: number, notes?: string) => Promise<void>;
}

export function AccountModal({
  open,
  onOpenChange,
  editingAccount,
  mode = 'create',
  onSave,
  onReconcile,
}: AccountModalProps) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setAccountType(editingAccount.account_type);
      setOpeningBalance(String(editingAccount.opening_balance));
      setStatementBalance(String(editingAccount.computed_balance || 0));
    } else {
      setName('');
      setAccountType('bank');
      setOpeningBalance('0.00');
      setStatementBalance('');
    }
    setReconcileNotes('');
    setError(null);
  }, [editingAccount, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'reconcile') {
      if (!editingAccount || !onReconcile) return;
      const parsedStmt = parseFloat(statementBalance);
      if (isNaN(parsedStmt)) {
        setError('Please enter a valid statement balance.');
        return;
      }
      try {
        setIsSubmitting(true);
        await onReconcile(editingAccount.id, parsedStmt, reconcileNotes);
        onOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }

    const parsedOpening = parseFloat(openingBalance);
    if (isNaN(parsedOpening)) {
      setError('Please enter a valid numeric opening balance.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        account_type: accountType,
        opening_balance: parsedOpening,
        currency: 'INR',
        is_archived: editingAccount?.is_archived || false,
        archived_at: editingAccount?.archived_at || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReconcile = mode === 'reconcile';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isReconcile
          ? `Reconcile ${editingAccount?.name}`
          : editingAccount
          ? 'Edit Account Details'
          : 'Create New Account'
      }
      description={
        isReconcile
          ? 'Match your recorded balance with your official bank or wallet statement.'
          : 'Add a bank account, cash reserve, digital wallet, or investment account.'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isReconcile ? (
          <>
            <div className="p-3.5 rounded-xl bg-card-elevated border border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current Recorded Balance</p>
                <p className="text-lg font-bold text-foreground">
                  {formatINR(editingAccount?.computed_balance)}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                {editingAccount?.account_type.toUpperCase()}
              </span>
            </div>

            <Input
              label="Actual Statement Balance (INR)"
              type="number"
              step="0.01"
              value={statementBalance}
              onChange={e => setStatementBalance(e.target.value)}
              startAdornment={<span className="font-bold text-foreground">₹</span>}
              required
              autoFocus
            />
          </>
        ) : (
          <>
            <Input
              label="Account Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Account Type"
                value={accountType}
                onChange={e => setAccountType(e.target.value as AccountType)}
              >
                <option value="bank">Bank Account</option>
                <option value="cash">Cash in Hand</option>
                <option value="wallet">Digital Wallet / UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="investment">Investment / Demat</option>
                <option value="other">Other Account</option>
              </Select>

              <Input
                label="Opening Balance (INR)"
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                startAdornment={<span className="font-bold text-foreground">₹</span>}
                required
                disabled={Boolean(editingAccount)} // opening balance fixed after creation
                helperText={editingAccount ? 'Opening balance is locked. Use Reconcile to adjust.' : undefined}
              />
            </div>
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
            {isReconcile ? 'Apply Reconciliation' : editingAccount ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
