import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, discountPercent } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import type { ProductListItem, ProductVariantOption } from '@/types';
import { ColorSwatches } from '@/components/product/ColorSwatches';

export function isColorGroup(name: string): boolean {
  return ['color', 'colour'].includes(name.trim().toLowerCase()) || name.trim().toLowerCase().includes('color');
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const variants = product.variants ?? [];

  const variantGroups = useVariantGroups(variants);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const variant = useMemo(() => {
    if (product.type !== 'VARIABLE' || variants.length === 0) return null;
    const groupKeys = Object.keys(variantGroups);
    if (groupKeys.length === 0) return variants[0] ?? null;
    const hasAll = groupKeys.every((g) => selectedAttributes[g]);
    if (hasAll) {
      return variants.find((v) => groupKeys.every((g) => v.attributes[g] === selectedAttributes[g])) ?? variants[0] ?? null;
    }
    return variants[0] ?? null;
  }, [product.type, variants, variantGroups, selectedAttributes]);

  const price = parseFloat(variant?.price ?? product.price);
  const compareAt = variant ? variant.compareAtPrice : product.compareAtPrice;
  const compareAtNum = compareAt ? parseFloat(compareAt) : null;
  const pct = discountPercent(price, compareAtNum);
  const image = variant?.imageUrl ?? product.image;

  const colorGroup = Object.keys(variantGroups).find(isColorGroup) ?? null;
  const colorOptions = colorGroup ? variantGroups[colorGroup] : [];
  const otherGroups = Object.entries(variantGroups).filter(([group]) => group !== colorGroup);

  const addToCart = async () => {
    try {
      await addItem(product.id, variant?.id ?? null, quantity);
      toast({ title: 'Added to cart', variant: 'success', description: `${quantity} × ${product.name}` });
    } catch (e) {
      toast({ title: 'Could not add to cart', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg">
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.imageAlt ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
        )}
        {pct !== null && <Badge variant="destructive" className="absolute left-3 top-3">-{pct}%</Badge>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brandName && <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.brandName}</p>}
        <Link to={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">
          {product.name}
        </Link>

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-base font-semibold">{formatPrice(price * quantity)}</span>
          {compareAtNum && compareAtNum > price && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(compareAtNum * quantity)}</span>
          )}
        </div>
        {quantity > 1 && (
          <p className="text-xs text-muted-foreground">{quantity} × {formatPrice(price)}</p>
        )}

        {colorGroup && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color:</span>
            <ColorSwatches
              options={colorOptions}
              selected={variant?.attributes[colorGroup] ?? null}
              onSelect={(value) => setSelectedAttributes((prev) => ({ ...prev, [colorGroup]: value }))}
            />
          </div>
        )}

        {otherGroups.length > 0 && (
          <div className="mt-1 space-y-1.5">
            {otherGroups.map(([group, options]) => (
              <div key={group} className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground">{group}:</span>
                {options.map((opt) => {
                  const active = variant?.attributes[group] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelectedAttributes((prev) => ({ ...prev, [group]: opt }))}
                      className={
                        active
                          ? 'rounded border border-primary bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground'
                          : 'rounded border border-input px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground'
                      }
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <div className="flex items-center rounded-full border">
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-medium">{quantity}</span>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button size="sm" className="flex-1" onClick={() => void addToCart()} aria-label="Add to cart">
            <ShoppingBag className="h-4 w-4" /> Add
          </Button>
        </div>

        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-amber-500">★ {Number(product.ratingAvg).toFixed(1)}</span>
            <span>({product.ratingCount})</span>
          </div>
        )}
      </div>
    </div>
  );
}

function useVariantGroups(variants: ProductVariantOption[]) {
  return useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.attributes)) {
        if (!groups[key]) groups[key] = [];
        if (!groups[key].includes(value)) groups[key].push(value);
      }
    }
    return groups;
  }, [variants]);
}

export function WishlistHeart({ productId, size = 18 }: { productId: string; size?: number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-full"
      aria-label="Add to wishlist"
      onClick={() => {
        if (!user) {
          window.location.href = '/login';
          return;
        }
        void fetch(`/api/v1/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        }).then((r) => {
          if (r.ok) toast({ title: 'Saved to wishlist', variant: 'success' });
        });
      }}
    >
      <Heart className="h-4 w-4" style={{ width: size, height: size }} />
    </Button>
  );
}
