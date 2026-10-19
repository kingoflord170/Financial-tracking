import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Account, Category, PaymentMethod, Transaction, TransactionType } from '@/types';

export interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  onSave: (data: {
    account_id: string;
    type: TransactionType;
    amount: number;
    category_id: string | null;
    occurred_at: string;
    payment_method: PaymentMethod;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
}

export function TransactionModal({
  open,
  onOpenChange,
  accounts,
  categories,
  initialType = 'expense',
  editingTransaction,
  onSave,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setAccountId(editingTransaction.account_id);
      setCategoryId(editingTransaction.category_id || '');
      setDate(editingTransaction.occurred_at.slice(0, 16));
      setPaymentMethod(editingTransaction.payment_method);
      setNotes(editingTransaction.notes || '');
      setTagsInput((editingTransaction.tags || []).join(', '));
    } else {
      setType(initialType);
      setAmount('');
      const firstValidAcc = accounts.find(a => !a.is_archived)?.id || accounts[0]?.id || '';
      setAccountId(firstValidAcc);
      setCategoryId('');
      const now = new Date();
      // Format as local YYYY-MM-DDTHH:mm
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setDate(localIso);
      setPaymentMethod('upi');
      setNotes('');
      setTagsInput('');
    }
    setError(null);
  }, [editingTransaction, initialType, accounts, open]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      await onSave({
        account_id: accountId,
        type,
        amount: parsedAmount,
        category_id: categoryId || null,
        occurred_at: new Date(date).toISOString(),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        tags,
      });
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
      title={editingTransaction ? 'Edit Transaction' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
      description="Record an income or expense with accurate account allocation."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type Toggle */}
        {!editingTransaction && (
          <div className="grid grid-cols-2 p-1 bg-card-elevated rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Income (+)
            </button>
          </div>
        )}

        {/* Amount Input */}
        <Input
          label="Amount (INR)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          startAdornment={<span className="font-bold text-foreground">₹</span>}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Account */}
          <Select
            label="Account"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            required
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id} disabled={acc.is_archived}>
                {acc.name} {acc.is_archived ? '(Archived)' : ''}
              </option>
            ))}
          </Select>

          {/* Category */}
          <Select
            label="Category"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
          >
            <option value="">Select Category (Optional)</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date & Time */}
          <Input
            label="Date & Time"
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />

          {/* Payment Method */}
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
            <option value="cash">Cash</option>
            <option value="card">Debit / Credit Card</option>
            <option value="net_banking">Net Banking / IMPS / NEFT</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </Select>
        </div>

        {/* Description / Notes */}
        <Input
          label="Notes / Description"
          placeholder="e.g. Weekly grocery restock from Blinkit"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        {/* Tags */}
        <Input
          label="Tags (Comma separated)"
          placeholder="e.g. food, weekend, personal"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
        />

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
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
            variant={type === 'income' ? 'success' : 'primary'}
            size="sm"
            isLoading={isSubmitting}
          >
            {editingTransaction ? 'Save Changes' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
