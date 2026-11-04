import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  featured: boolean;
  _count: { products: number };
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, hyphens'),
  description: z.string().optional(),
  logoUrl: z.string().url('Enter a valid URL').optional().nullable(),
  featured: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function BrandsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { featured: false } });

  const { data: brands, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => apiClient.get<Brand[]>('/admin/brands'),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ featured: false });
    setShowForm(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    form.reset({ name: brand.name, slug: brand.slug, description: brand.description ?? '', logoUrl: brand.logoUrl ?? '', featured: brand.featured });
    setShowForm(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, logoUrl: values.logoUrl || null };
      if (editing) {
        await apiClient.patch(`/admin/brands/${editing.id}`, payload);
        toast({ title: 'Brand updated', variant: 'success' });
      } else {
        await apiClient.post('/admin/brands', payload);
        toast({ title: 'Brand created', variant: 'success' });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      toast({ title: 'Could not save', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const remove = async (id: string) => {
    try {
      await apiClient.delete(`/admin/brands/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast({ title: 'Brand deleted' });
    } catch (e) {
      toast({ title: 'Could not delete', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader title="Brands" description="Manufacturers and labels in your catalog" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New brand</Button>} />

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <h3 className="mb-4 font-semibold">{editing ? 'Edit brand' : 'New brand'}</h3>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name</Label><Input {...form.register('name')} /></div>
              <div><Label>Slug</Label><Input {...form.register('slug')} placeholder="e.g. aurora" /></div>
            </div>
            <div><Label>Description</Label><Textarea {...form.register('description')} className="min-h-[80px]" /></div>
            <div><Label>Logo URL</Label><Input {...form.register('logoUrl')} placeholder="https://…" /></div>
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('featured')} className="h-4 w-4" /> Highlight as featured brand
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? 'Save changes' : 'Create brand'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading brands…</div>
        ) : (
          <div>
            {(brands ?? []).map((b) => (
              <div key={b.id} className="flex items-center gap-2 border-b px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/{b.slug}</p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">{b._count.products} products</span>
                {b.featured && <Badge variant="success">featured</Badge>}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(b)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { if (confirm(`Delete "${b.name}"?`)) void remove(b.id); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
