import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinanceData } from '@/hooks/useFinanceData';
import { formatINR, formatPercent, formatDate } from '@/lib/accounting/formatters';
import { downloadFile } from '@/lib/export/csv';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#f97316', '#14b8a6', '#6366f1',
];

export function ReportsPage() {
  const finance = useFinanceData();

  const now = new Date();
  const currentMonthNum = now.getMonth();
  const currentYear = now.getFullYear();

  // Multi-month comparison (Last 6 Months)
  const monthlyTrends = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthNum - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      let income = 0;
      let expense = 0;

      for (const tx of finance.transactions) {
        const txDate = new Date(tx.occurred_at);
        if (txDate.getFullYear() === y && txDate.getMonth() === m) {
          if (tx.type === 'income') income += tx.amount;
          if (tx.type === 'expense') expense += tx.amount;
        }
      }

      const netCashFlow = Math.round((income - expense) * 100) / 100;
      const savingsRate = income > 0 ? Math.max(0, Math.round((netCashFlow / income) * 100)) : 0;

      list.push({
        month: monthLabel,
        Income: Math.round(income),
        Expense: Math.round(expense),
        NetCashFlow: netCashFlow,
        SavingsRate: savingsRate,
      });
    }
    return list;
  }, [finance.transactions, currentYear, currentMonthNum]);

  // Current vs Prior Month delta
  const monthOverMonth = useMemo(() => {
    const current = monthlyTrends[5] || { Income: 0, Expense: 0, NetCashFlow: 0 };
    const prior = monthlyTrends[4] || { Income: 0, Expense: 0, NetCashFlow: 0 };

    const incomeDelta = prior.Income > 0 ? ((current.Income - prior.Income) / prior.Income) * 100 : 0;
    const expenseDelta = prior.Expense > 0 ? ((current.Expense - prior.Expense) / prior.Expense) * 100 : 0;

    return {
      current,
      prior,
      incomeDelta: Math.round(incomeDelta * 10) / 10,
      expenseDelta: Math.round(expenseDelta * 10) / 10,
    };
  }, [monthlyTrends]);

  // Category spending all-time or last 6 months
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of finance.transactions) {
      if (tx.type !== 'expense') continue;
      const cat = finance.categories.find(c => c.id === tx.category_id);
      const name = cat?.name || 'Uncategorized';
      map.set(name, (map.get(name) || 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [finance.transactions, finance.categories]);

  // Export Report to CSV
  const handleExportReportCsv = () => {
    let csv = 'Month,Income (INR),Expense (INR),Net Cash Flow (INR),Savings Rate (%)\n';
    for (const row of monthlyTrends) {
      csv += `"${row.month}",${row.Income},${row.Expense},${row.NetCashFlow},${row.SavingsRate}%\n`;
    }
    downloadFile(csv, `financial_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Financial Analytics & Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            6-month longitudinal trends, cash flow velocity, and savings rate analysis
          </p>
        </div>

        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportReportCsv}>
          <Download className="h-4 w-4" />
          <span>Export Analytics CSV</span>
        </Button>
      </div>

      {/* Month-over-Month Delta Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Income Comparison */}
        <Card className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Month-over-Month Income
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-400 tabular-nums">
              {formatINR(monthOverMonth.current.Income)}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                monthOverMonth.incomeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {monthOverMonth.incomeDelta >= 0 ? '+' : ''}
              {monthOverMonth.incomeDelta}% vs last mo
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Prior: {formatINR(monthOverMonth.prior.Income)}</span>
        </Card>

        {/* Expense Comparison */}
        <Card className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Month-over-Month Expenses
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-400 tabular-nums">
              {formatINR(monthOverMonth.current.Expense)}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                monthOverMonth.expenseDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {monthOverMonth.expenseDelta >= 0 ? '+' : ''}
              {monthOverMonth.expenseDelta}% vs last mo
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Prior: {formatINR(monthOverMonth.prior.Expense)}</span>
        </Card>

        {/* Current Savings Rate */}
        <Card className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Monthly Savings Rate
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-primary tabular-nums">
              {monthOverMonth.current.SavingsRate}%
            </span>
            <span className="text-xs font-bold font-mono text-muted-foreground">
              Net: {formatINR(monthOverMonth.current.NetCashFlow)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Percentage of earnings retained</span>
        </Card>
      </div>

      {/* Main Income vs Expense 6-Month Chart */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
          <p className="text-xs text-muted-foreground">Excludes internal account transfers</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net Cash Flow Trend Line Chart */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Net Cash Flow & Savings Trend</CardTitle>
          <p className="text-xs text-muted-foreground">Monthly surplus or deficit</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
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
                <Line
                  type="monotone"
                  dataKey="NetCashFlow"
                  name="Net Cash Flow"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#38bdf8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
          Historical Category Spend Breakdown
        </h3>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-card-elevated text-muted-foreground border-b border-border">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-right">Total Spent</th>
                <th className="p-2.5 text-right">Share of Total Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {categoryBreakdown.map((cat, idx) => {
                const totalAll = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
                const share = totalAll > 0 ? (cat.amount / totalAll) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-card-elevated/40">
                    <td className="p-2.5 font-semibold text-foreground flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      {cat.name}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-foreground">
                      {formatINR(cat.amount)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      {formatPercent(share)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
