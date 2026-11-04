import { describe, it, expect, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  inventoryLevel: { findFirst: vi.fn() },
}));

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

import { assertStock } from './cart.service';
import { ApiError } from '../../lib/errors';

describe('assertStock (oversell prevention)', () => {
  it('allows a purchase within available stock', async () => {
    mockPrisma.inventoryLevel.findFirst.mockResolvedValueOnce({ physicalStock: 10, reservedStock: 3 });
    await expect(assertStock('p1', null, 5)).resolves.toBeUndefined();
  });

  it('throws when requested quantity exceeds available stock', async () => {
    mockPrisma.inventoryLevel.findFirst.mockResolvedValueOnce({ physicalStock: 10, reservedStock: 8 });
    await expect(assertStock('p1', null, 5)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws when no inventory exists for the product', async () => {
    mockPrisma.inventoryLevel.findFirst.mockResolvedValueOnce(null);
    await expect(assertStock('p1', null, 1)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('treats reserved stock as unavailable', async () => {
    mockPrisma.inventoryLevel.findFirst.mockResolvedValueOnce({ physicalStock: 5, reservedStock: 5 });
    await expect(assertStock('p1', null, 1)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });
});
