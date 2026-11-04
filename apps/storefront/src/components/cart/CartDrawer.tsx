import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { cart, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Your cart</h2>
            <span className="text-sm text-muted-foreground">({cart.itemCount})</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close cart">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">Your cart is empty</p>
            <Button onClick={() => { setOpen(false); navigate('/products'); }}>Start shopping</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {cart.items.map((item) => {
                const price = parseFloat(item.variant?.price ?? item.product.price);
                return (
                  <div key={item.id} className="flex gap-3">
                    <Link to={`/products/${item.product.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.product.images[0]?.url ? (
                        <img src={item.product.images[0].url} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/products/${item.product.slug}`} className="text-sm font-medium leading-snug hover:underline">
                          {item.product.name}
                        </Link>
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
                          <button className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => void updateItem(item.id, item.quantity - 1)} aria-label="Decrease">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => void updateItem(item.id, item.quantity + 1)} aria-label="Increase">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">{formatPrice(price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-semibold">{formatPrice(cart.subtotal)}</span>
              </div>
              <Separator className="my-3" />
              <Button className="w-full" size="lg" onClick={() => { setOpen(false); navigate('/checkout'); }}>
                Checkout
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => { setOpen(false); navigate('/cart'); }}>
                View cart
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
