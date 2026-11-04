import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CreditCard, Landmark, Loader2, Phone, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { apiClient, ApiError } from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import type { PricingResult, Order, ShippingMethod } from '@/types';

const infoSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  line1: z.string().min(3, 'Street address required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City required'),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2).max(2).toUpperCase(),
  deliveryInstructions: z.string().optional(),
  saveAddress: z.boolean().optional(),
});

type InfoForm = z.infer<typeof infoSchema>;

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Credit / debit card', icon: CreditCard },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (Ghana)', icon: Phone },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', icon: Landmark },
  { value: 'CASH_ON_DELIVERY', label: 'Cash on delivery', icon: ShoppingBag },
];

const STEPS = ['Information', 'Shipping', 'Payment', 'Review'];

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [placing, setPlacing] = useState(false);

  const form = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      country: 'GH',
      saveAddress: false,
    },
  });
  const info = form.watch();

  useEffect(() => {
    if (cart.items.length === 0 && !placing) {
      navigate('/cart');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items.length]);

  useEffect(() => {
    if (step === 1 || step === 3) {
      void validatePricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, shippingMethodId]);

  const validatePricing = async () => {
    if (cart.items.length === 0) return;
    setValidating(true);
    try {
      const result = await apiClient.post<PricingResult>('/checkout/validate', {
        customer: { email: info.email, firstName: info.firstName, lastName: info.lastName, phone: info.phone, isGuest: !user },
        delivery: { address: { country: info.country, region: info.region }, shippingMethodId: shippingMethodId || undefined },
      });
      setPricing(result);
      if (!shippingMethodId && step === 1) {
        setShippingMethodId('');
      }
    } catch {
      toast({ title: 'Could not validate', variant: 'error' });
    } finally {
      setValidating(false);
    }
  };

  const loadShippingMethods = async (country: string) => {
    try {
      const res = await apiClient.get<ShippingMethod[]>(`/shipping/methods?country=${country}`);
      setShippingMethods(res);
      if (res.length && !shippingMethodId) setShippingMethodId(res[0].id);
    } catch {
      // fall back to placeholder
      setShippingMethods([{ id: 'placeholder-standard', name: 'Standard Delivery (₵30)', type: 'FLAT_RATE', price: '30', estimatedMinDays: 2, estimatedMaxDays: 5 }]);
      setShippingMethodId('placeholder-standard');
    }
  };

  useEffect(() => {
    if (info.country) void loadShippingMethods(info.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.country]);

  const nextStep = () => {
    if (step === 0) {
      void form.handleSubmit(() => setStep(1))();
      return;
    }
    if (step === 1 && !shippingMethodId) {
      toast({ title: 'Select a shipping method', variant: 'error' });
      return;
    }
    if (step === 2 && !paymentMethod) {
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const address = {
        recipientName: `${info.firstName} ${info.lastName}`,
        phone: info.phone,
        email: info.email,
        line1: info.line1,
        line2: info.line2 || undefined,
        city: info.city,
        region: info.region || undefined,
        postalCode: info.postalCode || undefined,
        country: info.country,
        deliveryInstructions: info.deliveryInstructions || undefined,
      };
      const order = await apiClient.post<{ order: Order; alreadyExists?: boolean }>('/checkout', {
        customer: {
          email: info.email,
          firstName: info.firstName,
          lastName: info.lastName,
          phone: info.phone,
          isGuest: !user,
        },
        delivery: { address, shippingMethodId, saveAddress: !!info.saveAddress },
        payment: { method: paymentMethod },
        idempotencyKey: crypto.randomUUID(),
      }, { csrf: true });

      await refresh();

      // Attempt to initialize payment (works for manual / COD without external creds).
      try {
        await apiClient.post('/payments/initialize', {
          orderId: order.order.id,
          method: paymentMethod,
          returnUrl: window.location.origin + '/checkout/confirmation/' + order.order.id,
        });
      } catch {
        // gateway not configured — order remains pending payment
      }

      navigate(`/checkout/confirmation/${order.order.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not place order';
      toast({ title: 'Order failed', variant: 'error', description: msg });
      setPlacing(false);
    }
  };

  const orderTotal = pricing?.grandTotal ?? cart.subtotal;

  return (
    <div className="container-shell py-10">
      <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Checkout</h1>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('flex items-center gap-2', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {i + 1}
              </span>
              <span className="hidden text-sm font-medium sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && <Separator className="w-6" />}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {step === 0 && (
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <div>
                <h2 className="text-lg font-semibold">Contact information</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="firstName">First name</Label><Input id="firstName" {...form.register('firstName')} /></div>
                  <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" {...form.register('lastName')} /></div>
                  <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...form.register('email')} /></div>
                  <div><Label htmlFor="phone">Phone</Label><Input id="phone" {...form.register('phone')} /></div>
                </div>
                {form.formState.errors.email && <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold">Delivery address</h2>
                <div className="mt-3 space-y-3">
                  <div><Label htmlFor="line1">Street address</Label><Input id="line1" {...form.register('line1')} /></div>
                  <div><Label htmlFor="line2">Apartment, suite (optional)</Label><Input id="line2" {...form.register('line2')} /></div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div><Label htmlFor="city">City</Label><Input id="city" {...form.register('city')} /></div>
                    <div><Label htmlFor="region">Region</Label><Input id="region" {...form.register('region')} /></div>
                    <div><Label htmlFor="postalCode">Postal code</Label><Input id="postalCode" {...form.register('postalCode')} /></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor="country">Country</Label><Input id="country" maxLength={2} {...form.register('country')} /></div>
                    <div><Label htmlFor="deliveryInstructions">Delivery instructions</Label><Textarea id="deliveryInstructions" {...form.register('deliveryInstructions')} className="min-h-[60px]" /></div>
                  </div>
                </div>
              </div>
              {user && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register('saveAddress')} className="h-4 w-4" /> Save this address to my account
                </label>
              )}
              <div className="flex justify-end">
                <Button type="submit">Continue to shipping <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold">Shipping method</h2>
              {validating ? (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Validating…</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {shippingMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setShippingMethodId(m.id)}
                      className={cn('flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors', shippingMethodId === m.id ? 'border-primary bg-primary/5' : 'hover:border-foreground/40')}
                    >
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          {m.estimatedMinDays && <p className="text-xs text-muted-foreground">{m.estimatedMinDays}–{m.estimatedMaxDays} business days</p>}
                        </div>
                      </div>
                      <span className="font-semibold">{m.price ? formatPrice(parseFloat(m.price)) : 'Free'}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={nextStep} disabled={!shippingMethodId}>Continue to payment <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold">Payment method</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn('flex items-center gap-3 rounded-xl border p-4 text-left transition-colors', paymentMethod === m.value ? 'border-primary bg-primary/5' : 'hover:border-foreground/40')}
                  >
                    <m.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">You will be redirected to the payment provider or given instructions after placing your order.</p>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={nextStep}>Review order <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">Review your order</h2>
              <div className="mt-4 space-y-2 rounded-xl border p-4 text-sm">
                <p><span className="text-muted-foreground">Contact:</span> {info.email}</p>
                <p><span className="text-muted-foreground">Ship to:</span> {info.line1}, {info.city}, {info.country}</p>
                <p><span className="text-muted-foreground">Payment:</span> {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}</p>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button size="lg" onClick={() => void placeOrder()} disabled={placing}>
                  {placing ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing order…</> : <>Place order · {formatPrice(orderTotal)}</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="h-fit rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.product.images[0]?.url && <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] text-background">{item.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  {item.variant && <p className="text-xs text-muted-foreground">{Object.entries(item.variant.attributes).map(([, v]) => v).join(' / ')}</p>}
                </div>
                <span className="text-sm font-medium">{formatPrice(parseFloat(item.variant?.price ?? item.product.price) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(pricing?.subtotal ?? cart.subtotal)}</span></div>
            {pricing && pricing.discountTotal > 0 && (
              <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(pricing.discountTotal)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{pricing ? formatPrice(pricing.shippingTotal) : 'Calculated'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{pricing ? formatPrice(pricing.taxTotal) : '—'}</span></div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-base">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{formatPrice(orderTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
