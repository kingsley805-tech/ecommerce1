import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Order, Paged } from '@/types';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'outline' | 'secondary' | 'destructive'> = {
  DELIVERED: 'success',
  SHIPPED: 'success',
  PENDING_PAYMENT: 'warning',
  PROCESSING: 'warning',
  CANCELLED: 'destructive',
  REFUNDED: 'secondary',
};

export default function MyOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiClient.get<Paged<Order>>('/orders', { query: { page: 1, pageSize: 20 } }),
  });

  if (isLoading) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  const orders = data?.items ?? [];

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/products">Start shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.id} to={`/account/orders/${order.id}`} className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-accent/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{order.orderNumber}</span>
              <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>{order.status.toLowerCase().replaceAll('_', ' ')}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Placed {normalizeDate(order.placedAt)} · {order.items.length} item(s)</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{formatPrice(parseFloat(order.grandTotal), order.currency)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
