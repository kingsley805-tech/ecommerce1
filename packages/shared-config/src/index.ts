export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '/api/v1';

export const STOREFRONT_URL = import.meta.env?.VITE_STOREFRONT_URL ?? 'http://localhost:5173';
export const ADMIN_URL = import.meta.env?.VITE_ADMIN_URL ?? 'http://localhost:5174';

export const DEFAULT_CURRENCY = 'GHS';
export const DEFAULT_CURRENCY_SYMBOL = '₵';

export const CURRENCIES = {
  GHS: { symbol: '₵', decimalPlaces: 2 },
  USD: { symbol: '$', decimalPlaces: 2 },
  NGN: { symbol: '₦', decimalPlaces: 2 },
  GBP: { symbol: '£', decimalPlaces: 2 },
  EUR: { symbol: '€', decimalPlaces: 2 },
} as const;

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  const c = CURRENCIES[currency as keyof typeof CURRENCIES] ?? CURRENCIES.GHS;
  return `${c.symbol}${amount.toFixed(c.decimalPlaces)}`;
}
