import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Paged, ProductAdmin } from '@/types';

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, q, status],
    queryFn: () => apiClient.get<Paged<ProductAdmin>>('/admin/products', { query: { page, pageSize: 15, q, status } }),
  });

  const mutate = async (action: string, id: string, body?: unknown) => {
    try {
      if (action === 'delete') await apiClient.delete(`/admin/products/${id}`);
      else if (action === 'duplicate') await apiClient.post(`/admin/products/${id}/duplicate`);
      else if (action === 'toggle') {
        await apiClient.patch(`/admin/products/${id}`, body);
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Product updated', variant: 'success' });
    } catch (e) {
      toast({ title: 'Action failed', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const columns: Column<ProductAdmin>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
            {p.images[0] && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'price', header: 'Price', cell: (p) => formatPrice(parseFloat(p.price)) },
    {
      key: 'status', header: 'Status', cell: (p) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'secondary'}>{p.status.toLowerCase()}</Badge>
          {p.visibility === 'HIDDEN' && <Badge variant="outline">hidden</Badge>}
          {p.featured && <Badge variant="default">featured</Badge>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (p) => p.categories[0]?.category.name ?? '—' },
    { key: 'created', header: 'Created', cell: (p) => normalizeDate(p.createdAt) },
    {
      key: 'actions', header: 'Actions', cell: (p) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/products/${p.id}`)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
          <Link to={`/products/${p.slug}`} target="_blank"><Button variant="ghost" size="icon-sm" aria-label="View"><Eye className="h-4 w-4" /></Button></Link>
          <Button variant="ghost" size="icon-sm" onClick={() => void mutate('duplicate', p.id)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
          {p.status === 'ACTIVE'
            ? <Button variant="ghost" size="icon-sm" onClick={() => void mutate('toggle', p.id, { status: 'DRAFT' })} aria-label="Unpublish"><Eye className="h-4 w-4 text-muted-foreground" /></Button>
            : <Button variant="ghost" size="icon-sm" onClick={() => void mutate('toggle', p.id, { status: 'ACTIVE' })} aria-label="Publish"><Eye className="h-4 w-4 text-success" /></Button>}
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { if (confirm('Archive this product?')) void mutate('delete', p.id); }} aria-label="Archive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalog"
        actions={<Button onClick={() => navigate('/admin/products/new')}><Plus className="h-4 w-4" /> New product</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search name or SKU…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
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
