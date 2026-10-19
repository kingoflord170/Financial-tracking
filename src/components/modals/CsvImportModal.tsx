import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Account, Category, Transaction } from '@/types';
import { parseAndValidateCsv, CsvImportResult } from '@/lib/export/csv';
import { formatINR, formatDate } from '@/lib/accounting/formatters';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  existingTransactions: Transaction[];
  onImportConfirm: (
    validRows: CsvImportResult['validRows'],
    fallbackAccountId: string
  ) => Promise<void>;
}

export function CsvImportModal({
  open,
  onOpenChange,
  accounts,
  categories,
  existingTransactions,
  onImportConfirm,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [fallbackAccountId, setFallbackAccountId] = useState(accounts[0]?.id || '');
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseAndValidateCsv(text, existingTransactions, accounts);
        setResult(parsed);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirm = async () => {
    if (!result) return;
    const rowsToImport = skipDuplicates
      ? result.validRows.filter(r => !r.isDuplicate)
      : result.validRows;

    if (rowsToImport.length === 0) return;

    try {
      setIsImporting(true);
      await onImportConfirm(rowsToImport, fallbackAccountId);
      onOpenChange(false);
      setFile(null);
      setResult(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import Transactions from CSV"
      description="Upload bank statements, UPI export CSVs, or transaction logs with automated duplicate detection."
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Upload Zone */}
        {!result ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/80 bg-card-elevated/40 hover:bg-card-elevated/60 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSVs with headers: Date, Amount, Type, Category, Notes, Payment Method
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* File & Validation Summary */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-card-elevated border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{file?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{result.totalRows} total rows found</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                Change File
              </Button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                </span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{result.validRows.length}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Duplicates
                </span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">{result.duplicateCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-rose-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Errors
                </span>
                <p className="text-lg font-bold text-rose-400 mt-0.5">{result.errorRows.length}</p>
              </div>
            </div>

            {/* Duplicate handling toggle */}
            {result.duplicateCount > 0 && (
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none p-2 rounded-lg bg-card-elevated border border-border">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={e => setSkipDuplicates(e.target.checked)}
                  className="rounded border-input-border bg-input-bg text-primary focus:ring-primary h-4 w-4 accent-primary"
                />
                <span>Skip detected duplicate transactions ({result.duplicateCount} items)</span>
              </label>
            )}

            {/* Fallback Account Selector */}
            <Select
              label="Assign Transactions to Account (If unspecified in CSV)"
              value={fallbackAccountId}
              onChange={e => setFallbackAccountId(e.target.value)}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </Select>

            {/* Preview Table */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preview (First 5 Rows)
              </p>
              <div className="overflow-x-auto rounded-xl border border-border max-h-48 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-card-elevated text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Notes</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {result.validRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-card-elevated/40">
                        <td className="p-2 whitespace-nowrap">{formatDate(row.date, 'short')}</td>
                        <td className="p-2 font-semibold">
                          <span className={row.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                            {row.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-semibold">{formatINR(row.amount)}</td>
                        <td className="p-2 truncate max-w-[150px]">{row.notes || '-'}</td>
                        <td className="p-2">
                          {row.isDuplicate ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                              Duplicate
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error Rows Display */}
            {result.errorRows.length > 0 && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive max-h-28 overflow-y-auto">
                <p className="font-bold mb-1">Rows with format errors (will be skipped):</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {result.errorRows.slice(0, 5).map((errRow, i) => (
                    <li key={i}>{errRow.errors.join(', ')}</li>
                  ))}
                  {result.errorRows.length > 5 && (
                    <li>...and {result.errorRows.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isImporting}
                onClick={handleConfirm}
                disabled={result.validRows.length === 0}
              >
                Import {skipDuplicates ? result.validRows.length - result.duplicateCount : result.validRows.length} Transactions
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
