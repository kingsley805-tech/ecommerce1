import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { normalizeDate } from '@/lib/utils';
import type { Paged } from '@/types';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  status: string;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { name: string };
  customer: { firstName: string; lastName: string; email: string };
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('PENDING');
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', tab],
    queryFn: () => apiClient.get<Paged<Review>>('/admin/reviews', { query: { page: 1, pageSize: 50, status: tab } }),
  });

  const moderate = async (id: string, status: string) => {
    await apiClient.patch(`/admin/reviews/${id}/moderate`, { status });
    await queryClient.invalidateQueries({ queryKey: ['reviews'] });
    toast({ title: `Review ${status.toLowerCase()}`, variant: 'success' });
  };

  const columns: Column<Review>[] = [
    {
      key: 'review', header: 'Review', cell: (r) => (
        <div className="max-w-md">
          <p className="font-medium">{r.product.name}</p>
          <p className="text-xs text-amber-500">{"★".repeat(r.rating)}</p>
          <p className="text-sm text-muted-foreground">{r.body}</p>
          {r.verifiedPurchase && <Badge variant="success" className="mt-1">verified purchase</Badge>}
        </div>
      ),
    },
    { key: 'customer', header: 'Customer', cell: (r) => <span className="text-sm">{r.customer.firstName} {r.customer.lastName}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'destructive' : 'warning'}>{r.status.toLowerCase()}</Badge> },
    { key: 'date', header: 'Date', cell: (r) => normalizeDate(r.createdAt) },
    {
      key: 'actions', header: 'Actions', cell: (r) => (
        <div className="flex gap-1">
          {r.status === 'PENDING' && <><Button size="sm" variant="outline" onClick={() => void moderate(r.id, 'APPROVED')}>Approve</Button><Button size="sm" variant="ghost" onClick={() => void moderate(r.id, 'REJECTED')}>Reject</Button></>}
          {r.status === 'APPROVED' && <Button size="sm" variant="ghost" onClick={() => void moderate(r.id, 'REJECTED')}>Unapprove</Button>}
          {r.status === 'REJECTED' && <Button size="sm" variant="outline" onClick={() => void moderate(r.id, 'APPROVED')}>Approve</Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer reviews" />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} />
    </div>
  );
}
