import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  PiggyBank,
  Menu,
} from 'lucide-react';
import { NavPage } from './Sidebar';

export interface BottomNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenQuickAdd: () => void;
  onOpenMoreMenu: () => void;
}

export function BottomNav({
  currentPage,
  onNavigate,
  onOpenQuickAdd,
  onOpenMoreMenu,
}: BottomNavProps) {
  const isMorePage = ![
    'dashboard',
    'transactions',
    'budgets',
  ].includes(currentPage);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border px-3 py-1.5 flex items-center justify-around safe-bottom">
      {/* Dashboard */}
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentPage === 'dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Home</span>
      </button>

      {/* Transactions */}
      <button
        onClick={() => onNavigate('transactions')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentPage === 'transactions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Receipt className="h-5 w-5" />
        <span>History</span>
      </button>

      {/* Center Quick Add FAB */}
      <div className="relative -top-3">
        <button
          onClick={onOpenQuickAdd}
          className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          aria-label="Add new transaction"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Monthly Budgets */}
      <button
        onClick={() => onNavigate('budgets')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
          currentPage === 'budgets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <PiggyBank className="h-5 w-5" />
        <span>Budgets</span>
      </button>

      {/* More Pages Menu Drawer */}
      <button
        onClick={onOpenMoreMenu}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
          isMorePage ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
