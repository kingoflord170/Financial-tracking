/**
 * Formats a numeric value into the Indian Rupee (INR) currency format: ₹1,50,000.00
 * Handles negative amounts properly: -₹500.00
 */
export function formatINR(amount: number | null | undefined, includeDecimals = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats an amount into compact Indian format: ₹15.5K, ₹2.4L (Lakhs), ₹1.2Cr (Crores)
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let formatted = '';
  if (abs >= 10000000) { // 1 Crore
    formatted = `₹${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) { // 1 Lakh
    formatted = `₹${(abs / 100000).toFixed(2)} L`;
  } else if (abs >= 1000) { // 1 Thousand
    formatted = `₹${(abs / 1000).toFixed(1)} K`;
  } else {
    formatted = formatINR(abs, false);
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats standard ISO dates to clean user-friendly strings in en-IN locale
 */
export function formatDate(dateInput: string | Date, formatType: 'short' | 'medium' | 'full' | 'time' = 'medium'): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  if (formatType === 'short') {
    // 19 Oct
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  if (formatType === 'full') {
    // 19 October 2026, 02:30 PM
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (formatType === 'time') {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // default 'medium': 19 Oct 2026
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a percentage value (e.g. 74.5%)
 */
export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
}
