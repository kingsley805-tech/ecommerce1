import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Customer, Paged } from '@/types';

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, q],
    queryFn: () => apiClient.get<Paged<Customer>>('/admin/customers', { query: { page, pageSize: 20, q } }),
  });

  const toggleStatus = async (c: Customer) => {
    const next = c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await apiClient.patch(`/admin/customers/${c.id}`, { status: next });
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    toast({ title: 'Customer updated', variant: 'success' });
  };

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Customer', cell: (c) => <div><p className="font-medium">{c.fullName}</p><p className="text-xs text-muted-foreground">{c.email}</p></div> },
    { key: 'orders', header: 'Orders', cell: (c) => c.orderCount },
    { key: 'spend', header: 'Lifetime spend', cell: (c) => formatPrice(c.lifetimeSpend) },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>{c.status.toLowerCase()}</Badge> },
    { key: 'joined', header: 'Joined', cell: (c) => normalizeDate(c.createdAt) },
    {
      key: 'actions', header: '', cell: (c) => (
        <Button variant="outline" size="sm" onClick={() => void toggleStatus(c)}>{c.status === 'ACTIVE' ? 'Disable' : 'Enable'}</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer accounts"
        actions={<Button variant="outline" size="sm" onClick={() => window.open('/api/v1/admin/customers/export', '_self')}><Download className="h-4 w-4" /> Export CSV</Button>}
      />
      <div className="mb-4">
        <Input placeholder="Search by name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
      </div>
      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} onPageChange={setPage} />
    </div>
  );
}
