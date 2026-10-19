import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { BudgetModal } from '@/components/modals/BudgetModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Budget } from '@/types';
import { calculateBudgetUsage } from '@/lib/accounting/calculations';
import { formatINR, formatPercent } from '@/lib/accounting/formatters';
import {
  PiggyBank,
  Plus,
  Copy,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function BudgetsPage() {
  const finance = useFinanceData();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const targetMonthStr = `${selectedMonth}-01`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Budgets for the selected month
  const monthBudgets = useMemo(() => {
    return finance.budgets.filter(b => b.month === targetMonthStr);
  }, [finance.budgets, targetMonthStr]);

  // Overall budget if exists
  const overallBudget = useMemo(() => {
    return monthBudgets.find(b => b.category_id === null);
  }, [monthBudgets]);

  // Category specific budgets
  const categoryBudgets = useMemo(() => {
    return monthBudgets.filter(b => b.category_id !== null);
  }, [monthBudgets]);

  // Overall calculation
  const overallStatus = useMemo(() => {
    if (!overallBudget) return null;
    return calculateBudgetUsage(overallBudget, finance.transactions);
  }, [overallBudget, finance.transactions]);

  // Previous month string
  const previousMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [selectedMonth]);

  const handleCopyPrevMonth = async () => {
    await finance.copyPreviousMonthBudgets(previousMonthStr, targetMonthStr);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Monthly Budgets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure overall monthly spending limits and fine-grained category allocations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Picker */}
          <div className="flex items-center gap-1.5 bg-input-bg border border-input-border px-2.5 py-1 rounded-lg">
            <Calendar className="h-4 w-4 text-input-placeholder" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-input-fg focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleCopyPrevMonth}
            title="Duplicate budgets from previous month"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy from Prior Month</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Set Budget</span>
          </Button>
        </div>
      </div>

      {/* Overall Monthly Budget Hero Card */}
      {overallStatus && overallBudget ? (
        <Card className="p-5 glow-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Overall Monthly Limit</h3>
                <span className="text-xs text-muted-foreground">Applies to all eligible posted expenses</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  overallStatus.isOverBudget
                    ? 'destructive'
                    : overallStatus.percentageUsed >= 90
                    ? 'warning'
                    : 'success'
                }
                className="text-xs px-2.5 py-1 font-bold"
              >
                {overallStatus.isOverBudget
                  ? 'Budget Exceeded!'
                  : `${formatPercent(overallStatus.percentageUsed)} Consumed`}
              </Badge>

              <button
                onClick={() => {
                  setEditingBudget(overallBudget);
                  setIsModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Edit overall budget"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress
            value={overallStatus.percentageUsed}
            variant={
              overallStatus.isOverBudget
                ? 'danger'
                : overallStatus.percentageUsed >= 75
                ? 'warning'
                : 'success'
            }
            className="h-2.5 mb-4"
          />

          <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Spent</span>
              <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                {formatINR(overallStatus.spent)}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Remaining</span>
              <p
                className={`text-base sm:text-lg font-bold tabular-nums ${
                  overallStatus.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatINR(overallStatus.remaining)}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Monthly Limit</span>
              <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                {formatINR(overallStatus.limit)}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <PiggyBank className="h-4 w-4 text-primary" />
            <span>No overall monthly spending limit set for {selectedMonth}.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
          >
            + Set Overall Limit
          </Button>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Category Budgets ({categoryBudgets.length})
        </h3>

        {categoryBudgets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No Category Budgets Configured"
            description="Set limits on Dining, Groceries, Shopping, or Entertainment to get proactive alerts before you overspend."
            actionLabel="+ Add Category Budget"
            onAction={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map(budget => {
              const cat = finance.categories.find(c => c.id === budget.category_id);
              const status = calculateBudgetUsage(budget, finance.transactions);

              return (
                <Card key={budget.id} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.color || '#3b82f6' }}
                        />
                        <span className="text-sm font-bold text-foreground truncate">{cat?.name || 'Category'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setEditingBudget(budget);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Spent: <strong className="text-foreground">{formatINR(status.spent)}</strong>
                        </span>
                        <span className="font-mono text-muted-foreground">
                          Limit: {formatINR(status.limit)}
                        </span>
                      </div>
                      <Progress
                        value={status.percentageUsed}
                        variant={
                          status.isOverBudget ? 'danger' : status.percentageUsed >= 75 ? 'warning' : 'success'
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span
                      className={`font-mono font-bold ${
                        status.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatINR(status.remaining)} ({formatPercent(status.percentageUsed)})
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <BudgetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={finance.categories}
        currentMonth={selectedMonth}
        editingBudget={editingBudget}
        onSave={finance.setBudget}
      />
    </div>
  );
}
