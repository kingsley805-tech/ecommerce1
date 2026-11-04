import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string | null | undefined, currency = 'GHS'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const symbol = currency === 'GHS' ? '₵' : '$';
  return `${symbol}${value.toFixed(2)}`;
}

export function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function normalizeDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

const NAMED_COLORS: Record<string, string> = {
  black: '#0a0a0a',
  white: '#ffffff',
  red: '#ef4444',
  maroon: '#7f1d1d',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  green: '#22c55e',
  lime: '#84cc16',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  brown: '#92400e',
  tan: '#d2b48c',
  beige: '#f5f5dc',
  cream: '#fdf3e3',
  navy: '#1e3a5f',
  gray: '#6b7280',
  grey: '#6b7280',
  silver: '#c0c0c0',
  gold: '#d4af37',
  bronze: '#cd7f32',
  khaki: '#c3b091',
  olive: '#556b2f',
  coral: '#ff7f50',
  turquoise: '#40e0d0',
  lavender: '#e6e6fa',
  slate: '#475569',
};

export function colorToHex(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return '#6b7280';
  if (raw.startsWith('#')) return /^#[0-9a-f]{3,8}$/i.test(raw) ? raw : '#6b7280';
  if (raw.startsWith('rgb')) return raw;
  if (NAMED_COLORS[raw]) return NAMED_COLORS[raw];
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = raw.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  let hex = '#';
  for (let i = 0; i < 3; i++) {
    const c = (hash >> (i * 8)) & 0xff;
    hex += ((c < 16 ? '0' : '') + c.toString(16));
  }
  return hex;
}
