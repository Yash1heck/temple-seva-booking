/**
 * Safe currency and number formatting utilities.
 * Completely immune to null, undefined, strings, or missing values.
 */

export function formatCurrency(value: any, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
}

export function parseCurrency(value: any): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

