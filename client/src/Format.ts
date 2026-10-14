import type { Currency } from './api/types';

/** Minor units (kobo/cents) -> display string, e.g. 75000000 -> "₦750,000.00". Safe against NaN/null/undefined -> 0.00. */
export function formatMoney(minor: number | undefined | null, currency: Currency = 'NGN'): string {
  const num = Number(minor);
  const safeMinor = Number.isFinite(num) ? num : 0;
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeMinor / 100);
}

/** What the user typed in a naira box ("350,000") -> kobo (35000000). Returns null if it isn't a positive number. */
export function nairaToMinor(input: string): number | null {
  const n = Number(input.replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}