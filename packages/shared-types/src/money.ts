/**
 * Money is always represented as integer minor units, e.g. "50.00" GHS
 * = 5000 (pesewas). Backend converts and stores as PostgreSQL numeric.
 */
export const MONEY_PRECISION = 2;

export function toMinorUnits(amount: string | number): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return Math.round(n * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}
