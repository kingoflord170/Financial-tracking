import React, { useState, useEffect } from 'react';
import { Sidebar, NavPage } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { QuickAddModal } from '@/components/modals/QuickAddModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  BellRing,
  BarChart3,
  Target,
  FileSpreadsheet,
  Settings,
  X,
  Download,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface AppLayoutProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const finance = useFinanceData();
  const notifications = useNotifications(finance.reminders);

  // Listen for PWA installation event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const moreNavItems: Array<{ id: NavPage; label: string; icon: React.ReactNode }> = [
    { id: 'accounts', label: 'Accounts & Wallets', icon: <Wallet className="h-5 w-5 text-blue-400" /> },
    { id: 'income', label: 'Income Streams', icon: <TrendingUp className="h-5 w-5 text-emerald-400" /> },
    { id: 'loans', label: 'Loans & EMI Repayments', icon: <CreditCard className="h-5 w-5 text-orange-400" /> },
    { id: 'reminders', label: 'Bills & Reminders', icon: <BellRing className="h-5 w-5 text-amber-400" /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="h-5 w-5 text-purple-400" /> },
    { id: 'savings', label: 'Savings Goals', icon: <Target className="h-5 w-5 text-cyan-400" /> },
    { id: 'import-export', label: 'CSV Import & Export', icon: <FileSpreadsheet className="h-5 w-5 text-teal-400" /> },
    { id: 'settings', label: 'Settings & Data', icon: <Settings className="h-5 w-5 text-slate-400" /> },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        syncState={finance.syncState}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          currentPage={currentPage}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onOpenMobileNav={() => setMobileDrawerOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          syncState={finance.syncState}
          overdueReminders={notifications.overdueReminders}
          dueSoonReminders={notifications.dueSoonReminders}
          onMarkReminderPaid={reminderId => finance.markReminderComplete(reminderId, true)}
        />

        {/* PWA Install Banner (dismissible) */}
        {installPrompt && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs text-primary">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Install MyFinance as a native mobile/desktop app for offline access!</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallPwa}
                className="px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[11px]"
              >
                Install
              </button>
              <button
                onClick={() => setInstallPrompt(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Thumb Navigation */}
        <BottomNav
          currentPage={currentPage}
          onNavigate={onNavigate}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onOpenMoreMenu={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Mobile Drawer Menu */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-card border-l border-border p-5 flex flex-col justify-between shadow-2xl animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-base">
                    ₹
                  </div>
                  <span className="font-bold text-foreground">MyFinance Menu</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1">
                {moreNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                      currentPage === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground truncate">{user?.displayName}</p>
              <p className="font-mono text-[11px] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Unified Global Quick Add Modal */}
      <QuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        accounts={finance.accounts}
        categories={finance.categories}
        loans={finance.loans}
        onAddTransaction={async (data) => {
          await finance.addTransaction(data);
        }}
        onExecuteTransfer={async (src, dst, amt, dt, notes) => {
          await finance.executeTransfer(src, dst, amt, dt, notes);
        }}
        onRecordLoanPayment={finance.recordLoanPayment}
      />
    </div>
  );
}
