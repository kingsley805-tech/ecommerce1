import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn, colorToHex, slugify } from '@/lib/utils';
import type { ProductAdmin } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().min(1, 'Required'),
  slug: z.string().optional(),
  type: z.enum(['SIMPLE', 'VARIABLE']),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional().nullable(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  weightGrams: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  visibility: z.enum(['VISIBLE', 'HIDDEN']),
  featured: z.boolean(),
  brandId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface VariantDraft {
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  imageUrl: string;
}

interface OptionGroup {
  name: string;
  values: string[];
  isColor: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

function isColorGroup(name: string): boolean {
  return ['color', 'colour'].includes(name.trim().toLowerCase()) || name.trim().toLowerCase().includes('color');
}

function collectOptionGroups(variants: VariantDraft[]): OptionGroup[] {
  const map = new Map<string, Set<string>>();
  for (const v of variants) {
    for (const [key, value] of Object.entries(v.attributes)) {
      if (!value) continue;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(value);
    }
  }
  return Array.from(map.entries()).map(([name, values]) => ({ name, values: Array.from(values), isColor: isColorGroup(name) }));
}

function generateCombinations(groups: OptionGroup[]): Record<string, string>[] {
  if (groups.length === 0) return [{}];
  const [head, ...rest] = groups;
  const sub = generateCombinations(rest);
  const result: Record<string, string>[] = [];
  for (const value of head.values) {
    if (!value.trim()) continue;
    for (const combo of sub) {
      result.push({ ...combo, [head.name]: value });
    }
  }
  return result;
}

function makeVariantDraft(attributes: Record<string, string>): VariantDraft {
  return { sku: '', name: '', attributes, price: '', compareAtPrice: '', stock: '', imageUrl: '' };
}

function CategoryPicker({
  categories,
  selected,
  onChange,
}: {
  categories: Category[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedNames = categories.filter((c) => selected.includes(c.id)).map((c) => c.name);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 min-h-[42px] cursor-pointer" onClick={() => setOpen((o) => !o)}>
        {selectedNames.length === 0 && <span className="px-1 text-sm text-muted-foreground">Select categories…</span>}
        {selectedNames.map((n, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {n}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const id = categories.find((c) => c.name === n)?.id;
                if (id) toggle(id);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${n}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 w-full rounded-md border bg-background shadow-lg">
            <div className="border-b p-2">
              <Input autoFocus placeholder="Search categories…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="truncate">{c.name}</span>
                  {selected.includes(c.id) && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              {filtered.length === 0 && <p className="p-2 text-center text-xs text-muted-foreground">No categories match</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;
  const [images, setImages] = useState<{ url: string; alt?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([{ name: '', values: [], isColor: false }]);

  const { data: product } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => apiClient.get<ProductAdmin>(`/admin/products/${id}`),
    enabled: isEdit,
  });
  const { data: categories } = useQuery({ queryKey: ['admin-categories'], queryFn: () => apiClient.get<Category[]>('/admin/categories') });
  const { data: brands } = useQuery({ queryKey: ['admin-brands'], queryFn: () => apiClient.get<{ id: string; name: string }[]>('/admin/brands') });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT', visibility: 'VISIBLE', featured: false, type: 'SIMPLE', categoryIds: [] },
  });

  const productType = form.watch('type');

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        slug: product.slug,
        type: product.type === 'VARIABLE' ? 'VARIABLE' : 'SIMPLE',
        price: parseFloat(product.price),
        compareAtPrice: product.compareAtPrice ? parseFloat(product.compareAtPrice) : null,
        costPrice: product.costPrice ? parseFloat(product.costPrice) : null,
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        status: product.status as FormValues['status'],
        visibility: product.visibility as FormValues['visibility'],
        featured: product.featured,
        brandId: product.brand?.id ?? null,
        categoryIds: product.categories.map((c) => c.categoryId),
      });
      setImages((product.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? '' })));
      const loadedVariants: VariantDraft[] = (product.variants ?? []).map((v) => ({
        sku: v.sku,
        name: v.name ?? '',
        attributes: (v.attributes ?? {}) as Record<string, string>,
        price: parseFloat(v.price).toString(),
        compareAtPrice: 'compareAtPrice' in v && (v as { compareAtPrice?: string | null }).compareAtPrice ? parseFloat((v as { compareAtPrice: string }).compareAtPrice).toString() : '',
        stock: '',
        imageUrl: 'imageUrl' in v ? ((v as { imageUrl?: string | null }).imageUrl ?? '') : '',
      }));
      setVariants(loadedVariants);
      const groups = collectOptionGroups(loadedVariants);
      setOptionGroups(groups.length ? groups : [{ name: '', values: [], isColor: false }]);
    }
  }, [product, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        slug: values.slug ? slugify(values.slug) : undefined,
        brandId: values.brandId || null,
        compareAtPrice: values.compareAtPrice || null,
        costPrice: values.costPrice || null,
        weightGrams: values.weightGrams || null,
        images: images.map((img, i) => ({ url: img.url, alt: img.alt || undefined, position: i })),
      };
      if (values.type === 'VARIABLE') {
        const cleaned = variants
          .filter((v) => v.sku.trim())
          .map((v, i) => ({
            sku: v.sku.trim(),
            name: v.name.trim() || undefined,
            attributes: Object.fromEntries(Object.entries(v.attributes).filter(([, value]) => value.trim())),
            price: parseFloat(v.price) || undefined,
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
            stock: v.stock ? parseInt(v.stock, 10) : undefined,
            imageUrl: v.imageUrl || undefined,
            isDefault: i === 0,
          }));
        if (cleaned.length === 0) {
          toast({ title: 'Add at least one variation', variant: 'error' });
          return;
        }
        payload.variants = cleaned;
      }
      if (isEdit) {
        await apiClient.patch(`/admin/products/${id}`, { ...payload, id });
      } else {
        await apiClient.post('/admin/products', payload);
      }
      toast({ title: 'Product saved', variant: 'success' });
      navigate('/admin/products');
    } catch (e) {
      toast({ title: 'Could not save', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await apiClient.upload<{ url: string; key: string }>('/admin/uploads/image', file);
      setImages((prev) => [...prev, { url: res.url, alt: file.name }]);
      toast({ title: 'Image uploaded', variant: 'success' });
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'error', description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const setVariantAttr = (index: number, key: string, value: string) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, attributes: { ...v.attributes, [key]: value } } : v)));
  };

  const onUploadVariantImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await apiClient.upload<{ url: string; key: string }>('/admin/uploads/image', file);
      updateVariant(index, { imageUrl: res.url });
      toast({ title: 'Image uploaded', variant: 'success' });
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'error', description: err instanceof Error ? err.message : undefined });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description={isEdit ? 'Update product information, images and variations' : 'Create a new product'}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/products"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>}
      />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Basic information</h3>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Product name</Label><Input {...form.register('name')} /></div>
              <div><Label>Slug (optional)</Label><Input {...form.register('slug')} placeholder="auto-generated" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>SKU</Label><Input {...form.register('sku')} /></div>
              <div><Label>Product type</Label>
                <select {...form.register('type')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="SIMPLE">Simple product</option>
                  <option value="VARIABLE">Variable (with variations)</option>
                </select>
              </div>
            </div>
            <div><Label>Short description</Label><Input {...form.register('shortDescription')} /></div>
            <div><Label>Description</Label><Textarea {...form.register('description')} className="min-h-[120px]" /></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Organization</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Categories</Label>
              <div className="mt-1">
                <CategoryPicker categories={categories ?? []} selected={form.watch('categoryIds') ?? []} onChange={(ids) => form.setValue('categoryIds', ids, { shouldDirty: true })} />
              </div>
            </div>
            <div>
              <Label>Brand</Label>
              <select {...form.register('brandId')} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No brand</option>
                {(brands ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Pricing & inventory</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Price (₵)</Label><Input type="number" step="0.01" {...form.register('price')} /></div>
            <div><Label>Compare-at price</Label><Input type="number" step="0.01" {...form.register('compareAtPrice')} /></div>
            <div><Label>Cost price</Label><Input type="number" step="0.01" {...form.register('costPrice')} /></div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><Label>Weight (grams)</Label><Input type="number" {...form.register('weightGrams')} /></div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('featured')} className="h-4 w-4" /> Featured product</label>
            </div>
          </div>
        </Card>

        {productType === 'VARIABLE' && (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Variations</h3>
                <p className="text-xs text-muted-foreground">Define options (Color, Size) and generate the combinations.</p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const groups = optionGroups.filter((g) => g.name.trim() && g.values.some((v) => v.trim()));
                  const combos = generateCombinations(groups);
                  if (combos.length === 0) {
                    toast({ title: 'Add at least one option with values', variant: 'error' });
                    return;
                  }
                  setVariants(combos.map(makeVariantDraft));
                }}
              >
                <Plus className="h-4 w-4" /> Generate variations
              </Button>
            </div>

            <div className="mb-4 rounded-md border p-3">
              <Label className="text-xs font-semibold">Options</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">e.g. Color with values “Red, Navy” and Size with “S, M, L”.</p>
              <div className="mt-2 space-y-2">
                {optionGroups.map((g, gi) => (
                  <div key={gi} className="rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={g.name}
                        onChange={(e) => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, name: e.target.value } : x))}
                        placeholder="Option (e.g. Color, Size)"
                        className="h-8 w-44"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={g.isColor}
                          onChange={(e) => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, isColor: e.target.checked, values: e.target.checked ? x.values.map(colorToHex) : x.values } : x))}
                          className="h-3.5 w-3.5"
                        />
                        Color swatches
                      </label>
                      <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setOptionGroups((prev) => prev.filter((_, xi) => xi !== gi))} aria-label="Remove option">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {g.isColor ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {g.values.map((hex, vi) => (
                          <div key={vi} className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2">
                            <div className="relative h-7 w-7 overflow-hidden rounded-full border border-black/10" style={{ backgroundColor: colorToHex(hex) }}>
                              <input
                                type="color"
                                value={colorToHex(hex)}
                                onChange={(e) => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, values: x.values.map((v, vvi) => vvi === vi ? e.target.value : v) } : x))}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                aria-label={`Color ${vi + 1}`}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{colorToHex(hex)}</span>
                            <button
                              type="button"
                              onClick={() => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, values: x.values.filter((_, vvi) => vvi !== vi) } : x))}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove color"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, values: [...x.values, '#cccccc'] } : x))}>
                          <Plus className="h-3.5 w-3.5" /> Color
                        </Button>
                      </div>
                    ) : (
                      <Input
                        value={g.values.join(', ')}
                        onChange={(e) => setOptionGroups((prev) => prev.map((x, xi) => xi === gi ? { ...x, values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : x))}
                        placeholder="Values (e.g. S, M, L)"
                        className="mt-2 h-8 flex-1"
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setOptionGroups((prev) => [...prev, { name: '', values: [], isColor: false }])}>
                <Plus className="h-3.5 w-3.5" /> Add option
              </Button>
            </div>

            <div className="space-y-3">
              {variants.map((v, i) => {
                const colorGroups = optionGroups.filter((g) => g.isColor && g.values.length > 0);
                const nameOptions = Array.from(new Set(colorGroups.flatMap((g) => g.values)));
                return (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    {Object.keys(v.attributes).length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.entries(v.attributes).map(([k, val]) => (
                          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
                            {isColorGroup(k) && (
                              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: colorToHex(val) }} />
                            )}
                            <span className="text-muted-foreground">{k}:</span> {val}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-medium">Variation {i + 1}</span>
                    )}
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setVariants((prev) => prev.filter((_, x) => x !== i))} aria-label="Remove variation">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div><Label className="text-xs">SKU *</Label><Input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} placeholder="e.g. AUR-L-NAVY" /></div>
                    <div>
                      <Label className="text-xs">Name</Label>
                      {nameOptions.length > 0 ? (
                        <select value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">Select color</option>
                          {nameOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <Input value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} placeholder="e.g. Navy" />
                      )}
                    </div>
                    <div><Label className="text-xs">Price (₵)</Label><Input type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} placeholder="0.00" /></div>
                    <div><Label className="text-xs">Compare-at</Label><Input type="number" step="0.01" value={v.compareAtPrice} onChange={(e) => updateVariant(i, { compareAtPrice: e.target.value })} placeholder="0.00" /></div>
                    <div><Label className="text-xs">Stock</Label><Input type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} placeholder="0" /></div>
                  </div>
                  {Object.keys(v.attributes).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {Object.entries(v.attributes).map(([k, val]) => (
                        <div key={k} className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{k}</span>
                          {isColorGroup(k) ? (
                            <>
                              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-black/10" style={{ backgroundColor: colorToHex(val) }}>
                                <input
                                  type="color"
                                  value={colorToHex(val)}
                                  onChange={(e) => setVariantAttr(i, k, e.target.value)}
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                  aria-label={`Select ${k}`}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{val}</span>
                            </>
                          ) : (
                            <Input value={val} onChange={(e) => setVariantAttr(i, k, e.target.value)} className="h-7 w-24 text-xs" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                      {v.imageUrl ? <img src={v.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                      <Upload className="h-3.5 w-3.5" /> {v.imageUrl ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => void onUploadVariantImage(i, e)} />
                    </label>
                    {v.imageUrl && (
                      <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => updateVariant(i, { imageUrl: '' })}>Remove</Button>
                    )}
                  </div>
                </div>
                );
              })}
              {variants.length === 0 && (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No variations yet. Define options above and click “Generate variations”.
                </p>
              )}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Images</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Upload className="h-5 w-5" />
              {uploading ? 'Uploading…' : 'Upload image'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={onUploadFile} disabled={uploading} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Status & visibility</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Status</Label>
              <select {...form.register('status')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div><Label>Visibility</Label>
              <select {...form.register('visibility')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="VISIBLE">Visible</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit"><Save className="h-4 w-4" /> Save product</Button>
          {isEdit && <Button type="button" variant="outline" onClick={() => { if (confirm('Archive this product?')) void apiClient.delete(`/admin/products/${id}`).then(() => navigate('/admin/products')); }}><Trash2 className="h-4 w-4" /> Archive</Button>}
        </div>
      </form>
    </div>
  );
}
