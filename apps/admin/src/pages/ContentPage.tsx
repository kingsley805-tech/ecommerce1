import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { normalizeDate } from '@/lib/utils';
import type { Paged } from '@/types';

interface Page { id: string; slug: string; title: string; visibility: string; updatedAt: string; }

const schema = z.object({ slug: z.string().min(1), title: z.string().min(1), body: z.string().min(1), visibility: z.enum(['VISIBLE', 'HIDDEN']) });
type FormValues = z.infer<typeof schema>;

export default function ContentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [active, setActive] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { visibility: 'VISIBLE' } });

  const { data: pages } = useQuery({ queryKey: ['content-pages'], queryFn: () => apiClient.get<Paged<Page>>('/admin/content/pages', { query: { page: 1, pageSize: 100 } }) });

  const openEdit = (p: Page) => {
    setActive({ slug: p.slug, title: p.title, body: '', visibility: p.visibility as FormValues['visibility'] });
    setShowForm(true);
  };

  const save = async (values: FormValues) => {
    await apiClient.put('/admin/content/pages', values);
    await queryClient.invalidateQueries({ queryKey: ['content-pages'] });
    setShowForm(false);
    toast({ title: 'Page saved', variant: 'success' });
  };

  const createSection = async (type: string, title: string) => {
    await apiClient.post('/admin/content/sections', { type, title });
    await queryClient.invalidateQueries({ queryKey: ['content-sections'] });
    toast({ title: 'Section added', variant: 'success' });
  };

  return (
    <div>
      <PageHeader title="Content" description="Pages, homepage sections, and storefront content" />

      <div className="mb-6">
        <h3 className="mb-3 font-semibold">Pages</h3>
        <Card className="divide-y">
          {(pages?.items ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">/{p.slug} · updated {normalizeDate(p.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.visibility === 'VISIBLE' ? 'success' : 'secondary'}>{p.visibility.toLowerCase()}</Badge>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
              </div>
            </div>
          ))}
          {(!pages || pages.items.length === 0) && <p className="px-4 py-6 text-sm text-muted-foreground">No pages yet.</p>}
        </Card>
      </div>

      {showForm && (
        <Card className="mb-6 max-w-2xl p-5">
          <h3 className="mb-4 font-semibold">{active ? `Edit /${active.slug}` : 'New page'}</h3>
          <form onSubmit={form.handleSubmit(save)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Slug</Label><Input {...form.register('slug')} disabled={!!active} /></div>
              <div><Label>Title</Label><Input {...form.register('title')} /></div>
            </div>
            <div><Label>Body (HTML)</Label><Textarea {...form.register('body')} className="min-h-[160px]" placeholder="<p>Content here</p>" /></div>
            <div>
              <Label>Visibility</Label>
              <select {...form.register('visibility')} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="VISIBLE">Visible</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setActive(null); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Homepage sections</h3>
        <div className="flex flex-wrap gap-2">
          {['HERO', 'BANNER', 'CATEGORIES', 'BEST_SELLERS', 'NEW_ARRIVALS', 'PROMOTIONAL', 'TESTIMONIALS', 'NEWSLETTER'].map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => void createSection(s, s.split('_').join(' ').toLowerCase())}>
              <Plus className="h-3.5 w-3.5" /> {s.split('_').join(' ')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
