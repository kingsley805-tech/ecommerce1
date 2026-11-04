import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductListItem } from '@/types';

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ id: string; product: ProductListItem }[]>('/wishlist'),
    enabled: !!user,
  });

  const remove = async (wishlistItemId: string) => {
    await apiClient.delete(`/wishlist/${wishlistItemId}`);
    await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    toast({ title: 'Removed from wishlist' });
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/wishlist" replace />;

  const products = (items ?? []).map((i) => i.product);

  return (
    <div className="container-shell py-10">
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-semibold">My wishlist</h1>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-16 text-center">
          <p className="text-lg font-medium">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to save it here.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/products">Browse products</Link></Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80"
                onClick={() => void remove(items!.find((i) => i.product.id === p.id)!.id)}
                aria-label="Remove from wishlist"
              >
                <Heart className="h-4 w-4 fill-destructive text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
