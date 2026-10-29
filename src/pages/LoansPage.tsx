import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoanModal } from '@/components/modals/LoanModal';
import { LoanPaymentModal } from '@/components/modals/LoanPaymentModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Loan } from '@/types';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import {
  CreditCard,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  Building2,
  Banknote,
} from 'lucide-react';

export function LoansPage() {
  const finance = useFinanceData();

  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | undefined>(undefined);

  const activeLoans = useMemo(() => finance.loans.filter(l => l.status === 'active'), [finance.loans]);

  const totalAmount = useMemo(() => {
    return activeLoans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
  }, [activeLoans]);

  const totalMonthlyRepayment = useMemo(() => {
    return activeLoans.reduce((sum, l) => sum + (Number(l.emi_amount) || 0), 0);
  }, [activeLoans]);

  const handleDeleteLoan = async (loan: Loan) => {
    if (window.confirm(`Are you sure you want to delete the loan "${loan.name}"?`)) {
      await finance.deleteLoan(loan.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Loans
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your loans, monthly repayments, and repayment dates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setPaymentLoanId(undefined);
              setIsRecordPaymentOpen(true);
            }}
            disabled={activeLoans.length === 0}
          >
            <CreditCard className="h-4 w-4" />
            <span>Record Repayment</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5"
            onClick={() => {
              setEditingLoan(null);
              setIsAddLoanOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Add Loan</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-amber-500/30 bg-amber-950/10">
          <span className="text-[11px] text-amber-400 uppercase font-semibold">
            Total Loan Amount
          </span>
          <p className="text-2xl font-black text-amber-400 tabular-nums mt-1">
            {formatINR(totalAmount)}
          </p>
          <span className="text-[10px] text-amber-400/80">Across {activeLoans.length} active loans</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Total Monthly Repayment
          </span>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">
            {formatINR(totalMonthlyRepayment)}
          </p>
          <span className="text-[10px] text-muted-foreground">Combined monthly installment</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Active Loans
          </span>
          <p className="text-2xl font-black text-primary tabular-nums mt-1">
            {activeLoans.length}
          </p>
          <span className="text-[10px] text-muted-foreground">Currently active accounts</span>
        </Card>
      </div>

      {/* Active Loans List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Loans ({activeLoans.length})
        </h3>

        {activeLoans.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Loans Added"
            description="Add your loans to track lender details, amounts, and monthly repayments."
            actionLabel="+ Add Loan"
            onAction={() => {
              setEditingLoan(null);
              setIsAddLoanOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeLoans.map(loan => (
              <Card key={loan.id} className="p-5 flex flex-col justify-between hover:border-border transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">{loan.name}</h4>
                        <Badge variant="outline" className="text-[11px] font-medium flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {loan.lender}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingLoan(loan);
                          setIsAddLoanOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Edit Loan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLoan(loan)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                        title="Delete Loan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Loan Structure Details */}
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-card-elevated border border-border text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1 mb-0.5">
                        <Banknote className="h-3 w-3 text-primary" />
                        Amount
                      </span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {formatINR(loan.principal_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1 mb-0.5">
                        <CreditCard className="h-3 w-3 text-cyan-400" />
                        Monthly Repayment
                      </span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {formatINR(loan.emi_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1 mb-0.5">
                        <Calendar className="h-3 w-3 text-amber-400" />
                        Repayment Date
                      </span>
                      <span className="font-bold text-foreground text-xs">
                        {loan.due_day ? `${loan.due_day}th of month` : 'Monthly'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Action */}
                <div className="flex items-center justify-end pt-3 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="primary"
                    className="gap-1.5"
                    onClick={() => {
                      setPaymentLoanId(loan.id);
                      setIsRecordPaymentOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Record Repayment</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Repayment History Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
          Repayment History ({finance.loanPayments.length})
        </h3>

        {finance.loanPayments.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No repayments logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-card-elevated text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Loan</th>
                  <th className="p-2.5">Paid From</th>
                  <th className="p-2.5">Repayment Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {finance.loanPayments.map(pmt => {
                  const loan = finance.loans.find(l => l.id === pmt.loan_id);
                  const acc = finance.accounts.find(a => a.id === pmt.account_id);

                  return (
                    <tr key={pmt.id} className="hover:bg-card-elevated/40">
                      <td className="p-2.5 whitespace-nowrap">{formatDate(pmt.paid_at, 'short')}</td>
                      <td className="p-2.5 font-bold text-foreground">{loan?.name || 'Loan'}</td>
                      <td className="p-2.5 text-muted-foreground">{acc?.name || 'Account'}</td>
                      <td className="p-2.5 font-mono font-bold text-foreground">{formatINR(pmt.total_amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Loan Add/Edit Modal */}
      <LoanModal
        open={isAddLoanOpen}
        onOpenChange={setIsAddLoanOpen}
        editingLoan={editingLoan}
        onSave={async data => {
          if (editingLoan) {
            await finance.updateLoan(editingLoan.id, data);
          } else {
            await finance.addLoan(data);
          }
        }}
      />

      {/* Record Loan Payment Modal */}
      <LoanPaymentModal
        open={isRecordPaymentOpen}
        onOpenChange={setIsRecordPaymentOpen}
        loans={finance.loans}
        accounts={finance.accounts}
        selectedLoanId={paymentLoanId}
        onRecordPayment={finance.recordLoanPayment}
      />
    </div>
  );
}
