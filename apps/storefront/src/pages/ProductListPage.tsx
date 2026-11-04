import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { useProductList, useCategories } from '@/lib/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatPrice } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popularity', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export default function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { data: categories } = useCategories();

  const category = params.get('category') ?? '';
  const brand = params.get('brand') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const onSale = params.get('onSale') === 'true';
  const inStock = params.get('inStock') === 'true';
  const rating = params.get('rating') ?? '';
  const sortBy = params.get('sortBy') ?? 'newest';
  const q = params.get('q') ?? '';

  const { data, isLoading, isFetching } = useProductList({
    q: q || undefined,
    category: category || undefined,
    brand: brand || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    onSale: onSale || undefined,
    inStock: inStock || undefined,
    rating: rating ? Number(rating) : undefined,
    sortBy: sortBy || undefined,
    page: Number(params.get('page') ?? '1'),
    pageSize: 12,
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams({}, { replace: true });

  const activeFilterCount = [category, brand, minPrice, maxPrice, onSale, inStock, rating].filter(Boolean).length;

  const categoriesTree = categories ?? [];

  const filterPanel = (
    <div className="space-y-6">
      {q && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Search</p>
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="truncate">“{q}”</span>
            <button onClick={() => setParam('q', '')} aria-label="Clear search"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</p>
        <div className="space-y-1">
          <CategoryOption active={!category} onClick={() => setParam('category', '')} label="All products" />
          {categoriesTree.map((c) => (
            <div key={c.id}>
              <CategoryOption
                active={category === c.slug}
                onClick={() => setParam('category', c.slug)}
                label={c.name}
              />
              {c.children?.map((child) => (
                <CategoryOption
                  key={child.id}
                  active={category === child.slug}
                  onClick={() => setParam('category', child.slug)}
                  label={child.name}
                  indent
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price (₵)</p>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setParam('minPrice', e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setParam('maxPrice', e.target.value)} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Availability</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => setParam('inStock', e.target.checked ? 'true' : '')} className="h-4 w-4 rounded" />
          In stock
        </label>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onSale} onChange={(e) => setParam('onSale', e.target.checked ? 'true' : '')} className="h-4 w-4 rounded" />
          On sale
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Rating</p>
        {[
          { v: '4', label: '4★ & up' },
          { v: '3', label: '3★ & up' },
          { v: '2', label: '2★ & up' },
        ].map((r) => (
          <label key={r.v} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="rating"
              checked={rating === r.v}
              onChange={() => setParam('rating', rating === r.v ? '' : r.v)}
              className="h-4 w-4"
            />
            {r.label}
          </label>
        ))}
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearAll}>Clear all filters</Button>
      )}
    </div>
  );

  return (
    <div className="container-shell py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {q ? `Results for “${q}”` : category || 'All products'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${data?.meta.total ?? 0} products`}
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">{filterPanel}</aside>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFilters(true)}>
                <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
              <div className="relative hidden sm:block">
                <select
                  value={sortBy}
                  onChange={(e) => setParam('sortBy', e.target.value)}
                  className="h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sort"
                >
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setView('grid')} aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => setView('list')} aria-label="List view">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed p-16 text-center">
              <p className="text-lg font-medium">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className={cn('grid gap-4', view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
                {(data?.items ?? []).map((p) => (
                  view === 'grid' ? <ProductCard key={p.id} product={p} /> : <ProductRow key={p.id} product={p} />
                ))}
              </div>

              {data && data.meta.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={!data.meta.hasPrev} onClick={() => setParam('page', String(Number(params.get('page') ?? '1') - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {data.meta.page} of {data.meta.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={!data.meta.hasNext} onClick={() => setParam('page', String(Number(params.get('page') ?? '1') + 1))}>
                    Next
                  </Button>
                </div>
              )}
              {isFetching && <p className="mt-4 text-center text-sm text-muted-foreground">Updating…</p>}
            </>
          )}
        </div>
      </div>

      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <span className="text-lg font-semibold">Filters</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileFilters(false)} aria-label="Close"><X className="h-5 w-5" /></Button>
            </div>
            {filterPanel}
            <Button className="mt-6 w-full" onClick={() => setMobileFilters(false)}>Show results</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryOption({ active, onClick, label, indent }: { active: boolean; onClick: () => void; label: string; indent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
        indent && 'pl-6',
        active ? 'font-medium text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </button>
  );
}

function ProductRow({ product }: { product: Parameters<typeof ProductCard>[0]['product'] }) {
  return (
    <div className="flex gap-4 rounded-xl border p-4">
      <img src={product.image ?? ''} alt={product.name} className="h-28 w-28 rounded-lg object-cover" />
      <div className="flex flex-1 flex-col">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.brandName}</p>
        <a href={`/products/${product.slug}`} className="font-medium hover:underline">{product.name}</a>
        <p className="mt-auto text-sm font-semibold">{formatPrice(parseFloat(product.price))}</p>
      </div>
    </div>
  );
}
