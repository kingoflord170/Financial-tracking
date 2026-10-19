import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { LoanModal } from '@/components/modals/LoanModal';
import { LoanPaymentModal } from '@/components/modals/LoanPaymentModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Loan } from '@/types';
import { calculateLoanSummary } from '@/lib/accounting/calculations';
import { formatINR, formatDate, formatPercent } from '@/lib/accounting/formatters';
import {
  CreditCard,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function LoansPage() {
  const finance = useFinanceData();

  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | undefined>(undefined);

  const activeLoans = useMemo(() => finance.loans.filter(l => l.status === 'active'), [finance.loans]);
  const closedLoans = useMemo(() => finance.loans.filter(l => l.status !== 'active'), [finance.loans]);

  const totalOutstandingDebt = useMemo(() => {
    return activeLoans.reduce((sum, l) => sum + (Number(l.outstanding_principal) || 0), 0);
  }, [activeLoans]);

  const totalMonthlyEmi = useMemo(() => {
    return activeLoans.reduce((sum, l) => sum + (Number(l.emi_amount) || 0), 0);
  }, [activeLoans]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Loans, Liabilities & EMI
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track active loan liabilities, amortization, and properly allocate principal vs interest
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
            <span>Record EMI Payment</span>
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
            Total Outstanding Debt
          </span>
          <p className="text-2xl font-black text-amber-400 tabular-nums mt-1">
            {formatINR(totalOutstandingDebt)}
          </p>
          <span className="text-[10px] text-amber-400/80">Across {activeLoans.length} active loans</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Total Monthly EMI Obligation
          </span>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">
            {formatINR(totalMonthlyEmi)}
          </p>
          <span className="text-[10px] text-muted-foreground">Fixed auto-debit requirement</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Repayments Recorded
          </span>
          <p className="text-2xl font-black text-primary tabular-nums mt-1">
            {finance.loanPayments.length}
          </p>
          <span className="text-[10px] text-muted-foreground">Historical EMI postings</span>
        </Card>
      </div>

      {/* Accounting Invariant Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card-elevated border border-border text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground">Strict Loan Accounting Rules:</span>
          <p className="mt-0.5">
            When recording an EMI repayment, the <strong>principal component</strong> reduces your loan balance (asset/liability equity change), while the <strong>interest component and processing fees</strong> are recognized as actual consumption expenses. Your source bank account balance is debited exactly once.
          </p>
        </div>
      </div>

      {/* Active Loans List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Active Loans ({activeLoans.length})
        </h3>

        {activeLoans.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Active Loans or Debt"
            description="You are currently debt free! If you have an auto loan, personal loan, or mortgage, add it here to track amortization."
            actionLabel="+ Add Loan Account"
            onAction={() => {
              setEditingLoan(null);
              setIsAddLoanOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeLoans.map(loan => {
              const summary = calculateLoanSummary(loan, finance.loanPayments);

              return (
                <Card key={loan.id} className="p-5 flex flex-col justify-between hover:border-border transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-foreground">{loan.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{loan.lender}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Started: {loan.start_date} • Due Day: {loan.due_day ? `${loan.due_day}th` : 'Monthly'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setEditingLoan(loan);
                          setIsAddLoanOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Progress Bar of Principal Reduction */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Paid: <strong className="text-foreground">{formatINR(summary.totalPrincipalPaid)}</strong>
                        </span>
                        <span className="font-mono text-muted-foreground">
                          Original: {formatINR(summary.originalPrincipal)}
                        </span>
                      </div>
                      <Progress value={summary.repaymentProgressPercent} variant="gradient" className="h-2" />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatPercent(summary.repaymentProgressPercent)} Principal Repaid</span>
                        <span>Outstanding: <strong className="text-amber-400 font-mono">{formatINR(summary.outstandingPrincipal)}</strong></span>
                      </div>
                    </div>

                    {/* Loan Breakdown Details */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-card-elevated border border-border text-xs mb-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Monthly EMI</span>
                        <span className="font-bold text-foreground font-mono">{formatINR(loan.emi_amount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Interest Rate</span>
                        <span className="font-bold text-foreground font-mono">
                          {loan.annual_interest_rate ? `${loan.annual_interest_rate}% p.a.` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Interest Paid</span>
                        <span className="font-bold text-rose-400 font-mono">{formatINR(summary.totalInterestPaid)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
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
                      <span>Record EMI Payment</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
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
            No EMI repayments logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-card-elevated text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Loan</th>
                  <th className="p-2.5">Account</th>
                  <th className="p-2.5">Total Paid</th>
                  <th className="p-2.5">Principal Component</th>
                  <th className="p-2.5">Interest Component</th>
                  <th className="p-2.5">Notes</th>
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
                      <td className="p-2.5 font-mono text-emerald-400">-{formatINR(pmt.principal_component)}</td>
                      <td className="p-2.5 font-mono text-rose-400">-{formatINR(pmt.interest_component)}</td>
                      <td className="p-2.5 text-muted-foreground truncate max-w-[150px]">{pmt.notes || '-'}</td>
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
