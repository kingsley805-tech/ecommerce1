import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Order } from '@/types';

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get<Order>(`/orders/${orderId}`),
    enabled: !!orderId,
  });

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40 w-full" /></div>;

  if (!order) {
    return (
      <div className="text-center">
        <p>Order not found.</p>
        <Button asChild variant="outline" className="mt-3"><Link to="/account/orders">Back to orders</Link></Button>
      </div>
    );
  }

  const shippingAddress = order.addresses.find((a) => a.type === 'SHIPPING');

  return (
    <div>
      <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold">{order.orderNumber}</h2>
        <Badge variant="secondary">{order.status.toLowerCase().replaceAll('_', ' ')}</Badge>
        <Badge variant="outline">Payment: {order.paymentStatus.toLowerCase().replaceAll('_', ' ')}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Placed {normalizeDate(order.placedAt)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-xl border p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">SKU: {item.sku}{item.variantLabel ? ` · ${item.variantLabel}` : ''}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <span className="font-semibold">{formatPrice(parseFloat(item.totalAmount))}</span>
            </div>
          ))}
        </div>

        <div className="h-fit space-y-4 rounded-xl border p-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(parseFloat(order.subtotal))}</span></div>
            {parseFloat(order.discountTotal) > 0 && (
              <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(parseFloat(order.discountTotal))}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(parseFloat(order.shippingTotal))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(parseFloat(order.taxTotal))}</span></div>
          </div>
          <Separator />
          <div className="flex justify-between"><span className="font-medium">Total</span><span className="font-semibold">{formatPrice(parseFloat(order.grandTotal), order.currency)}</span></div>

          {shippingAddress && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="font-medium">Delivery address</p>
                <p className="mt-1 text-muted-foreground">{shippingAddress.recipientName}</p>
                <p className="text-muted-foreground">{shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.country}</p>
              </div>
            </>
          )}

          {order.payments?.map((p) => (
            <div key={p.id} className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Payment reference</p>
              <p className="font-mono text-xs">{p.reference}</p>
              <p className="mt-1 capitalize text-muted-foreground">{p.status.toLowerCase().replaceAll('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
