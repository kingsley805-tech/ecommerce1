import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Order } from '@/types';

const schema = z.object({
  orderNumber: z.string().min(3, 'Enter your order number'),
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function OrderTrackingPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<Order>('/checkout/track', {
        query: { orderNumber: values.orderNumber, email: values.email },
      });
      setOrder(res);
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell max-w-2xl py-16">
      <div className="text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Track your order</h1>
        <p className="mt-2 text-muted-foreground">Enter your order number and the email used at checkout.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-2xl border p-6">
        <div><Label htmlFor="orderNumber">Order number</Label><Input id="orderNumber" placeholder="ORD-…" {...register('orderNumber')} /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register('email')} /></div>
        {formState.errors.orderNumber && <p className="text-xs text-destructive">{formState.errors.orderNumber.message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Searching…' : 'Track order'}</Button>
      </form>

      {order && (
        <div className="mt-8 rounded-2xl border p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="font-semibold">{order.orderNumber}</span>
            <span className="text-sm text-muted-foreground">{normalizeDate(order.placedAt)}</span>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-muted-foreground">Order status</p>
              <p className="mt-1 font-medium capitalize">{order.status.toLowerCase().replaceAll('_', ' ')}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-muted-foreground">Payment</p>
              <p className="mt-1 font-medium capitalize">{order.paymentStatus.toLowerCase().replaceAll('_', ' ')}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 font-medium">{formatPrice(parseFloat(order.grandTotal), order.currency)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-muted-foreground">Fulfillment</p>
              <p className="mt-1 font-medium capitalize">{order.fulfillmentStatus.toLowerCase().replaceAll('_', ' ')}</p>
            </div>
          </div>
          {order.shipments?.map((s) => (
            <div key={s.id} className="mt-4 rounded-lg border p-3 text-sm">
              <p><span className="text-muted-foreground">Carrier:</span> {s.carrier}</p>
              <p><span className="text-muted-foreground">Tracking:</span> {s.trackingNumber}</p>
              <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{s.status.toLowerCase()}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
