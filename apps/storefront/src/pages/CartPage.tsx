import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { cart, updateItem, removeItem, applyCoupon } = useCart();
  const [coupon, setCoupon] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const applyCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applyCoupon(coupon);
      toast({ title: 'Coupon applied', variant: 'success' });
    } catch (err) {
      toast({ title: 'Invalid coupon', variant: 'error', description: err instanceof Error ? err.message : undefined });
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container-shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our collection and find something you love.</p>
        <Button asChild size="lg" className="mt-6"><Link to="/products">Start shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-shell py-10">
      <h1 className="font-display text-3xl font-semibold">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {cart.items.map((item) => {
            const price = parseFloat(item.variant?.price ?? item.product.price);
            return (
              <div key={item.id} className="flex gap-4 rounded-xl border p-4">
                <Link to={`/products/${item.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.product.images[0]?.url && <img src={item.product.images[0].url} alt={item.product.name} className="h-full w-full object-cover" />}
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/products/${item.product.slug}`} className="font-medium hover:underline">{item.product.name}</Link>
                    <button onClick={() => void removeItem(item.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-full border">
                      <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => void updateItem(item.id, item.quantity - 1)} aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => void updateItem(item.id, item.quantity + 1)} aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-semibold">{formatPrice(price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <Button variant="ghost" onClick={() => navigate('/products')}><ArrowRight className="h-4 w-4 rotate-180" /> Continue shopping</Button>
        </div>

        <div className="h-fit rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>Calculated at checkout</span></div>
          </div>
          <Separator className="my-4" />
          <form onSubmit={applyCouponSubmit} className="flex gap-2">
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" />
            <Button type="submit" variant="outline"><Tag className="h-4 w-4" /></Button>
          </form>
          {cart.couponCode && <p className="mt-2 text-sm text-success">Coupon {cart.couponCode} applied</p>}
          <Separator className="my-4" />
          <div className="flex justify-between text-base">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
          </div>
          <Button className="mt-4 w-full" size="lg" onClick={() => navigate('/checkout')}>
            Proceed to checkout <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
