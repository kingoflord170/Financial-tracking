import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ReminderModal } from '@/components/modals/ReminderModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useNotifications } from '@/hooks/useNotifications';
import { Reminder } from '@/types';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import {
  BellRing,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Bell,
  Pencil,
  Zap,
} from 'lucide-react';

export function RemindersPage() {
  const finance = useFinanceData();
  const notifications = useNotifications(finance.reminders);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  const now = new Date();

  // Sort and filter reminders
  const activeReminders = useMemo(() => {
    return finance.reminders
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [finance.reminders]);

  const completedReminders = useMemo(() => {
    return finance.reminders
      .filter(r => r.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.due_at).getTime() - new Date(a.completed_at || a.due_at).getTime());
  }, [finance.reminders]);

  const overdueList = useMemo(() => {
    return activeReminders.filter(r => new Date(r.due_at) < now);
  }, [activeReminders, now]);

  const upcomingList = useMemo(() => {
    return activeReminders.filter(r => new Date(r.due_at) >= now);
  }, [activeReminders, now]);

  const handleTestNotification = () => {
    notifications.sendBrowserNotification('MyFinance Bill Alert', {
      body: 'Your scheduled reminders are active. Timely payments keep your credit score high!',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Recurring Payments & Reminders
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Never miss rent, fiber broadband, credit cards, insurance, or SIP due dates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Browser Notification Permission Button */}
          {notifications.permission !== 'granted' ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={notifications.requestPermission}
            >
              <Bell className="h-4 w-4" />
              <span>Enable Browser Alerts</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-emerald-400"
              onClick={handleTestNotification}
              title="Test browser notification"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Alerts Active (Test)</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5"
            onClick={() => {
              setEditingReminder(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Set Reminder</span>
          </Button>
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {overdueList.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>
              <strong>Action Required:</strong> You have {overdueList.length} overdue bill{overdueList.length > 1 ? 's' : ''}. Mark them paid or snooze to prevent penalties.
            </span>
          </div>
        </div>
      )}

      {/* Tabs: Active vs Completed */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          onClick={() => setTab('pending')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            tab === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Reminders ({activeReminders.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            tab === 'completed'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed History ({completedReminders.length})
        </button>
      </div>

      {tab === 'pending' ? (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Overdue Payments ({overdueList.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueList.map(r => (
                  <Card key={r.id} className="p-4 border-rose-500/30 bg-rose-950/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-foreground">{r.title}</h4>
                        <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Was due on {formatDate(r.due_at, 'full')}
                      </p>
                      {r.amount && (
                        <p className="text-lg font-black text-rose-400 font-mono mt-2">
                          {formatINR(r.amount)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-500/20 mt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs gap-1"
                        onClick={() => finance.markReminderComplete(r.id, true)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Paid & Record Expense
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Due Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Upcoming Due ({upcomingList.length})
            </h3>

            {upcomingList.length === 0 ? (
              <EmptyState
                icon={BellRing}
                title="No Upcoming Reminders"
                description="Keep track of recurring electricity bills, WiFi recharges, OTT subscriptions, or loan EMI dates."
                actionLabel="+ Set Reminder"
                onAction={() => {
                  setEditingReminder(null);
                  setIsModalOpen(true);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingList.map(r => {
                  const loan = finance.loans.find(l => l.id === r.related_loan_id);
                  const acc = finance.accounts.find(a => a.id === r.related_account_id);

                  return (
                    <Card key={r.id} className="p-4 flex flex-col justify-between hover:border-border transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-foreground leading-tight">{r.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono uppercase">
                            {r.recurrence_rule}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground my-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>Due: <strong>{formatDate(r.due_at, 'full')}</strong></span>
                          </div>
                          {loan && <div>Linked Loan: {loan.name}</div>}
                          {acc && <div>Account: {acc.name}</div>}
                          {r.notes && <div className="italic truncate">{r.notes}</div>}
                        </div>

                        {r.amount && (
                          <div className="text-xl font-black text-foreground font-mono mb-2">
                            {formatINR(r.amount)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <button
                          onClick={() => {
                            setEditingReminder(r);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Edit reminder"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8 text-xs gap-1"
                          onClick={() => finance.markReminderComplete(r.id, true)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Paid
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Completed History Section */
        <Card className="p-5">
          {completedReminders.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No completed reminders history.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {completedReminders.map(r => (
                <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-foreground line-through opacity-80">{r.title}</span>
                      <p className="text-[11px] text-muted-foreground">
                        Completed on {formatDate(r.completed_at || r.updated_at, 'short')}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono font-semibold text-muted-foreground">
                    {r.amount ? formatINR(r.amount) : 'Paid'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Reminder Modal */}
      <ReminderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        accounts={finance.accounts}
        loans={finance.loans}
        editingReminder={editingReminder}
        onSave={async data => {
          if (editingReminder) {
            await finance.updateReminder(editingReminder.id, data);
          } else {
            await finance.addReminder(data);
          }
        }}
      />
    </div>
  );
}
