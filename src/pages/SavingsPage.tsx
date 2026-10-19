import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { SavingsGoalModal } from '@/components/modals/SavingsGoalModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { SavingsGoal } from '@/types';
import { formatINR, formatPercent, formatDate } from '@/lib/accounting/formatters';
import {
  Target,
  Plus,
  PiggyBank,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function SavingsPage() {
  const finance = useFinanceData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'contribute'>('create');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const totalSaved = useMemo(() => {
    return finance.savingsGoals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  }, [finance.savingsGoals]);

  const totalTarget = useMemo(() => {
    return finance.savingsGoals.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
  }, [finance.savingsGoals]);

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Savings Goals & Milestones
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lock funds away for an emergency fund, travel, gold, vehicle, or dream purchase
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          className="gap-1.5"
          onClick={() => {
            setSelectedGoal(null);
            setModalMode('create');
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span>New Savings Goal</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 glow-border">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Total Accumulated Savings
          </span>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">
            {formatINR(totalSaved)}
          </p>
          <span className="text-[10px] text-muted-foreground">Across {finance.savingsGoals.length} goals</span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Combined Target Goals
          </span>
          <p className="text-2xl font-black text-primary tabular-nums mt-1">
            {formatINR(totalTarget)}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {totalTarget > 0 ? `${formatPercent((totalSaved / totalTarget) * 100)} Achieved` : '0%'}
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Achieved Milestones
          </span>
          <p className="text-2xl font-black text-emerald-400 tabular-nums mt-1">
            {finance.savingsGoals.filter(g => g.status === 'achieved').length}
          </p>
          <span className="text-[10px] text-muted-foreground">Goals fully funded</span>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Active Savings Goals ({finance.savingsGoals.length})
        </h3>

        {finance.savingsGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No Savings Goals Yet"
            description="Build your safety net or save towards a big dream purchase by creating your first milestone goal."
            actionLabel="+ Create Savings Goal"
            onAction={() => {
              setSelectedGoal(null);
              setModalMode('create');
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finance.savingsGoals.map(goal => {
              const progress = goal.target_amount > 0
                ? Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100))
                : 100;
              const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
              const isAchieved = goal.status === 'achieved' || goal.saved_amount >= goal.target_amount;

              return (
                <Card
                  key={goal.id}
                  className={`p-5 flex flex-col justify-between hover:border-border transition-colors ${
                    isAchieved ? 'border-emerald-500/30 bg-emerald-950/10' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isAchieved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-primary/15 text-primary border-primary/20'
                          }`}
                        >
                          {isAchieved ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground leading-tight">{goal.name}</h4>
                          {goal.target_date && (
                            <span className="text-[10px] text-muted-foreground">
                              Target Date: {goal.target_date}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAchieved && (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <Sparkles className="h-3 w-3" /> Achieved!
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar & Amounts */}
                    <div className="my-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-foreground font-mono">
                          {formatINR(goal.saved_amount)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          of {formatINR(goal.target_amount)}
                        </span>
                      </div>

                      <Progress
                        value={progress}
                        variant={isAchieved ? 'success' : 'gradient'}
                        className="h-2.5"
                      />

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{progress}% Completed</span>
                        <span>{remaining > 0 ? `${formatINR(remaining)} to go` : 'Goal Fulfilled'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant={isAchieved ? 'outline' : 'primary'}
                      className="gap-1.5 text-xs w-full"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setModalMode('contribute');
                        setIsModalOpen(true);
                        if (isAchieved) triggerCelebration();
                      }}
                    >
                      <PiggyBank className="h-4 w-4" />
                      <span>{isAchieved ? 'Add Extra Savings' : 'Add Contribution'}</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Savings Goal Modal */}
      <SavingsGoalModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        accounts={finance.accounts}
        mode={modalMode}
        selectedGoal={selectedGoal}
        onSaveGoal={async (data) => {
          await finance.addSavingsGoal(data);
        }}
        onContribute={async (goalId, amt, accId, notes) => {
          await finance.contributeToGoal(goalId, amt, accId, notes);
          triggerCelebration();
        }}
      />
    </div>
  );
}
