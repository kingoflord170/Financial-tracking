import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Account, Category, Loan, PaymentMethod, TransactionType } from '@/types';
import { TransactionModal } from './TransactionModal';
import { TransferModal } from './TransferModal';
import { LoanPaymentModal } from './LoanPaymentModal';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, CreditCard } from 'lucide-react';

export interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  loans: Loan[];
  onAddTransaction: (data: {
    account_id: string;
    type: TransactionType;
    amount: number;
    category_id: string | null;
    occurred_at: string;
    payment_method: PaymentMethod;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  onExecuteTransfer: (
    sourceId: string,
    destId: string,
    amount: number,
    date: string,
    notes?: string
  ) => Promise<void>;
  onRecordLoanPayment: (
    loanId: string,
    accountId: string,
    total: number,
    principal?: number,
    interest?: number,
    fees?: number,
    paidAt?: string,
    notes?: string
  ) => Promise<void>;
}

export function QuickAddModal({
  open,
  onOpenChange,
  accounts,
  categories,
  loans,
  onAddTransaction,
  onExecuteTransfer,
  onRecordLoanPayment,
}: QuickAddModalProps) {
  const [activeModal, setActiveModal] = useState<'expense' | 'income' | 'transfer' | 'loan' | null>(null);

  const handleOpenAction = (action: 'expense' | 'income' | 'transfer' | 'loan') => {
    setActiveModal(action);
  };

  return (
    <>
      <Dialog
        open={open && activeModal === null}
        onOpenChange={onOpenChange}
        title="Quick Financial Action"
        description="Select an action to record an entry or move funds."
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Add Expense */}
          <button
            type="button"
            onClick={() => handleOpenAction('expense')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-elevated hover:bg-card-elevated/80 hover:border-rose-500/40 transition-all text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-foreground">Add Expense</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">Dining, bills, grocery</span>
          </button>

          {/* Add Income */}
          <button
            type="button"
            onClick={() => handleOpenAction('income')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-elevated hover:bg-card-elevated/80 hover:border-emerald-500/40 transition-all text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-foreground">Add Income</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">Salary, freelance, refunds</span>
          </button>

          {/* Transfer Funds */}
          <button
            type="button"
            onClick={() => handleOpenAction('transfer')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-elevated hover:bg-card-elevated/80 hover:border-primary/40 transition-all text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-foreground">Transfer</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">Bank to Cash / UPI</span>
          </button>

          {/* Loan / EMI Payment */}
          <button
            type="button"
            onClick={() => handleOpenAction('loan')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-elevated hover:bg-card-elevated/80 hover:border-amber-500/40 transition-all text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-foreground">Loan EMI</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">Principal + Interest</span>
          </button>
        </div>
      </Dialog>

      {/* Expense Modal */}
      {activeModal === 'expense' && (
        <TransactionModal
          open={true}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setActiveModal(null);
              onOpenChange(false);
            }
          }}
          accounts={accounts}
          categories={categories}
          initialType="expense"
          onSave={async data => {
            await onAddTransaction(data);
            setActiveModal(null);
            onOpenChange(false);
          }}
        />
      )}

      {/* Income Modal */}
      {activeModal === 'income' && (
        <TransactionModal
          open={true}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setActiveModal(null);
              onOpenChange(false);
            }
          }}
          accounts={accounts}
          categories={categories}
          initialType="income"
          onSave={async data => {
            await onAddTransaction(data);
            setActiveModal(null);
            onOpenChange(false);
          }}
        />
      )}

      {/* Transfer Modal */}
      {activeModal === 'transfer' && (
        <TransferModal
          open={true}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setActiveModal(null);
              onOpenChange(false);
            }
          }}
          accounts={accounts}
          onExecute={async (sourceId, destId, amt, dt, notes) => {
            await onExecuteTransfer(sourceId, destId, amt, dt, notes);
            setActiveModal(null);
            onOpenChange(false);
          }}
        />
      )}

      {/* Loan Payment Modal */}
      {activeModal === 'loan' && (
        <LoanPaymentModal
          open={true}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setActiveModal(null);
              onOpenChange(false);
            }
          }}
          loans={loans}
          accounts={accounts}
          onRecordPayment={async (loanId, accId, total, principal, interest, fees, date, notes) => {
            await onRecordLoanPayment(loanId, accId, total, principal, interest, fees, date, notes);
            setActiveModal(null);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
