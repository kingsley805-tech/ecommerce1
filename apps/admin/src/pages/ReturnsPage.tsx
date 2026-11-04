import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { normalizeDate } from '@/lib/utils';
import type { Paged } from '@/types';

interface ReturnRequest {
  id: string;
  number: string;
  status: string;
  reason: string;
  createdAt: string;
  order: { orderNumber: string; customerName?: string | null; guestEmail?: string | null };
  items: { id: string; quantity: number; orderItem: { productName: string } }[];
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn: () => apiClient.get<Paged<ReturnRequest>>('/admin/returns', { query: { page, pageSize: 20 } }),
  });

  const decide = async (id: string, status: string, restock?: boolean) => {
    await apiClient.patch(`/admin/returns/${id}/decide`, { status, restock });
    await queryClient.invalidateQueries({ queryKey: ['returns'] });
    toast({ title: `Return ${status.toLowerCase()}`, variant: 'success' });
  };

  const columns: Column<ReturnRequest>[] = [
    { key: 'number', header: 'Return', cell: (r) => <div><p className="font-medium">{r.number}</p><p className="text-xs text-muted-foreground">Order {r.order.orderNumber}</p></div> },
    { key: 'customer', header: 'Customer', cell: (r) => r.order.customerName ?? r.order.guestEmail ?? '—' },
    { key: 'reason', header: 'Reason', cell: (r) => <span className="text-sm">{r.reason}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="secondary">{r.status.toLowerCase()}</Badge> },
    { key: 'date', header: 'Requested', cell: (r) => normalizeDate(r.createdAt) },
    {
      key: 'actions', header: 'Actions', cell: (r) => (
        <div className="flex gap-1">
          {r.status === 'REQUESTED' && <Button size="sm" variant="outline" onClick={() => void decide(r.id, 'APPROVED')}>Approve</Button>}
          {r.status === 'REQUESTED' && <Button size="sm" variant="ghost" onClick={() => void decide(r.id, 'REJECTED')}>Reject</Button>}
          {r.status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => void decide(r.id, 'RECEIVED')}>Receive</Button>}
          {r.status === 'RECEIVED' && <Button size="sm" variant="outline" onClick={() => void decide(r.id, 'INSPECTED', true)}>Inspect & restock</Button>}
          {r.status === 'INSPECTED' && <Button size="sm" variant="outline" onClick={() => void decide(r.id, 'COMPLETED')}>Complete</Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Returns" description="Customer return requests" />
      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} onPageChange={setPage} />
    </div>
  );
}
