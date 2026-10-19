import Papa from 'papaparse';
import { Transaction, Account, Category } from '@/types';
import { formatINR } from '../accounting/formatters';

export interface CsvImportRow {
  date: string;
  type: 'income' | 'expense';
  amount: number;
  accountName: string;
  categoryName: string;
  paymentMethod: string;
  notes: string;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

export interface CsvImportResult {
  totalRows: number;
  validRows: CsvImportRow[];
  errorRows: CsvImportRow[];
  duplicateCount: number;
}

/**
 * Exports transactions to standard CSV format.
 */
export function exportTransactionsToCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): string {
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const rows = transactions.map(tx => ({
    'Transaction ID': tx.id,
    'Date & Time': tx.occurred_at,
    'Type': tx.type.toUpperCase(),
    'Amount (INR)': tx.amount,
    'Account': accountMap.get(tx.account_id) || 'Unknown Account',
    'Category': tx.category_id ? categoryMap.get(tx.category_id) || 'Uncategorized' : 'None',
    'Payment Method': tx.payment_method.toUpperCase(),
    'Notes / Description': tx.notes || '',
    'Tags': (tx.tags || []).join('; '),
    'Status': tx.sync_status || 'synced',
  }));

  return Papa.unparse(rows);
}

/**
 * Triggers a native browser file download for text/csv or application/json.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates CSV transaction data.
 * Checks for invalid formats, missing values, and duplicate entries against existing transactions.
 */
export function parseAndValidateCsv(
  csvText: string,
  existingTransactions: Transaction[],
  accounts: Account[]
): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });

  const validRows: CsvImportRow[] = [];
  const errorRows: CsvImportRow[] = [];
  let duplicateCount = 0;

  for (let idx = 0; idx < parsed.data.length; idx++) {
    const raw = parsed.data[idx];
    const errors: string[] = [];

    // Map common header variations
    const rawDate = raw['date'] || raw['occurred_at'] || raw['date & time'] || raw['transaction date'] || '';
    const rawAmount = raw['amount'] || raw['amount (inr)'] || raw['value'] || '';
    const rawType = (raw['type'] || raw['transaction type'] || 'expense').toLowerCase().trim();
    const rawAccount = raw['account'] || raw['account name'] || accounts[0]?.name || '';
    const rawCategory = raw['category'] || raw['category name'] || 'Miscellaneous';
    const rawPayment = (raw['payment method'] || raw['method'] || 'upi').toLowerCase().trim();
    const rawNotes = raw['notes'] || raw['notes / description'] || raw['description'] || '';

    // Validate Date
    let parsedDate = new Date(rawDate);
    if (!rawDate || isNaN(parsedDate.getTime())) {
      // Try fallback to current date if missing or unparseable
      if (!rawDate) {
        parsedDate = new Date();
      } else {
        errors.push(`Row ${idx + 1}: Invalid date format "${rawDate}"`);
      }
    }

    // Validate Amount
    const cleanAmountStr = String(rawAmount).replace(/[₹,\s]/g, '');
    const amountNum = parseFloat(cleanAmountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push(`Row ${idx + 1}: Invalid or non-positive amount "${rawAmount}"`);
    }

    // Validate Type
    const normalizedType: 'income' | 'expense' = rawType.includes('income') || rawType.includes('credit')
      ? 'income'
      : 'expense';

    // Duplicate Detection: Check if a transaction with same date (day), amount, and type already exists
    const isDuplicate = existingTransactions.some(existing => {
      const sameAmount = Math.abs(existing.amount - amountNum) < 0.01;
      const sameType = existing.type === normalizedType;
      const sameDay = existing.occurred_at.slice(0, 10) === parsedDate.toISOString().slice(0, 10);
      return sameAmount && sameType && sameDay;
    });

    if (isDuplicate) {
      duplicateCount++;
    }

    const row: CsvImportRow = {
      date: parsedDate.toISOString(),
      type: normalizedType,
      amount: amountNum,
      accountName: rawAccount,
      categoryName: rawCategory,
      paymentMethod: rawPayment,
      notes: rawNotes,
      isValid: errors.length === 0,
      errors,
      isDuplicate,
    };

    if (row.isValid) {
      validRows.push(row);
    } else {
      errorRows.push(row);
    }
  }

  return {
    totalRows: parsed.data.length,
    validRows,
    errorRows,
    duplicateCount,
  };
}
