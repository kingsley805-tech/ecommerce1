import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Order } from '@/types';

export default function OrderConfirmationPage() {
  const { orderId = '' } = useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get<Order>(`/orders/${orderId}`),
    enabled: !!orderId,
    retry: false,
  });

  return (
    <div className="container-shell flex min-h-[60vh] max-w-2xl flex-col items-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold">Thank you for your order</h1>
      <p className="mt-2 text-muted-foreground">
        A confirmation has been sent to your email. Your order is being prepared.
      </p>

      {isLoading ? (
        <div className="mt-8 w-full space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : order ? (
        <div className="mt-8 w-full rounded-2xl border p-6 text-left">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{order.orderNumber}</span>
            </div>
            <span className="text-sm text-muted-foreground">Placed {normalizeDate(order.placedAt)}</span>
          </div>
          <div className="mt-4 space-y-2">
            {order.items.slice(0, 4).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity} × {item.productName}</span>
                <span>{formatPrice(parseFloat(item.totalAmount))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-base">
            <span className="font-medium">Order total</span>
            <span className="font-semibold">{formatPrice(parseFloat(order.grandTotal), order.currency)}</span>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p>Payment status: <span className="font-medium capitalize text-foreground">{order.paymentStatus.toLowerCase().replaceAll('_', ' ')}</span></p>
            <p className="mt-1">Order status: <span className="font-medium capitalize text-foreground">{order.status.toLowerCase().replaceAll('_', ' ')}</span></p>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-muted-foreground">Unable to load order details.</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild><Link to="/account/orders">View my orders</Link></Button>
        <Button asChild variant="outline"><Link to="/products">Continue shopping</Link></Button>
      </div>
    </div>
  );
}
