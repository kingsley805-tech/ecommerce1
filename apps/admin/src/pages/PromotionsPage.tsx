import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Power, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { formatPrice, normalizeDate } from '@/lib/utils';
import type { Paged, Promotion } from '@/types';

const schema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.coerce.number().nonnegative().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  minimumOrderAmount: z.coerce.number().nonnegative().optional(),
  stackable: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PromotionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PERCENTAGE', startsAt: new Date().toISOString().slice(0, 16), stackable: false, freeShipping: false },
  });

  const { data, isLoading } = useQuery({ queryKey: ['promotions'], queryFn: () => apiClient.get<Paged<Promotion>>('/admin/promotions', { query: { page: 1, pageSize: 50 } }) });

  const onCreate = async (values: FormValues) => {
    try {
      await apiClient.post('/admin/promotions', { ...values, startsAt: new Date(values.startsAt).toISOString(), endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null });
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setShowForm(false);
      form.reset();
      toast({ title: 'Promotion created', variant: 'success' });
    } catch (e) {
      toast({ title: 'Could not create', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const toggle = async (p: Promotion) => {
    await apiClient.patch(`/admin/promotions/${p.id}/toggle`, { isActive: !p.isActive });
    await queryClient.invalidateQueries({ queryKey: ['promotions'] });
  };

  const remove = async (id: string) => {
    await apiClient.delete(`/admin/promotions/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['promotions'] });
    toast({ title: 'Promotion deleted' });
  };

  const columns: Column<Promotion>[] = [
    { key: 'name', header: 'Promotion', cell: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.code || 'no code'}</p></div> },
    { key: 'type', header: 'Type', cell: (p) => <span className="text-sm">{p.type.toLowerCase().replaceAll('_', ' ')}</span> },
    { key: 'value', header: 'Value', cell: (p) => p.type === 'PERCENTAGE' ? `${p.value}%` : p.type === 'FIXED_AMOUNT' ? formatPrice(Number(p.value)) : 'Free shipping' },
    { key: 'active', header: 'Active', cell: (p) => <Badge variant={p.isActive ? 'success' : 'secondary'}>{p.isActive ? 'active' : 'inactive'}</Badge> },
    { key: 'window', header: 'Window', cell: (p) => <span className="text-sm">{normalizeDate(p.startsAt)}{p.endsAt ? ` → ${normalizeDate(p.endsAt)}` : ''}</span> },
    {
      key: 'actions', header: '', cell: (p) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => void toggle(p)} aria-label="Toggle"><Power className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { if (confirm('Delete this promotion?')) void remove(p.id); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Promotions" description="Discounts, coupons and offers" actions={<Button onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" /> New promotion</Button>} />

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <h3 className="mb-4 font-semibold">Create promotion</h3>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
            <div><Label>Name</Label><Input {...form.register('name')} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Coupon code (optional)</Label><Input {...form.register('code')} /></div>
              <div><Label>Type</Label>
                <select {...form.register('type')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed amount</option>
                  <option value="FREE_SHIPPING">Free shipping</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Value (e.g. 15 for 15%)</Label><Input type="number" {...form.register('value')} /></div>
              <div><Label>Min order (₵)</Label><Input type="number" {...form.register('minimumOrderAmount')} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Starts</Label><Input type="datetime-local" {...form.register('startsAt')} /></div>
              <div><Label>Ends (optional)</Label><Input type="datetime-local" {...form.register('endsAt')} /></div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('stackable')} className="h-4 w-4" /> Stackable</label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns} data={data?.items ?? []} meta={data?.meta} loading={isLoading} />
    </div>
  );
}
