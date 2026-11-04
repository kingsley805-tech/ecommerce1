import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, PackagePlus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { formatPrice, normalizeDateTime } from '@/lib/utils';
import type { Order } from '@/types';

const STATUS_FLOW = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: order, isLoading } = useQuery({ queryKey: ['admin-order', id], queryFn: () => apiClient.get<Order>(`/admin/orders/${id}`) });

  const [note, setNote] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    if (order && order.orderNote) setNote(order.orderNote);
  }, [order]);

  const updateStatus = async (status: string) => {
    try {
      await apiClient.patch(`/admin/orders/${id}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast({ title: 'Order status updated', variant: 'success' });
    } catch (e) {
      toast({ title: 'Update failed', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const createShipment = async () => {
    if (!carrier || !tracking) return;
    try {
      await apiClient.post('/admin/orders/shipments', { orderId: id, carrier, trackingNumber: tracking });
      await queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast({ title: 'Shipment created', variant: 'success' });
      setCarrier('');
      setTracking('');
    } catch (e) {
      toast({ title: 'Could not create shipment', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const saveNote = async () => {
    await apiClient.post(`/admin/orders/${id}/notes`, { note });
    await queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    toast({ title: 'Note saved', variant: 'success' });
  };

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!order) return <p>Order not found</p>;

  const shippingAddress = order.addresses.find((a) => a.type === 'SHIPPING');
  const nextStep = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${normalizeDateTime(order.placedAt)}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/orders"><ArrowLeft className="h-4 w-4" /> Orders</Link></Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">Order: {order.status.toLowerCase().replaceAll('_', ' ')}</Badge>
        <Badge variant="secondary">Payment: {order.paymentStatus.toLowerCase().replaceAll('_', ' ')}</Badge>
        <Badge variant="secondary">Fulfillment: {order.fulfillmentStatus.toLowerCase().replaceAll('_', ' ')}</Badge>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {nextStep && <Button size="sm" onClick={() => void updateStatus(nextStep)}>Mark as {nextStep.toLowerCase().replaceAll('_', ' ')}</Button>}
        {!['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
          <Button size="sm" variant="outline" onClick={() => { if (confirm('Cancel this order?')) void updateStatus('CANCELLED'); }}>Cancel order</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(order.id)}><Copy className="h-3.5 w-3.5" /> Copy ID</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Items</h3>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku} · Qty: {item.quantity}</p>
                </div>
                <span className="font-medium">{formatPrice(parseFloat(item.totalAmount))}</span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(parseFloat(order.subtotal))}</span></div>
            {parseFloat(order.discountTotal) > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(parseFloat(order.discountTotal))}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatPrice(parseFloat(order.shippingTotal))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(parseFloat(order.taxTotal))}</span></div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between"><span className="font-medium">Total</span><span className="font-semibold">{formatPrice(parseFloat(order.grandTotal), order.currency)}</span></div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Customer</h3>
            <p className="text-sm">{order.customerName ?? 'Guest'}</p>
            {order.guestEmail && <p className="text-sm text-muted-foreground">{order.guestEmail}</p>}
            {shippingAddress && (
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{shippingAddress.recipientName}</p>
                <p>{shippingAddress.line1}, {shippingAddress.city}</p>
                <p>{shippingAddress.region}{shippingAddress.region && ', '}{shippingAddress.country}</p>
                {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Shipment</h3>
            {order.shipments?.map((s) => (
              <div key={s.id} className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{s.carrier}</p>
                <p className="text-muted-foreground">Tracking: {s.trackingNumber}</p>
                <p className="text-xs capitalize text-muted-foreground">Status: {s.status.toLowerCase()}</p>
              </div>
            ))}
            {!order.shipments?.length && <p className="text-sm text-muted-foreground">No shipment recorded.</p>}
            <div className="mt-3 space-y-2">
              <div><Label className="text-xs">Carrier</Label><Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. GIG Logistics" /></div>
              <div><Label className="text-xs">Tracking number</Label><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
              <Button size="sm" className="w-full" onClick={() => void createShipment()} disabled={!carrier || !tracking}><PackagePlus className="h-4 w-4" /> Record shipment</Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Internal note</h3>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[80px]" placeholder="Add an internal note…" />
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => void saveNote()}>Save note</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
