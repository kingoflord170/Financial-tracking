import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAuth } from '@/hooks/useAuth';
import { formatINR, formatCompactINR, formatDate, formatPercent } from '@/lib/accounting/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  AlertTriangle,
  Plus,
  Calendar,
  PiggyBank,
  CheckCircle2,
  Clock,
  CreditCard,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { NavPage } from '@/components/layout/Sidebar';

export interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
  onOpenQuickAdd: () => void;
}

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#f97316', '#14b8a6', '#6366f1',
];

export function DashboardPage({ onNavigate, onOpenQuickAdd }: DashboardPageProps) {
  const { isDemoMode } = useAuth();
  const finance = useFinanceData();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0 - 11

  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
  const targetMonthIndex = selMonthNum - 1;

  // Filtered account ID
  const activeAccFilter = selectedAccountId === 'all' ? null : selectedAccountId;

  // Authoritative Summary
  const summary = useMemo(() => {
    return finance.getDashboardSummary(selYear, targetMonthIndex, activeAccFilter);
  }, [finance, selYear, targetMonthIndex, activeAccFilter]);

  // Category breakdown for Donut Chart
  const categorySpending = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; color: string }>();

    for (const tx of finance.transactions) {
      if (tx.type !== 'expense') continue;
      if (activeAccFilter && tx.account_id !== activeAccFilter) continue;
      const d = new Date(tx.occurred_at);
      if (d.getFullYear() !== selYear || d.getMonth() !== targetMonthIndex) continue;

      const cat = finance.categories.find(c => c.id === tx.category_id);
      const catName = cat?.name || 'Uncategorized';
      const catColor = cat?.color || '#64748b';

      const existing = map.get(catName);
      if (existing) {
        existing.amount += Number(tx.amount) || 0;
      } else {
        map.set(catName, { name: catName, amount: Number(tx.amount) || 0, color: catColor });
      }
    }

    return Array.from(map.values())
      .map(item => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [finance.transactions, finance.categories, selYear, targetMonthIndex, activeAccFilter]);

  // Daily Spending Trend for Area Chart
  const dailySpendingTrend = useMemo(() => {
    const daysInMonth = new Date(selYear, targetMonthIndex + 1, 0).getDate();
    const dayMap = new Map<number, number>();
    for (let day = 1; day <= daysInMonth; day++) dayMap.set(day, 0);

    for (const tx of finance.transactions) {
      if (tx.type !== 'expense') continue;
      if (activeAccFilter && tx.account_id !== activeAccFilter) continue;
      const d = new Date(tx.occurred_at);
      if (d.getFullYear() === selYear && d.getMonth() === targetMonthIndex) {
        const day = d.getDate();
        dayMap.set(day, (dayMap.get(day) || 0) + (Number(tx.amount) || 0));
      }
    }

    return Array.from(dayMap.entries()).map(([day, amt]) => ({
      day: `${day}`,
      spending: Math.round(amt),
    }));
  }, [finance.transactions, selYear, targetMonthIndex, activeAccFilter]);

  // Recent 6 transactions
  const recentTransactions = useMemo(() => {
    return finance.transactions.slice(0, 6);
  }, [finance.transactions]);

  // Active loan items
  const activeLoans = finance.loans.filter(l => l.status === 'active');

  const isBrandNewUser = finance.transactions.length === 0 && finance.accounts.length <= 3 && summary.monthlyIncome === 0 && summary.monthlyExpense === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              Financial Overview
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time accounting ledger • Standard INR format (₹)
          </p>
        </div>

        {/* Month Selector & Account Filter */}
        <div className="flex items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input-border bg-input-bg text-xs font-semibold text-input-fg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border shadow-sm cursor-pointer"
          />

          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input-border bg-input-bg text-xs font-semibold text-input-fg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border shadow-sm cursor-pointer"
          >
            <option value="all" className="bg-input-bg text-input-fg">
              All Accounts ({formatCompactINR(finance.totalBalance)})
            </option>
            {finance.accounts.map(acc => (
              <option key={acc.id} value={acc.id} className="bg-input-bg text-input-fg">
                {acc.name} ({formatCompactINR(acc.computed_balance || 0)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget Warning Banner (If approaching or exceeded) */}
      {summary.budgetLimit > 0 && summary.budgetUsagePercent >= 90 && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border ${
            summary.budgetUsagePercent >= 100
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">
                {summary.budgetUsagePercent >= 100 ? 'Budget Exceeded!' : 'Budget Warning:'}
              </span>{' '}
              You have used {formatPercent(summary.budgetUsagePercent)} of your ₹{summary.budgetLimit.toLocaleString('en-IN')} monthly limit.
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-card/40" onClick={() => onNavigate('budgets')}>
            Review Budget
          </Button>
        </div>
      )}

      {/* Guided Empty State for Brand New Accounts */}
      {isBrandNewUser && (
        <EmptyState
          icon={Wallet}
          title="Welcome to MyFinance!"
          description="Your financial dashboard is ready. Add your first transaction or record your bank opening balance to start tracking your cash flow and budgets."
          actionLabel="+ Add First Transaction"
          onAction={onOpenQuickAdd}
          secondaryActionLabel="Configure Accounts"
          onSecondaryAction={() => onNavigate('accounts')}
        />
      )}

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total Liquid Net Balance */}
        <Card className="p-4 sm:p-5 glow-border relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Balance</span>
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-foreground tabular-nums">
            {formatINR(summary.totalBalance)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            Across {finance.accounts.filter(a => !a.is_archived).length} active liquid accounts
          </div>
        </Card>

        {/* Monthly Income */}
        <Card className="p-4 sm:p-5 border-emerald-500/30 bg-emerald-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Monthly Income</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 tabular-nums">
            {formatINR(summary.monthlyIncome)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <span>Posted for {selectedMonth}</span>
          </div>
        </Card>

        {/* Monthly Expenses */}
        <Card className="p-4 sm:p-5 border-rose-500/30 bg-rose-950/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Monthly Expenses</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-400 tabular-nums">
            {formatINR(summary.monthlyExpense)}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 flex items-center gap-1">
            <span>Excludes inter-account transfers</span>
          </div>
        </Card>

        {/* Net Cash Flow */}
        <Card className="p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Flow</span>
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-2xl font-black tabular-nums ${
              summary.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatINR(summary.netCashFlow)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Income minus expenses this month
          </div>
        </Card>
      </div>

      {/* Monthly Budget Progress Card */}
      {summary.budgetLimit > 0 && (
        <Card className="p-4 sm:p-5 bg-card border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Monthly Overall Budget</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Spent: <strong className="text-foreground">{formatINR(summary.budgetSpent)}</strong>
              </span>
              <span className="text-muted-foreground">
                Limit: <strong className="text-foreground">{formatINR(summary.budgetLimit)}</strong>
              </span>
              <span
                className={`font-bold font-mono px-2 py-0.5 rounded ${
                  summary.budgetRemaining >= 0
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {summary.budgetRemaining >= 0 ? `${formatINR(summary.budgetRemaining)} Left` : 'Over Budget'}
              </span>
            </div>
          </div>
          <Progress
            value={summary.budgetUsagePercent}
            variant={
              summary.budgetUsagePercent >= 100
                ? 'danger'
                : summary.budgetUsagePercent >= 75
                ? 'warning'
                : 'success'
            }
          />
        </Card>
      )}

      {/* Charts Row: Category Breakdown Donut & Daily Trend Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Spending Donut */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Spending by Category</CardTitle>
              <p className="text-xs text-muted-foreground">Expense distribution for {selectedMonth}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNavigate('budgets')}>
              View Budgets
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {categorySpending.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-xs text-muted-foreground">
                No expense transactions recorded in {selectedMonth}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpending}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {categorySpending.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categorySpending.slice(0, 6).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="truncate text-foreground">{cat.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-muted-foreground shrink-0">
                        {formatINR(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Spending Trend Area Chart */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daily Spending Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Day-to-day expenditure pacing</p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNavigate('reports')}>
              Full Analytics
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpendingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={val => `₹${val}`} />
                  <Tooltip
                    formatter={(val: number) => formatINR(val)}
                    labelFormatter={lbl => `Day ${lbl}`}
                    contentStyle={{
                      backgroundColor: '#0d121d',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spending"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#spendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Recent Transactions & Active Loans / Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions (Span 2) */}
        <Card className="lg:col-span-2 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground">Latest financial postings</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onNavigate('transactions')}>
              View All History
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No transactions posted yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentTransactions.map(tx => {
                const cat = finance.categories.find(c => c.id === tx.category_id);
                const acc = finance.accounts.find(a => a.id === tx.account_id);
                const isIncome = tx.type === 'income';

                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">
                          {tx.notes || cat?.name || (isIncome ? 'Income' : 'Expense')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{acc?.name || 'Account'}</span>
                          <span>•</span>
                          <span>{formatDate(tx.occurred_at, 'short')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isIncome ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {tx.payment_method}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Side Column: Upcoming Reminders & Active EMI */}
        <div className="space-y-4">
          {/* Upcoming Bills Card */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Upcoming Reminders
              </span>
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => onNavigate('reminders')}>
                View All
              </Button>
            </div>

            {finance.reminders.filter(r => r.status === 'pending').length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <span>No pending bill reminders.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {finance.reminders
                  .filter(r => r.status === 'pending')
                  .slice(0, 3)
                  .map(r => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-card-elevated border border-border flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Due {formatDate(r.due_at, 'short')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-foreground">
                          {r.amount ? formatINR(r.amount) : 'Bill'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Active Loans & EMI Card */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-amber-400" /> Active Loans ({activeLoans.length})
              </span>
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => onNavigate('loans')}>
                Manage
              </Button>
            </div>

            {activeLoans.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No active loans or debts.
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.slice(0, 2).map(loan => {
                  const progress = loan.principal_amount > 0
                    ? Math.round(((loan.principal_amount - loan.outstanding_principal) / loan.principal_amount) * 100)
                    : 0;

                  return (
                    <div key={loan.id} className="p-3 rounded-xl bg-card-elevated border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate">{loan.name}</span>
                        <span className="font-mono text-muted-foreground">EMI: {formatINR(loan.emi_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>O/S: {formatINR(loan.outstanding_principal)}</span>
                        <span>{progress}% Paid</span>
                      </div>
                      <Progress value={progress} variant="gradient" className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
