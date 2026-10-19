import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccountModal } from '@/components/modals/AccountModal';
import { TransferModal } from '@/components/modals/TransferModal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Account, AccountType } from '@/types';
import { formatINR } from '@/lib/accounting/formatters';
import {
  Wallet,
  Building2,
  Banknote,
  Smartphone,
  Plus,
  ArrowRightLeft,
  Pencil,
  Archive,
  RotateCcw,
  Scale,
  CreditCard,
} from 'lucide-react';

export function AccountsPage() {
  const finance = useFinanceData();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'reconcile'>('create');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [archivingAccount, setArchivingAccount] = useState<Account | null>(null);

  // Group accounts by type & calculate category totals
  const metrics = useMemo(() => {
    let bankTotal = 0;
    let cashTotal = 0;
    let walletTotal = 0;
    let activeCount = 0;

    for (const acc of finance.accounts) {
      if (acc.is_archived) continue;
      activeCount++;
      const bal = acc.computed_balance || 0;
      if (acc.account_type === 'bank') bankTotal += bal;
      else if (acc.account_type === 'cash') cashTotal += bal;
      else if (acc.account_type === 'wallet') walletTotal += bal;
    }

    return {
      totalLiquid: finance.totalBalance,
      bankTotal: Math.round(bankTotal * 100) / 100,
      cashTotal: Math.round(cashTotal * 100) / 100,
      walletTotal: Math.round(walletTotal * 100) / 100,
      activeCount,
    };
  }, [finance.accounts, finance.totalBalance]);

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Building2 className="h-5 w-5 text-blue-400" />;
      case 'cash':
        return <Banknote className="h-5 w-5 text-emerald-400" />;
      case 'wallet':
        return <Smartphone className="h-5 w-5 text-purple-400" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-rose-400" />;
      default:
        return <Wallet className="h-5 w-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Accounts & Wallets
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your bank accounts, physical cash reserves, and digital wallets
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setIsTransferOpen(true)}
            disabled={finance.accounts.filter(a => !a.is_archived).length < 2}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Transfer Funds</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="gap-1.5"
            onClick={() => {
              setEditingAccount(null);
              setModalMode('create');
              setIsAddAccountOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>New Account</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 glow-border">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Total Liquid Assets
          </span>
          <p className="text-lg sm:text-2xl font-black text-foreground tabular-nums mt-1">
            {formatINR(metrics.totalLiquid)}
          </p>
          <span className="text-[10px] text-muted-foreground">Across {metrics.activeCount} active accounts</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-semibold">Bank Accounts</span>
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-blue-400 tabular-nums mt-1">
            {formatINR(metrics.bankTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground">SBI, HDFC, ICICI, etc.</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-semibold">Digital Wallets</span>
            <Smartphone className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-purple-400 tabular-nums mt-1">
            {formatINR(metrics.walletTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground">GPay, Paytm, Amazon Pay</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-semibold">Cash in Hand</span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-400 tabular-nums mt-1">
            {formatINR(metrics.cashTotal)}
          </p>
          <span className="text-[10px] text-muted-foreground">Physical currency</span>
        </Card>
      </div>

      {/* Active Accounts Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Active Accounts ({finance.accounts.filter(a => !a.is_archived).length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {finance.accounts
            .filter(a => !a.is_archived)
            .map(acc => {
              const balance = acc.computed_balance ?? 0;

              return (
                <Card key={acc.id} className="p-5 flex flex-col justify-between hover:border-border transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-card-elevated border border-border">
                          {getAccountIcon(acc.account_type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground leading-tight">{acc.name}</h4>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                            {acc.account_type}
                          </span>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {acc.currency}
                      </Badge>
                    </div>

                    <div className="my-4">
                      <span className="text-xs text-muted-foreground">Current Balance</span>
                      <p
                        className={`text-2xl font-black tabular-nums ${
                          balance >= 0 ? 'text-foreground' : 'text-rose-400'
                        }`}
                      >
                        {formatINR(balance)}
                      </p>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Opening balance: {formatINR(acc.opening_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => {
                        setEditingAccount(acc);
                        setModalMode('reconcile');
                        setIsAddAccountOpen(true);
                      }}
                      title="Match statement balance"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Reconcile
                    </Button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setModalMode('edit');
                          setIsAddAccountOpen(true);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Edit Account"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setArchivingAccount(acc)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        title="Archive Account"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Archived Accounts Section (If Any) */}
      {finance.accounts.some(a => a.is_archived) && (
        <div className="pt-4 border-t border-border/50 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Archived Accounts ({finance.accounts.filter(a => a.is_archived).length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {finance.accounts
              .filter(a => a.is_archived)
              .map(acc => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/40 flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground line-through">
                      {acc.name}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground/80">
                      Balance: {formatINR(acc.computed_balance)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => finance.archiveAccount(acc.id, false)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Account Add/Edit/Reconcile Modal */}
      <AccountModal
        open={isAddAccountOpen}
        onOpenChange={setIsAddAccountOpen}
        editingAccount={editingAccount}
        mode={modalMode}
        onSave={async data => {
          if (editingAccount) {
            await finance.updateAccount(editingAccount.id, data);
          } else {
            await finance.addAccount(data);
          }
        }}
        onReconcile={async (accId, stmtBal, notes) => {
          await finance.reconcileAccount(accId, stmtBal, notes);
        }}
      />

      {/* Inter-Account Transfer Modal */}
      <TransferModal
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        accounts={finance.accounts}
        onExecute={async (src, dst, amt, dt, notes) => {
          await finance.executeTransfer(src, dst, amt, dt, notes);
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmationModal
        open={Boolean(archivingAccount)}
        onOpenChange={open => {
          if (!open) setArchivingAccount(null);
        }}
        title={`Archive Account "${archivingAccount?.name}"?`}
        description="Archiving will hide this account from quick selections. All historical transactions will be safely preserved."
        confirmLabel="Yes, Archive"
        variant="destructive"
        onConfirm={async () => {
          if (archivingAccount) {
            await finance.archiveAccount(archivingAccount.id, true);
            setArchivingAccount(null);
          }
        }}
      />
    </div>
  );
}
