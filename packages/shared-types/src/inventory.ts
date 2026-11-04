import type { InventoryMovementType } from './prisma';

export interface StockLevelDTO {
  productId: string;
  variantId: string | null;
  sku: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface InventoryMovementDTO {
  id: string;
  productId: string;
  variantId: string | null;
  type: InventoryMovementType;
  previousQuantity: number;
  quantityChange: number;
  resultingQuantity: number;
  reason: string | null;
  reference: string | null;
  userId: string | null;
  createdAt: string;
}
