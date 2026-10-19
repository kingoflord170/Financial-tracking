import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CsvImportModal } from '@/components/modals/CsvImportModal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAuth } from '@/hooks/useAuth';
import { exportTransactionsToCsv, downloadFile } from '@/lib/export/csv';
import { createFullBackup, restoreBackup, downloadBackup } from '@/lib/export/json';
import { toast } from '@/components/ui/toast';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  FileCheck,
  AlertTriangle,
  FileJson,
  ShieldAlert,
} from 'lucide-react';
import Papa from 'papaparse';

export function ImportExportPage() {
  const finance = useFinanceData();
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-myfinance-in';

  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [restoreJsonFile, setRestoreJsonFile] = useState<File | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // 1. Export Transactions CSV
  const handleExportTransactions = () => {
    const csv = exportTransactionsToCsv(finance.transactions, finance.accounts, finance.categories);
    downloadFile(csv, `myfinance_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Transactions CSV downloaded');
  };

  // 2. Export Accounts CSV
  const handleExportAccounts = () => {
    const rows = finance.accounts.map(a => ({
      'Account ID': a.id,
      'Name': a.name,
      'Type': a.account_type.toUpperCase(),
      'Opening Balance (INR)': a.opening_balance,
      'Current Balance (INR)': a.computed_balance ?? a.opening_balance,
      'Currency': a.currency,
      'Archived': a.is_archived ? 'YES' : 'NO',
      'Created Date': a.created_at,
    }));
    const csv = Papa.unparse(rows);
    downloadFile(csv, `myfinance_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Accounts CSV downloaded');
  };

  // 3. Export Budgets CSV
  const handleExportBudgets = () => {
    const rows = finance.budgets.map(b => {
      const cat = finance.categories.find(c => c.id === b.category_id);
      return {
        'Budget ID': b.id,
        'Scope': b.category_id ? 'CATEGORY' : 'OVERALL',
        'Category Name': cat?.name || 'Overall Monthly Limit',
        'Target Month': b.month,
        'Limit Amount (INR)': b.limit_amount,
        'Alert Thresholds': (b.warning_thresholds || []).join('; '),
      };
    });
    const csv = Papa.unparse(rows);
    downloadFile(csv, `myfinance_budgets_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Budgets CSV downloaded');
  };

  // 4. Export Loan Repayments CSV
  const handleExportLoanPayments = () => {
    const rows = finance.loanPayments.map(p => {
      const loan = finance.loans.find(l => l.id === p.loan_id);
      const acc = finance.accounts.find(a => a.id === p.account_id);
      return {
        'Payment ID': p.id,
        'Loan Name': loan?.name || 'Unknown',
        'Paying Account': acc?.name || 'Unknown',
        'Payment Date': p.paid_at,
        'Total Amount (INR)': p.total_amount,
        'Principal Component': p.principal_component,
        'Interest Component': p.interest_component,
        'Fee Component': p.fee_component,
        'Notes': p.notes || '',
      };
    });
    const csv = Papa.unparse(rows);
    downloadFile(csv, `myfinance_loan_repayments_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Loan repayments CSV downloaded');
  };

  // 5. Download Full JSON Backup
  const handleDownloadJsonBackup = async () => {
    try {
      await downloadBackup(userId);
      toast.success('Full database JSON backup created');
    } catch {
      toast.error('Failed to create backup.');
    }
  };

  // 6. Handle JSON Restore selection
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreJsonFile(file);
    setRestoreConfirmOpen(true);
  };

  const handleExecuteRestore = async () => {
    if (!restoreJsonFile) return;
    setIsRestoring(true);
    try {
      const text = await restoreJsonFile.text();
      const res = await restoreBackup(text, userId, 'replace');
      if (res.success) {
        toast.success(res.message);
        await finance.reloadData();
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
      setRestoreJsonFile(null);
      setRestoreConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-border/50">
        <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
          Data Import, Export & Backups
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Interoperable standard CSV file processing, duplicate validation, and encrypted database exports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Import Transactions (CSV)</h3>
                <p className="text-xs text-muted-foreground">Upload statement files from HDFC, SBI, ICICI, or UPI</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 mb-5 leading-relaxed">
              <p>
                Our intelligent parser detects headers including <strong>Date, Amount, Category, Type, Notes, and Payment Method</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Automatic duplicate detection against existing postings.</li>
                <li>Row-by-row error validation before committing to database.</li>
                <li>Preview first rows and choose fallback destination account.</li>
              </ul>
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            className="w-full gap-2"
            onClick={() => setIsCsvImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Launch CSV Import Wizard</span>
          </Button>
        </Card>

        {/* Full JSON Backup & Restore Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Complete Database Backup & Restore</h3>
                <p className="text-xs text-muted-foreground">Preserve accounts, budgets, loans, and complete ledger</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 mb-5 leading-relaxed">
              <p>
                Download a validated JSON archive containing all user records. Use it to migrate between devices, create offline snapshots, or restore corrupted states safely.
              </p>
              <div className="p-2.5 rounded-lg bg-card-elevated border border-border text-[11px] text-muted-foreground">
                <strong>Privacy Guaranteed:</strong> Exports never contain private authentication secrets or server credentials.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleDownloadJsonBackup}
            >
              <Download className="h-4 w-4" />
              <span>Download Backup</span>
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelectForRestore}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Button size="sm" variant="secondary" className="gap-1.5 w-full pointer-events-none">
                <FileJson className="h-4 w-4" />
                <span>Restore Backup</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* CSV Export Options Card */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">
          Genuine CSV Data Exports
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Export individual modules as standard, clean UTF-8 comma-separated value spreadsheets compatible with Microsoft Excel, Google Sheets, and LibreOffice.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-11"
            onClick={handleExportTransactions}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <div className="text-left">
              <span className="block text-xs font-bold">Transactions CSV</span>
              <span className="block text-[10px] text-muted-foreground">{finance.transactions.length} records</span>
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-11"
            onClick={handleExportAccounts}
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
            <div className="text-left">
              <span className="block text-xs font-bold">Accounts CSV</span>
              <span className="block text-[10px] text-muted-foreground">{finance.accounts.length} accounts</span>
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-11"
            onClick={handleExportBudgets}
          >
            <FileSpreadsheet className="h-4 w-4 text-amber-400" />
            <div className="text-left">
              <span className="block text-xs font-bold">Budgets CSV</span>
              <span className="block text-[10px] text-muted-foreground">{finance.budgets.length} budgets</span>
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-11"
            onClick={handleExportLoanPayments}
          >
            <FileSpreadsheet className="h-4 w-4 text-purple-400" />
            <div className="text-left">
              <span className="block text-xs font-bold">EMI Repayments CSV</span>
              <span className="block text-[10px] text-muted-foreground">{finance.loanPayments.length} payments</span>
            </div>
          </Button>
        </div>
      </Card>

      {/* CSV Import Modal */}
      <CsvImportModal
        open={isCsvImportOpen}
        onOpenChange={setIsCsvImportOpen}
        accounts={finance.accounts}
        categories={finance.categories}
        existingTransactions={finance.transactions}
        onImportConfirm={async (validRows, fallbackAccId) => {
          for (const row of validRows) {
            // Find account
            const acc = finance.accounts.find(
              a => a.name.toLowerCase() === row.accountName.toLowerCase()
            );
            const targetAccId = acc?.id || fallbackAccId;

            // Find category
            const cat = finance.categories.find(
              c => c.name.toLowerCase() === row.categoryName.toLowerCase()
            );

            await finance.addTransaction({
              account_id: targetAccId,
              type: row.type,
              amount: row.amount,
              category_id: cat?.id || null,
              occurred_at: row.date,
              payment_method: 'upi',
              notes: row.notes || 'CSV Import',
              tags: ['csv_import'],
            });
          }
          toast.success(`Successfully imported ${validRows.length} transactions!`);
        }}
      />

      {/* JSON Restore Confirmation Modal */}
      <ConfirmationModal
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        title="Restore Database from Backup?"
        description={`This action will replace your local database records with the contents of "${restoreJsonFile?.name}". Make sure you have downloaded a backup of your current data before proceeding.`}
        confirmLabel="Yes, Overwrite & Restore"
        variant="destructive"
        isLoading={isRestoring}
        onConfirm={handleExecuteRestore}
      />
    </div>
  );
}
