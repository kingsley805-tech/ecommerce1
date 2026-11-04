import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { OrderSummary, Paged } from '@/types';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'destructive' | 'outline'> = {
  DELIVERED: 'success', SHIPPED: 'success', PENDING_PAYMENT: 'warning', PROCESSING: 'warning',
  PACKED: 'secondary', CONFIRMED: 'secondary', CANCELLED: 'destructive', REFUNDED: 'secondary', RETURNED: 'secondary',
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, q, status, paymentStatus],
    queryFn: () => apiClient.get<Paged<OrderSummary>>('/admin/orders', { query: { page, pageSize: 20, q, status, paymentStatus } }),
  });

  const columns: Column<OrderSummary>[] = [
    {
      key: 'order', header: 'Order', cell: (o) => (
        <div><Link to={`/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link><p className="text-xs text-muted-foreground">{o.customerName ?? o.guestEmail}</p></div>
      ),
    },
    { key: 'status', header: 'Status', cell: (o) => <Badge variant={STATUS_VARIANT[o.status] ?? 'outline'}>{o.status.toLowerCase().replaceAll('_', ' ')}</Badge> },
    { key: 'payment', header: 'Payment', cell: (o) => <span className="text-sm capitalize">{o.paymentStatus.toLowerCase().replaceAll('_', ' ')}</span> },
    { key: 'total', header: 'Total', cell: (o) => formatPrice(parseFloat(o.grandTotal), o.currency) },
    { key: 'date', header: 'Placed', cell: (o) => normalizeDate(o.placedAt) },
  ];

  return (
    <div>
      <PageHeader title="Orders" description="Manage fulfillment and order statuses" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search order, customer, email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING_PAYMENT">Pending payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="PACKED">Packed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All payment statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        loading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}
