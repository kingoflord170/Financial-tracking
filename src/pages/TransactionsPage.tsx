import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Transaction, TransactionType } from '@/types';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import {
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  TrendingDown,
  ArrowRightLeft,
  Copy,
  Pencil,
  Trash2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { exportTransactionsToCsv, downloadFile } from '@/lib/export/csv';

export function TransactionsPage() {
  const finance = useFinanceData();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // Combined List (Transactions + Transfers for unified ledger view)
  const allEntries = useMemo(() => {
    const list: Array<
      | { kind: 'transaction'; data: Transaction; sortDate: Date; sortAmount: number }
      | {
          kind: 'transfer';
          data: {
            id: string;
            user_id: string;
            source_account_id: string;
            destination_account_id: string;
            amount: number;
            occurred_at: string;
            notes?: string;
          };
          sortDate: Date;
          sortAmount: number;
        }
    > = [];

    // Add Transactions
    for (const tx of finance.transactions) {
      list.push({
        kind: 'transaction',
        data: tx,
        sortDate: new Date(tx.occurred_at),
        sortAmount: tx.amount,
      });
    }

    // Add Transfers
    for (const tr of finance.transfers) {
      list.push({
        kind: 'transfer',
        data: tr,
        sortDate: new Date(tr.occurred_at),
        sortAmount: tr.amount,
      });
    }

    return list;
  }, [finance.transactions, finance.transfers]);

  // Filtering
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Start of this week (Monday)
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allEntries.filter(entry => {
      // 1. Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'transfer' && entry.kind !== 'transfer') return false;
        if (typeFilter !== 'transfer') {
          if (entry.kind !== 'transaction') return false;
          if (entry.data.type !== typeFilter) return false;
        }
      }

      // 2. Account Filter
      if (accountFilter !== 'all') {
        if (entry.kind === 'transaction') {
          if (entry.data.account_id !== accountFilter) return false;
        } else if (entry.kind === 'transfer') {
          if (
            entry.data.source_account_id !== accountFilter &&
            entry.data.destination_account_id !== accountFilter
          )
            return false;
        }
      }

      // 3. Category Filter
      if (categoryFilter !== 'all') {
        if (entry.kind !== 'transaction') return false;
        if (entry.data.category_id !== categoryFilter) return false;
      }

      // 4. Date Range Filter
      const entryDate = entry.sortDate;
      const entryDateStr = entryDate.toISOString().slice(0, 10);

      if (dateFilter === 'today') {
        if (entryDateStr !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (entryDateStr !== yesterdayStr) return false;
      } else if (dateFilter === 'this_week') {
        if (entryDate < startOfWeek) return false;
      } else if (dateFilter === 'this_month') {
        if (entryDate < startOfMonth) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate && entryDateStr < customStartDate) return false;
        if (customEndDate && entryDateStr > customEndDate) return false;
      }

      // 5. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (entry.kind === 'transaction') {
          const notesMatch = (entry.data.notes || '').toLowerCase().includes(query);
          const tagsMatch = (entry.data.tags || []).some(t => t.toLowerCase().includes(query));
          const cat = finance.categories.find(c => c.id === entry.data.category_id);
          const catMatch = (cat?.name || '').toLowerCase().includes(query);
          const acc = finance.accounts.find(a => a.id === entry.data.account_id);
          const accMatch = (acc?.name || '').toLowerCase().includes(query);
          const amountMatch = String(entry.data.amount).includes(query);
          if (!notesMatch && !tagsMatch && !catMatch && !accMatch && !amountMatch) {
            return false;
          }
        } else {
          const notesMatch = (entry.data.notes || '').toLowerCase().includes(query);
          const amountMatch = String(entry.data.amount).includes(query);
          if (!notesMatch && !amountMatch) return false;
        }
      }

      return true;
    });
  }, [
    allEntries,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    searchTerm,
    finance.categories,
    finance.accounts,
  ]);

  // Sorting
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      if (sortBy === 'date_desc') return b.sortDate.getTime() - a.sortDate.getTime();
      if (sortBy === 'date_asc') return a.sortDate.getTime() - b.sortDate.getTime();
      if (sortBy === 'amount_desc') return b.sortAmount - a.sortAmount;
      if (sortBy === 'amount_asc') return a.sortAmount - b.sortAmount;
      return 0;
    });
  }, [filteredEntries, sortBy]);

  // Total summary of filtered results
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transferSum = 0;

    for (const e of filteredEntries) {
      if (e.kind === 'transaction') {
        if (e.data.type === 'income') income += e.data.amount;
        if (e.data.type === 'expense') expense += e.data.amount;
      } else if (e.kind === 'transfer') {
        transferSum += e.data.amount;
      }
    }

    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
      transfers: Math.round(transferSum * 100) / 100,
      count: filteredEntries.length,
    };
  }, [filteredEntries]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  // Export current filtered transactions to CSV
  const handleExportCsv = () => {
    const txsToExport = sortedEntries
      .filter(e => e.kind === 'transaction')
      .map(e => e.data as Transaction);
    const csv = exportTransactionsToCsv(txsToExport, finance.accounts, finance.categories);
    downloadFile(csv, `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Transactions History
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search, filter, edit, or export your complete financial ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button size="sm" variant="primary" className="gap-1.5" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-card border border-border">
        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Filtered Income
          </span>
          <p className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
            +{formatINR(filteredSummary.income)}
          </p>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Filtered Expense
          </span>
          <p className="text-base sm:text-lg font-bold text-rose-400 tabular-nums">
            -{formatINR(filteredSummary.expense)}
          </p>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Net Differential
          </span>
          <p
            className={`text-base sm:text-lg font-bold tabular-nums ${
              filteredSummary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatINR(filteredSummary.net)}
          </p>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Entries Found
          </span>
          <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
            {filteredSummary.count} <span className="text-xs font-normal text-muted-foreground">records</span>
          </p>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <Card className="p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Input
            placeholder="Search by description, tag, category, account, or amount..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            startAdornment={<Search className="h-4 w-4 text-muted-foreground" />}
            endAdornment={
              searchTerm ? (
                <button onClick={() => setSearchTerm('')} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              ) : null
            }
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Date Filter */}
          <Select
            value={dateFilter}
            onChange={e => {
              setDateFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="custom">Custom Date Range</option>
            <option value="all">All Time</option>
          </Select>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses Only (-)</option>
            <option value="income">Income Only (+)</option>
            <option value="transfer">Transfers Only (⇄)</option>
          </Select>

          {/* Account Filter */}
          <Select
            value={accountFilter}
            onChange={e => {
              setAccountFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Accounts</option>
            {finance.accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </Select>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Categories</option>
            {finance.categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={e => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </Select>
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input-border bg-input-bg text-input-fg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border shadow-sm"
            />
            <span className="text-muted-foreground">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input-border bg-input-bg text-input-fg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border shadow-sm"
            />
          </div>
        )}
      </Card>

      {/* Transaction List / Table */}
      <Card className="overflow-hidden">
        {paginatedEntries.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Filter className="h-8 w-8 text-muted-foreground/60" />
            <p className="font-semibold text-foreground">No matching transactions found.</p>
            <p>Try clearing your search query or adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {paginatedEntries.map(entry => {
              if (entry.kind === 'transfer') {
                const tr = entry.data;
                const src = finance.accounts.find(a => a.id === tr.source_account_id)?.name || 'Source';
                const dst = finance.accounts.find(a => a.id === tr.destination_account_id)?.name || 'Destination';

                return (
                  <div
                    key={`tr-${tr.id}`}
                    className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-card-elevated/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            Transfer: {src} → {dst}
                          </span>
                          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                            Internal Transfer
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{formatDate(tr.occurred_at, 'full')}</span>
                          {tr.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate italic">{tr.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {formatINR(tr.amount)}
                      </span>
                    </div>
                  </div>
                );
              }

              // Standard Transaction
              const tx = entry.data;
              const cat = finance.categories.find(c => c.id === tx.category_id);
              const acc = finance.accounts.find(a => a.id === tx.account_id);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-card-elevated/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {tx.notes || cat?.name || (isIncome ? 'Income' : 'Expense')}
                        </span>
                        {cat && (
                          <span
                            className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${cat.color}20`,
                              color: cat.color,
                            }}
                          >
                            {cat.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-semibold text-foreground/80">{acc?.name}</span>
                        <span>•</span>
                        <span>{formatDate(tx.occurred_at, 'full')}</span>
                        <span>•</span>
                        <span className="uppercase font-mono text-[10px]">{tx.payment_method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-mono text-xs sm:text-sm font-bold ${
                          isIncome ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                      {tx.sync_status === 'pending' && (
                        <span className="text-[10px] text-amber-400">Offline pending</span>
                      )}
                    </div>

                    {/* Quick Row Actions (Duplicate, Edit, Delete) */}
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => finance.duplicateTransaction(tx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Duplicate transaction"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTransaction(tx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Edit transaction"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingTransactionId(tx.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {currentPage} of {totalPages} ({sortedEntries.length} items)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        open={isAddModalOpen || Boolean(editingTransaction)}
        onOpenChange={open => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingTransaction(null);
          }
        }}
        accounts={finance.accounts}
        categories={finance.categories}
        editingTransaction={editingTransaction}
        onSave={async data => {
          if (editingTransaction) {
            await finance.updateTransaction(editingTransaction.id, data);
          } else {
            await finance.addTransaction(data);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationModal
        open={Boolean(deletingTransactionId)}
        onOpenChange={open => {
          if (!open) setDeletingTransactionId(null);
        }}
        title="Delete Transaction?"
        description="Are you sure you want to delete this transaction? This action will immediately adjust your account balance and monthly reports."
        confirmLabel="Yes, Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingTransactionId) {
            await finance.deleteTransaction(deletingTransactionId);
            setDeletingTransactionId(null);
          }
        }}
      />
    </div>
  );
}
