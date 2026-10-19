import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import {
  TrendingUp,
  Plus,
  Briefcase,
  Laptop,
  Coins,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function IncomePage() {
  const finance = useFinanceData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Income transactions
  const incomeTransactions = useMemo(() => {
    return finance.transactions.filter(t => t.type === 'income');
  }, [finance.transactions]);

  // Current month income
  const currentMonthTotal = useMemo(() => {
    return incomeTransactions
      .filter(t => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [incomeTransactions, currentYear, currentMonth]);

  // Income by category breakdown for BarChart
  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of incomeTransactions) {
      const d = new Date(tx.occurred_at);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const cat = finance.categories.find(c => c.id === tx.category_id);
        const name = cat?.name || 'Other Income';
        map.set(name, (map.get(name) || 0) + tx.amount);
      }
    }
    return Array.from(map.entries()).map(([source, amount]) => ({
      source,
      amount: Math.round(amount),
    }));
  }, [incomeTransactions, finance.categories, currentYear, currentMonth]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Income Streams & Earnings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track salary credits, freelance earnings, dividends, cashbacks, and reimbursements
          </p>
        </div>

        <Button
          size="sm"
          variant="success"
          className="gap-1.5"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Record Income</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] text-emerald-400 uppercase font-semibold">
            This Month's Realized Income
          </span>
          <p className="text-2xl font-black text-emerald-400 tabular-nums mt-1">
            +{formatINR(currentMonthTotal)}
          </p>
          <span className="text-[10px] text-emerald-400/80">Posted in {now.toLocaleString('default', { month: 'long' })}</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            All-Time Income Recorded
          </span>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">
            {formatINR(incomeTransactions.reduce((sum, t) => sum + t.amount, 0))}
          </p>
          <span className="text-[10px] text-muted-foreground">Across {incomeTransactions.length} credits</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Active Income Streams
          </span>
          <p className="text-2xl font-black text-primary tabular-nums mt-1">
            {finance.categories.filter(c => c.type === 'income').length}
          </p>
          <span className="text-[10px] text-muted-foreground">Configured categories</span>
        </Card>
      </div>

      {/* Income Stream Breakdown Chart */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Income by Stream ({now.toLocaleString('default', { month: 'long', year: 'numeric' })})</CardTitle>
          <p className="text-xs text-muted-foreground">Earnings distribution across income sources</p>
        </CardHeader>
        <CardContent className="p-0">
          {incomeByCategory.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              No income entries recorded for this month.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="source" stroke="#64748b" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={val => `₹${val}`} />
                  <Tooltip
                    formatter={(val: number) => formatINR(val)}
                    contentStyle={{
                      backgroundColor: '#0d121d',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Posting History */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
          Income History ({incomeTransactions.length})
        </h3>

        {incomeTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No income credits recorded yet. Click "Record Income" above to post your salary or revenue.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {incomeTransactions.map(tx => {
              const cat = finance.categories.find(c => c.id === tx.category_id);
              const acc = finance.accounts.find(a => a.id === tx.account_id);

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        {tx.notes || cat?.name || 'Income Credit'}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="text-emerald-400 font-semibold">{cat?.name}</span>
                        <span>•</span>
                        <span>Deposited into {acc?.name}</span>
                        <span>•</span>
                        <span>{formatDate(tx.occurred_at, 'full')}</span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-sm font-bold text-emerald-400">
                    +{formatINR(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Record Income Modal */}
      <TransactionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        accounts={finance.accounts}
        categories={finance.categories}
        initialType="income"
        onSave={async data => {
          await finance.addTransaction(data);
        }}
      />
    </div>
  );
}
