import { describe, it, expect } from 'vitest';
import { formatPrice, discountPercent } from './utils';

describe('formatPrice', () => {
  it('formats GHS with symbol and two decimals', () => {
    expect(formatPrice(1234.5)).toBe('₵1234.50');
  });
  it('handles string input', () => {
    expect(formatPrice('99')).toBe('₵99.00');
  });
  it('handles null/undefined as zero', () => {
    expect(formatPrice(null)).toBe('₵0.00');
    expect(formatPrice(undefined)).toBe('₵0.00');
  });
});

describe('discountPercent', () => {
  it('computes percentage off', () => {
    expect(discountPercent(80, 100)).toBe(20);
  });
  it('returns null when there is no discount', () => {
    expect(discountPercent(100, 80)).toBeNull();
    expect(discountPercent(80, null)).toBeNull();
    expect(discountPercent(80, 0)).toBeNull();
  });
});
