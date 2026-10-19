import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Reminder } from '@/types';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import {
  Plus,
  Bell,
  Sun,
  Moon,
  Menu,
  Cloud,
  RefreshCw,
  AlertCircle,
  Calendar,
  Check,
} from 'lucide-react';
import { NavPage } from './Sidebar';

export interface HeaderProps {
  currentPage: NavPage;
  onOpenQuickAdd: () => void;
  onOpenMobileNav: () => void;
  theme: string;
  onToggleTheme: () => void;
  syncState?: { pendingCount: number; isSyncing: boolean; lastError: string | null };
  overdueReminders: Reminder[];
  dueSoonReminders: Reminder[];
  onMarkReminderPaid: (reminderId: string) => void;
}

export function Header({
  currentPage,
  onOpenQuickAdd,
  onOpenMobileNav,
  theme,
  onToggleTheme,
  syncState,
  overdueReminders,
  dueSoonReminders,
  onMarkReminderPaid,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const totalNotifications = overdueReminders.length + dueSoonReminders.length;

  const pageTitles: Record<NavPage, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of accounts, cash flow, and monthly progress' },
    transactions: { title: 'Transactions', subtitle: 'Detailed record of income, expenses, and inter-account transfers' },
    accounts: { title: 'Accounts & Wallets', subtitle: 'Bank accounts, digital wallets, and cash reserves' },
    budgets: { title: 'Monthly Budgets', subtitle: 'Spending limits and real-time category threshold tracking' },
    income: { title: 'Income Streams', subtitle: 'Salary, freelance projects, dividends, and other earnings' },
    loans: { title: 'Loans & EMI', subtitle: 'Active loans, EMI schedules, principal, and interest allocation' },
    reminders: { title: 'Bills & Reminders', subtitle: 'Upcoming bills, recurring subscriptions, and due dates' },
    reports: { title: 'Reports & Analytics', subtitle: 'Deep financial trends, category breakdowns, and month-over-month comparisons' },
    savings: { title: 'Savings Goals', subtitle: 'Track and contribute towards your financial milestones' },
    'import-export': { title: 'Import & Export', subtitle: 'CSV import with validation, CSV exports, and full JSON backups' },
    settings: { title: 'Settings', subtitle: 'Profile, preferences, cloud sync, and data management' },
  };

  const currentMeta = pageTitles[currentPage] || { title: 'MyFinance', subtitle: '' };

  // Dismiss notification popup on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 px-4 md:px-6 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base md:text-lg font-bold text-foreground leading-tight">
            {currentMeta.title}
          </h1>
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground truncate max-w-md">
            {currentMeta.subtitle}
          </span>
        </div>
      </div>

      {/* Right: Quick Add Button, Sync Badge, Notifications, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Button */}
        <Button
          onClick={onOpenQuickAdd}
          size="sm"
          variant="primary"
          className="gap-1.5 shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline font-semibold">New Entry</span>
        </Button>

        {/* Sync Status Badge */}
        {syncState && (
          <div className="hidden lg:flex items-center">
            {syncState.isSyncing ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
              </span>
            ) : syncState.pendingCount > 0 ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                <AlertCircle className="h-3 w-3" />
                <span>{syncState.pendingCount} Queued</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                <Cloud className="h-3 w-3" />
                <span>Ready</span>
              </span>
            )}
          </div>
        )}

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground relative transition-colors"
            title="Notifications & Bill Reminders"
          >
            <Bell className="h-4 w-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-4 z-50 animate-fade-in max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Upcoming & Due Bills ({totalNotifications})
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Asia/Kolkata</span>
              </div>

              {totalNotifications === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  All bills and payments are up to date!
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Overdue */}
                  {overdueReminders.map(r => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Overdue: {r.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          Due on {formatDate(r.due_at, 'short')} • {r.amount ? formatINR(r.amount) : 'Bill'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => onMarkReminderPaid(r.id)}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  ))}

                  {/* Due Soon */}
                  {dueSoonReminders.map(r => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-card-elevated border border-border flex items-start justify-between gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" /> {r.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          Due on {formatDate(r.due_at, 'short')} • {r.amount ? formatINR(r.amount) : 'Bill'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => onMarkReminderPaid(r.id)}
                      >
                        Pay
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
