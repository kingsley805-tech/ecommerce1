import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { Cart } from '@/types';

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: string, variantId?: string | null, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  mergeGuest: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiClient.get<Cart | null>('/cart');
      setCart(data && Array.isArray(data.items) ? data : EMPTY_CART);
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId: string, variantId?: string | null, quantity = 1) => {
    await apiClient.post('/cart/items', { productId, variantId: variantId ?? null, quantity });
    await refresh();
  }, [refresh]);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    await refresh();
  }, [refresh]);

  const removeItem = useCallback(async (itemId: string) => {
    await apiClient.delete(`/cart/items/${itemId}`);
    await refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    await apiClient.delete('/cart');
    setCart(EMPTY_CART);
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    await apiClient.post('/cart/coupon', { code });
    await refresh();
  }, [refresh]);

  const mergeGuest = useCallback(async () => {
    try {
      await apiClient.post('/cart/merge');
      await refresh();
    } catch {
      // ignore
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ cart, loading, refresh, addItem, updateItem, removeItem, clear, applyCoupon, mergeGuest }),
    [cart, loading, refresh, addItem, updateItem, removeItem, clear, applyCoupon, mergeGuest],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
