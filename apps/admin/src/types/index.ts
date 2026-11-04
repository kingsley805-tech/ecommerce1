export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paged<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  status: string;
  role?: string;
}

export interface ProductAdmin {
  id: string;
  slug: string;
  name: string;
  type: string;
  sku: string;
  status: string;
  visibility: string;
  featured: boolean;
  price: string;
  compareAtPrice: string | null;
  costPrice: string | null;
  description?: string | null;
  shortDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  images: { id: string; url: string; alt?: string | null; position: number }[];
  categories: { categoryId: string; category: { id: string; name: string; slug: string } }[];
  brand: { id: string; name: string } | null;
  variants: { id: string; sku: string; name?: string | null; attributes: Record<string, string>; price: string }[];
  inventoryLevels: { id: string; physicalStock: number; reservedStock: number; lowStockThreshold: number | null }[];
}

export interface InventoryLevelAdmin {
  id: string;
  physicalStock: number;
  reservedStock: number;
  lowStockThreshold: number | null;
  availableStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  product: { id: string; name: string; sku: string };
  variant: { id: string; sku: string; name?: string | null } | null;
  location: { id: string; name: string; code: string };
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotal: string;
  currency: string;
  customerName?: string | null;
  guestEmail?: string | null;
  placedAt: string;
  items: { id: string; productName: string; sku: string; quantity: number; totalAmount: string }[];
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  status: string;
  createdAt: string;
  role?: string;
  orderCount: number;
  lifetimeSpend: number;
}

export interface Promotion {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  value?: string | null;
  appliesTo: string;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
  minimumOrderAmount?: string | null;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  stackable: boolean;
  freeShipping: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  grandTotal: string;
  currency: string;
  paymentMethod?: string | null;
  orderNote?: string | null;
  placedAt: string;
  customerName?: string | null;
  guestEmail?: string | null;
  items: { id: string; productName: string; sku: string; quantity: number; totalAmount: string }[];
  addresses: { id: string; type: string; recipientName: string; line1: string; line2?: string | null; city: string; region?: string | null; country: string; phone?: string | null }[];
  payments?: { id: string; reference: string; status: string; amount: string; method: string }[];
  shipments?: { id: string; carrier: string; trackingNumber: string; status: string }[];
  refunds?: { id: string; amount: string; status: string }[];
}
