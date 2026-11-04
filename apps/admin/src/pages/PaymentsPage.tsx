import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { formatPrice, normalizeDateTime } from '@/lib/utils';
import type { Paged } from '@/types';

interface Payment {
  id: string;
  reference: string;
  provider: string;
  method: string;
  amount: string;
  currency: string;
  status: string;
  orderId: string;
  createdAt: string;
  order: { orderNumber: string };
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['payments', page],
    queryFn: () => apiClient.get<Paged<Payment>>('/admin/payments', { query: { page, pageSize: 20 } }),
  });

  const columns: Column<Payment>[] = [
    { key: 'ref', header: 'Reference', cell: (p) => <span className="font-mono text-xs">{p.reference}</span> },
    { key: 'order', header: 'Order', cell: (p) => p.order?.orderNumber ?? p.orderId },
    { key: 'method', header: 'Method', cell: (p) => <span className="text-sm">{p.method.toLowerCase().replaceAll('_', ' ')}</span> },
    { key: 'provider', header: 'Provider', cell: (p) => <span className="text-sm">{p.provider.toLowerCase().replaceAll('_', ' ')}</span> },
    { key: 'amount', header: 'Amount', cell: (p) => formatPrice(parseFloat(p.amount), p.currency) },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'FAILED' ? 'destructive' : 'warning'}>{p.status.toLowerCase().replaceAll('_', ' ')}</Badge> },
    { key: 'date', header: 'Date', cell: (p) => normalizeDateTime(p.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Payments" description="Transaction records and gateway activity" />
      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} onPageChange={setPage} />
    </div>
  );
}
