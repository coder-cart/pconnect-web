/** Client-facing money (USD by default). Editor/artist pay stays INR separately. */

export const CLIENT_PRICE_CURRENCY_DEFAULT = 'USD';
export const EDITOR_PAY_CURRENCY = 'INR';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
};

export function normalizeCurrencyCode(
  currency?: string | null,
  fallback = CLIENT_PRICE_CURRENCY_DEFAULT,
): string {
  const code = (currency ?? fallback).trim().toUpperCase();
  return code || fallback;
}

export function currencySymbol(currency?: string | null): string {
  const code = normalizeCurrencyCode(currency);
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function formatMoney(
  value?: string | number | null,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  const code = normalizeCurrencyCode(currency);
  const symbol = currencySymbol(code);
  const formatted =
    num % 1 === 0
      ? num.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  // Symbol-first for common currencies ($12, ₹12); code-prefix otherwise
  if (CURRENCY_SYMBOLS[code]) {
    return `${symbol}${formatted}`;
  }
  return `${code} ${formatted}`;
}

export function formatEditorMoney(value?: string | number | null): string {
  return formatMoney(value, EDITOR_PAY_CURRENCY);
}
