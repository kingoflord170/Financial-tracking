import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  TrendingUp,
  CreditCard,
  BellRing,
  BarChart3,
  Target,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Cloud,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export type NavPage =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'income'
  | 'loans'
  | 'reminders'
  | 'reports'
  | 'savings'
  | 'import-export'
  | 'settings';

export interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  syncState?: { pendingCount: number; isSyncing: boolean };
}

export function Sidebar({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  syncState,
}: SidebarProps) {
  const { user, isSupabaseConfigured, signOut } = useAuth();

  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="h-4 w-4" /> },
    { id: 'accounts', label: 'Accounts & Wallets', icon: <Wallet className="h-4 w-4" /> },
    { id: 'budgets', label: 'Monthly Budgets', icon: <PiggyBank className="h-4 w-4" /> },
    { id: 'income', label: 'Income Streams', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'loans', label: 'Loans & EMI', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'reminders', label: 'Bills & Reminders', icon: <BellRing className="h-4 w-4" /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'savings', label: 'Savings Goals', icon: <Target className="h-4 w-4" /> },
    { id: 'import-export', label: 'Import & Export', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-card border-r border-border transition-all duration-200 z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
        <div
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => onNavigate('dashboard')}
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-glow shrink-0">
            ₹
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-foreground leading-tight">
                MyFinance
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                INR • en-IN
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Mode & Sync Status Indicator */}
      {!isCollapsed && isSupabaseConfigured && (
        <div className="px-4 py-2.5 border-b border-border/40">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <Cloud className="h-3.5 w-3.5 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">Supabase Connected</span>
              <span className="text-[10px] text-muted-foreground">
                {syncState?.pendingCount ? `${syncState.pendingCount} pending sync` : 'All changes synced'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`shrink-0 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-primary transition-colors'}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-border/60">
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } p-2 rounded-xl bg-card-elevated/70 border border-border/70`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'MF'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-bold text-foreground truncate">
                  {user?.displayName || 'MyFinance User'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-mono">
                  {user?.email || 'cloud@myfinance'}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
