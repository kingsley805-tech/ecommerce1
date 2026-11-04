import { describe, it, expect } from 'vitest';
import { formatPrice, normalizeDate, toISODate } from './utils';

describe('admin utils', () => {
  it('formats GHS prices', () => {
    expect(formatPrice(2500)).toBe('₵2500.00');
  });

  it('normalizes dates to a readable string', () => {
    expect(normalizeDate('2026-10-29T00:00:00Z')).toMatch(/29/);
    expect(normalizeDate(null)).toBe('—');
  });

  it('converts a Date to an ISO date string', () => {
    expect(toISODate(new Date('2026-10-29T12:34:00Z'))).toBe('2026-10-29');
  });
});
