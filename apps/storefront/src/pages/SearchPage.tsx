import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProductList } from '@/lib/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [term, setTerm] = useState(q);
  const navigate = useNavigate();

  const { data, isLoading } = useProductList({ q: q || undefined, pageSize: 24 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: term }, { replace: true });
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="container-shell py-10">
      <h1 className="font-display text-3xl font-semibold">Search</h1>
      <form onSubmit={submit} className="mt-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products, brands, SKUs…" className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {q && (
        <p className="mt-4 text-sm text-muted-foreground">
          {isLoading ? 'Searching…' : `${data?.meta.total ?? 0} results for “${q}”`}
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <p className="text-lg font-medium">No results found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try different keywords or browse the catalog.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/products">Browse all products</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(data?.items ?? []).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
