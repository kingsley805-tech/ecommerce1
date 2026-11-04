import type { OrderStatus, PaymentStatus, FulfillmentStatus } from './prisma';

/** Snapshot of an order line item (historical copy of product data). */
export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  sku: string;
  productName: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  weightGrams: number | null;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItemDTO[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
}
