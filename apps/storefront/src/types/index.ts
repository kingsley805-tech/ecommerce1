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

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  type: 'SIMPLE' | 'VARIABLE';
  price: string;
  compareAtPrice: string | null;
  salePrice: string | null;
  ratingAvg: string;
  ratingCount: number;
  soldCount: number;
  featured: boolean;
  image: string | null;
  imageAlt?: string | null;
  brandName?: string | null;
  categories: string[];
  discountPercent?: number | null;
  variants?: ProductVariantOption[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name?: string | null;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  imageUrl?: string | null;
  isDefault: boolean;
}

export interface ProductVariantOption {
  id: string;
  name?: string | null;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  imageUrl?: string | null;
  isDefault: boolean;
}

export interface CategoryFlat {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl?: string | null;
  description?: string | null;
  children?: CategoryFlat[];
}

export interface ProductDetail extends Omit<ProductListItem, 'categories'> {
  description?: string | null;
  shortDescription?: string | null;
  sku: string;
  status: string;
  weightGrams?: number | null;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: { category: { id: string; name: string; slug: string } }[];
  brand: { id: string; name: string; slug: string } | null;
  attributes: { id: string; name: string; values: unknown }[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    slug: string;
    name: string;
    price: string;
    compareAtPrice: string | null;
    salePrice: string | null;
    saleStartAt: string | null;
    saleEndAt: string | null;
    status: string;
    images: { url: string; alt?: string | null }[];
    variants?: { id: string; attributes: Record<string, string>; name?: string | null }[];
  };
  variant: (ProductVariant & { attributes: Record<string, string> }) | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  couponCode?: string | null;
}

export interface AddressInput {
  recipientName: string;
  phone?: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
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

export interface OrderItem {
  id: string;
  sku: string;
  productName: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  unitPrice: string;
  quantity: number;
  totalAmount: string;
}

export interface OrderAddress {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
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
  couponCode?: string | null;
  paymentMethod?: string | null;
  placedAt: string;
  items: OrderItem[];
  addresses: OrderAddress[];
  payments?: { id: string; reference: string; status: string; amount: string; method: string }[];
  shipments?: { id: string; carrier: string; trackingNumber: string; status: string }[];
  refunds?: { id: string; amount: string; status: string }[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  type: string;
  price: string | null;
  estimatedMinDays?: number | null;
  estimatedMaxDays?: number | null;
  minOrderAmount?: string | null;
}

export interface PricingResult {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  taxRate: number;
  shippingMethodId?: string;
  lines: {
    productId: string;
    variantId?: string | null;
    sku: string;
    name: string;
    quantity: number;
    effectivePrice: number;
    lineTotal: number;
  }[];
  promotionSnapshot?: unknown;
}

export interface HomepageSection {
  id: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  config?: unknown;
  displayOrder: number;
}
