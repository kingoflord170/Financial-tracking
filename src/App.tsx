import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastContainer } from '@/components/ui/toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { NavPage } from '@/components/layout/Sidebar';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { IncomePage } from '@/pages/IncomePage';
import { LoansPage } from '@/pages/LoansPage';
import { RemindersPage } from '@/pages/RemindersPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SavingsPage } from '@/pages/SavingsPage';
import { ImportExportPage } from '@/pages/ImportExportPage';
import { SettingsPage } from '@/pages/SettingsPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xl animate-pulse shadow-glow">
          ₹
        </div>
        <p className="text-xs text-muted-foreground font-mono">Initializing MyFinance Ledger...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            onOpenQuickAdd={() => {
              // Quick add can be opened via Header/FAB
            }}
          />
        );
      case 'transactions':
        return <TransactionsPage />;
      case 'accounts':
        return <AccountsPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'income':
        return <IncomePage />;
      case 'loans':
        return <LoansPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'savings':
        return <SavingsPage />;
      case 'import-export':
        return <ImportExportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            onOpenQuickAdd={() => {}}
          />
        );
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer />
    </AuthProvider>
  );
}

export default App;
