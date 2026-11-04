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

interface CategoryRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  visibility: 'VISIBLE' | 'HIDDEN';
  seoTitle?: string | null;
  seoDescription?: string | null;
  _count: { products: number; children: number };
}

const schema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers, hyphens'),
  parentId: z.string().optional().nullable(),
  description: z.string().optional(),
  imageUrl: z.string().url('Enter a valid URL').optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  visibility: z.enum(['VISIBLE', 'HIDDEN']),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'VISIBLE', displayOrder: 0 },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiClient.get<CategoryRow[]>('/admin/categories'),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ visibility: 'VISIBLE', displayOrder: 0 });
    setShowForm(true);
  };

  const openEdit = (cat: CategoryRow) => {
    setEditing(cat);
    form.reset({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      description: cat.description ?? '',
      imageUrl: cat.imageUrl ?? '',
      displayOrder: cat.displayOrder,
      visibility: cat.visibility,
      seoTitle: cat.seoTitle ?? '',
      seoDescription: cat.seoDescription ?? '',
    });
    setShowForm(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        parentId: values.parentId || null,
        imageUrl: values.imageUrl || null,
      };
      if (editing) {
        await apiClient.patch(`/admin/categories/${editing.id}`, payload);
        toast({ title: 'Category updated', variant: 'success' });
      } else {
        await apiClient.post('/admin/categories', payload);
        toast({ title: 'Category created', variant: 'success' });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowForm(false);
      setEditing(null);
      form.reset({ visibility: 'VISIBLE', displayOrder: 0 });
    } catch (e) {
      toast({ title: 'Could not save', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const remove = async (id: string) => {
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: 'Category deleted' });
    } catch (e) {
      toast({ title: 'Could not delete', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const rows = (categories ?? []).filter((c) => c.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);
    return rows.map((cat) => (
      <div key={cat.id}>
        <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ paddingLeft: `${12 + depth * 22}px` }}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{cat.name}</p>
            <p className="truncate text-xs text-muted-foreground">/{cat.slug}</p>
          </div>
          <Badge variant={cat.visibility === 'VISIBLE' ? 'success' : 'secondary'}>{cat.visibility === 'VISIBLE' ? 'visible' : 'hidden'}</Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">{cat._count.products} products</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => { if (confirm(`Delete "${cat.name}"?`)) void remove(cat.id); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        {renderTree(cat.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div>
      <PageHeader title="Categories" description="Organize your catalog into a hierarchy" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> {editing ? 'Edit' : 'New category'}</Button>} />

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <h3 className="mb-4 font-semibold">{editing ? 'Edit category' : 'New category'}</h3>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name</Label><Input {...form.register('name')} /></div>
              <div><Label>Slug</Label><Input {...form.register('slug')} placeholder="e.g. men-clothing" /></div>
            </div>
            <div><Label>Parent category (optional)</Label>
              <select {...form.register('parentId')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No parent (top level)</option>
                {(categories ?? []).filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Description</Label><Textarea {...form.register('description')} className="min-h-[80px]" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Image URL</Label><Input {...form.register('imageUrl')} placeholder="https://…" /></div>
              <div><Label>Display order</Label><Input type="number" {...form.register('displayOrder')} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Visibility</Label>
                <select {...form.register('visibility')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="VISIBLE">Visible</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </div>
              <div><Label>SEO title (optional)</Label><Input {...form.register('seoTitle')} /></div>
            </div>
            <div><Label>SEO description (optional)</Label><Textarea {...form.register('seoDescription')} className="min-h-[60px]" /></div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? 'Save changes' : 'Create category'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading categories…</div> : renderTree(null, 0)}
      </Card>
    </div>
  );
}
