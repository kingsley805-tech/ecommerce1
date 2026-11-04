import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Minus, Plus, ShieldCheck, ShoppingBag, Truck, } from 'lucide-react';
import { useProduct, useRelatedProducts } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCard, isColorGroup } from '@/components/product/ProductCard';
import { WishlistHeart } from '@/components/product/ProductCard';
import { ColorSwatches } from '@/components/product/ColorSwatches';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/toast';
import { cn, formatPrice, discountPercent } from '@/lib/utils';

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { data: related } = useRelatedProducts(product?.id ?? '');
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const variantGroups = useVariantGroups(product);

  const variant = useMemo(() => {
    if (!product) return null;
    if (product.type === 'VARIABLE') {
      const groupKeys = Object.keys(variantGroups);
      if (groupKeys.length === 0) return product.variants[0] ?? null;
      const hasAll = groupKeys.every((g) => selectedAttributes[g]);
      if (hasAll) {
        return (
          product.variants.find((v) => groupKeys.every((g) => v.attributes[g] === selectedAttributes[g])) ??
          product.variants[0] ??
          null
        );
      }
      return product.variants[0] ?? null;
    }
    return null;
  }, [product, selectedAttributes, variantGroups]);

  const effectivePrice = variant ? parseFloat(variant.price) : product ? parseFloat(product.price) : 0;
  const compareAt = variant ? variant.compareAtPrice : product?.compareAtPrice;
  const pct = discountPercent(effectivePrice, compareAt ? parseFloat(compareAt) : null);

  if (isLoading) {
    return (
      <div className="container-shell py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-shell py-20 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Button asChild className="mt-4"><Link to="/products">Back to shop</Link></Button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ url: product.image ?? '', alt: product.name }];
  const colorGroup = Object.keys(variantGroups).find(isColorGroup) ?? null;
  const colorOptions = colorGroup ? variantGroups[colorGroup] : [];
  const otherGroups = Object.entries(variantGroups).filter(([group]) => group !== colorGroup);
  const displayImage = colorGroup && variant?.imageUrl ? variant.imageUrl : images[activeImage]?.url ?? '';

  const addToCart = async () => {
    try {
      await addItem(product.id, variant?.id ?? null, quantity);
      toast({ title: 'Added to cart', variant: 'success', description: `${quantity} × ${product.name}` });
    } catch (e) {
      toast({ title: 'Could not add to cart', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  const buyNow = async () => {
    try {
      await addItem(product.id, variant?.id ?? null, quantity);
      navigate('/checkout');
    } catch (e) {
      toast({ title: 'Could not add to cart', variant: 'error', description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="container-shell py-8">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/products" className="hover:text-foreground">Shop</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <img
              src={displayImage}
              alt={images[activeImage]?.alt ?? product.name}
              className="h-full w-full object-cover"
            />
            {pct !== null && <Badge variant="destructive" className="absolute left-4 top-4 text-sm">-{pct}%</Badge>}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn('h-20 w-20 overflow-hidden rounded-lg border-2 bg-muted', activeImage === i ? 'border-ring' : 'border-transparent')}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <Link to={`/products?brand=${product.brand.slug}`} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">{product.brand.name}</Link>}
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1 text-amber-500">
              <span className="font-medium text-foreground">{Number(product.ratingAvg).toFixed(1)}</span>
              <span>★</span>
            </div>
            <span className="text-sm text-muted-foreground">({product.ratingCount} reviews)</span>
            <span className="text-sm text-muted-foreground">• SKU: {product.sku}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(effectivePrice * quantity)}</span>
            {compareAt && parseFloat(compareAt) > effectivePrice && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(parseFloat(compareAt) * quantity)}</span>
            )}
          </div>
          {quantity > 1 && (
            <p className="mt-1 text-sm text-muted-foreground">{quantity} × {formatPrice(effectivePrice)}</p>
          )}

          {/* Variant groups */}
          {Object.keys(variantGroups).length > 0 && (
            <div className="mt-6 space-y-4">
              {colorGroup && (
                <div>
                  <p className="text-sm font-medium">Color</p>
                  <div className="mt-2">
                    <ColorSwatches
                      options={colorOptions}
                      selected={variant?.attributes[colorGroup] ?? null}
                      onSelect={(value) => setSelectedAttributes((prev) => ({ ...prev, [colorGroup]: value }))}
                      size={32}
                    />
                  </div>
                </div>
              )}
              {otherGroups.map(([group, options]) => (
                <div key={group}>
                  <p className="text-sm font-medium">{group}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {options.map((opt) => {
                      const active = variant?.attributes[group] === opt;
                      const disabled = !product.variants.some((v) => v.attributes[group] === opt);
                      return (
                        <button
                          key={opt}
                          disabled={disabled}
                          onClick={() => setSelectedAttributes((prev) => ({ ...prev, [group]: opt }))}
                          className={cn(
                            'rounded-md border px-4 py-2 text-sm transition-colors',
                            active ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-foreground/40',
                            disabled && 'cursor-not-allowed opacity-40',
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border">
              <button className="p-3 text-muted-foreground hover:text-foreground" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <button className="p-3 text-muted-foreground hover:text-foreground" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Increase quantity">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" className="flex-1 sm:flex-none" onClick={() => void addToCart()}>
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </Button>
            <Button size="lg" variant="outline" onClick={() => void buyNow()}>Buy now</Button>
            <WishlistHeart productId={product.id} />
          </div>

          <div className="mt-6 space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />Free delivery on orders over ₵500</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />14-day easy returns</p>
            <p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Secure checkout & payment protection</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-12">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="max-w-3xl">
          <p className="text-muted-foreground">{product.description ?? product.shortDescription}</p>
        </TabsContent>
        <TabsContent value="shipping" className="max-w-3xl space-y-2 text-sm text-muted-foreground">
          <p>We deliver to all regions in Ghana. Standard delivery takes 2–6 business days.</p>
          <p>Unopened items can be returned within 14 days of delivery for a full refund.</p>
        </TabsContent>
      </Tabs>

      {related && related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function useVariantGroups(product: { variants: { attributes: Record<string, string> }[] } | undefined) {
  return useMemo(() => {
    if (!product) return {};
    const groups: Record<string, string[]> = {};
    for (const v of product.variants) {
      for (const [key, value] of Object.entries(v.attributes)) {
        if (!groups[key]) groups[key] = [];
        if (!groups[key].includes(value)) groups[key].push(value);
      }
    }
    return groups;
  }, [product]);
}
