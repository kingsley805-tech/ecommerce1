import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import type { InventoryLevelAdmin, Paged } from '@/types';

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, q, lowOnly],
    queryFn: () => apiClient.get<Paged<InventoryLevelAdmin>>('/admin/inventory', { query: { page, pageSize: 20, q, lowStock: lowOnly ? 'true' : undefined } }),
  });

  const [adjusting, setAdjusting] = useState<{ productId: string; variantId?: string | null; levelId: string } | null>(null);
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');

  const adjust = async () => {
    if (!adjusting || qty === 0) return;
    try {
      await apiClient.post('/admin/inventory/adjustments', {
        productId: adjusting.productId,
        variantId: adjusting.variantId ?? null,
        quantityChange: qty,
        reason: reason || 'Manual adjustment',
        type: 'ADJUSTMENT',
      });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: 'Stock adjusted', variant: 'success' });
      setAdjusting(null);
      setQty(0);
      setReason('');
    } catch (e) {
      toast({ title: 'Adjustment failed', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const columns: Column<InventoryLevelAdmin>[] = [
    { key: 'product', header: 'Product', cell: (r) => <div><p className="font-medium">{r.product.name}</p><p className="text-xs text-muted-foreground">{r.product.sku}</p></div> },
    { key: 'variant', header: 'Variant', cell: (r) => r.variant ? <span className="text-sm">{r.variant.sku}</span> : <span className="text-muted-foreground">—</span> },
    { key: 'loc', header: 'Location', cell: (r) => r.location.name },
    { key: 'physical', header: 'Physical', cell: (r) => r.physicalStock },
    { key: 'reserved', header: 'Reserved', cell: (r) => r.reservedStock },
    { key: 'available', header: 'Available', cell: (r) => <span className="font-medium">{r.availableStock}</span> },
    {
      key: 'state', header: 'State', cell: (r) => (
        <div className="flex gap-1">
          {r.isOutOfStock ? <Badge variant="destructive">out of stock</Badge> : r.isLowStock ? <Badge variant="warning">low</Badge> : <Badge variant="success">ok</Badge>}
        </div>
      ),
    },
    {
      key: 'actions', header: '', cell: (r) => (
        <Button variant="outline" size="sm" onClick={() => setAdjusting({ productId: r.product.id, variantId: r.variant?.id, levelId: r.id })}><Plus className="h-3.5 w-3.5" /> Adjust</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels and movements" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search product or SKU…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} className="h-4 w-4" /> Low / out of stock only</label>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} onPageChange={setPage} />

      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdjusting(null)} />
          <Card className="relative z-10 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold">Adjust stock</h3>
            <div className="mt-4 space-y-4">
              <div><Label>Quantity change (+/-)</Label><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
              <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. stock receipt" /></div>
              <div className="flex gap-2">
                <Button onClick={() => void adjust()} disabled={qty === 0}>Apply</Button>
                <Button variant="ghost" onClick={() => setAdjusting(null)}>Cancel</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
