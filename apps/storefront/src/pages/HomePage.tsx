import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Truck } from 'lucide-react';
import { useHomepage, useProductList, useCategories } from '@/lib/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const HERO_IMAGES = {
  main: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&auto=format&fit=crop&q=80',
  secondary: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
  accent: 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=400&auto=format&fit=crop&q=80',
};

export default function HomePage() {
  const { data, isLoading } = useHomepage();
  const { data: catalogData, isLoading: catalogLoading } = useProductList({ pageSize: 8, sortBy: 'popularity' });
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  const hero = data?.sections?.find((s) => s.type === 'HERO');
  const categories = data?.categories && data.categories.length > 0 ? data.categories : (categoriesData ?? []);
  const bestSellers = data?.bestSellers && data.bestSellers.length > 0 ? data.bestSellers : (catalogData?.items ?? []);
  const newArrivals = data?.newArrivals && data.newArrivals.length > 0 ? data.newArrivals : (catalogData?.items ?? []);
  const testimonials = data?.testimonials ?? [];
  const productsLoading = isLoading || catalogLoading;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="container-shell relative grid min-h-[80vh] items-center gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="flex flex-col items-start" data-aos="fade-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-1.5 text-xs font-medium backdrop-blur" data-aos="fade-down" data-aos-delay="100">
             
              New season collection is here
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl xl:text-7xl" data-aos="fade-up" data-aos-delay="200">
              {hero?.title ?? 'Discover the Future of Shopping'}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-background/75" data-aos="fade-up" data-aos-delay="300">
              {hero?.subtitle ?? 'Premium products, curated for you and delivered with care.'}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4" data-aos="fade-up" data-aos-delay="400">
              <Button asChild size="lg" className="group bg-primary text-primary-foreground">
                <Link to="/products">
                  Shop now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-background/30 bg-transparent text-background hover:bg-background/10">
                <Link to="/products?onSale=true">View sale</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-background/10 pt-8" data-aos="fade-up" data-aos-delay="500">
              <div>
                <p className="font-display text-2xl font-semibold">12k+</p>
                <p className="text-xs text-background/60">Happy customers</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">4.9<span className="text-base">/5</span></p>
                <p className="text-xs text-background/60">Average rating</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">24h</p>
                <p className="text-xs text-background/60">Fast delivery</p>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block" data-aos="fade-left" data-aos-delay="200">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl ring-1 ring-background/10">
              <img src={HERO_IMAGES.main} alt="Featured product" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
            </div>
            <div className="absolute -left-10 bottom-12 w-40 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-background/10">
              <img src={HERO_IMAGES.secondary} alt="Accessory" className="aspect-square w-full object-cover" />
            </div>
            <div className="absolute -right-4 -top-6 w-32 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-background/10">
              <img src={HERO_IMAGES.accent} alt="Detail" className="aspect-square w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 right-8 flex items-center gap-3 rounded-2xl bg-background p-4 text-foreground shadow-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Free shipping</p>
                <p className="text-xs text-muted-foreground">On orders over $50</p>
              </div>
            </div>
            <div className="absolute left-6 top-8 flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-foreground shadow-xl">
              <div className="flex gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <span className="text-xs font-medium">4.9</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-shell py-16">
        <div className="mb-8 flex items-end justify-between" data-aos="fade-up">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Shop by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Browse our curated collections</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/products">View all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        {isLoading || categoriesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" data-aos="fade-up" data-aos-delay="100">
            {categories.slice(0, 6).map((cat) => (
              <Link key={cat.id} to={`/products?category=${cat.slug}`} className="group text-center">
                <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium group-hover:underline">{cat.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Best sellers */}
      <section className="bg-muted/40 py-16">
        <div className="container-shell">
          <div className="mb-8 flex items-end justify-between" data-aos="fade-up">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Best sellers</h2>
              <p className="mt-1 text-sm text-muted-foreground">Most loved by our customers</p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/products?sortBy=popularity">See all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-aos="fade-up" data-aos-delay="100">
            {productsLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)
              : bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Promo banner */}
      <section className="container-shell py-16">
        <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground" data-aos="zoom-in">
          <div className="p-10 sm:p-16">
            <p className="text-sm font-medium uppercase tracking-wider opacity-80">Limited time</p>
            <h2 className="mt-2 max-w-lg font-display text-3xl font-semibold sm:text-4xl">
              Up to 40% off seasonal picks
            </h2>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link to="/products?onSale=true">Shop the sale <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-shell pb-16">
        <div className="mb-8 flex items-end justify-between" data-aos="fade-up">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">New arrivals</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fresh additions to the catalog</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/products?sortBy=newest">See all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-aos="fade-up" data-aos-delay="100">
          {productsLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)
            : newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-muted/40 py-16">
          <div className="container-shell">
            <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl" data-aos="fade-up">What our customers say</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3" data-aos="fade-up" data-aos-delay="100">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border bg-card p-6">
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed">“{t.content}”</blockquote>
                  <figcaption className="mt-4 text-sm font-medium">
                    {t.author}
                    {t.role && <span className="block text-xs font-normal text-muted-foreground">{t.role}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="container-shell py-16">
        <div className="mx-auto max-w-xl text-center" data-aos="fade-up">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Stay in the loop</h2>
          <p className="mt-2 text-sm text-muted-foreground">Get offers, new arrivals and exclusive deals first.</p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return done ? (
    <p className="mt-4 text-sm font-medium text-success">Thanks — you’re subscribed!</p>
  ) : (
    <form
      className="mt-6 flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email.includes('@')) return;
        try {
          await fetch('/api/v1/content/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          setDone(true);
        } catch {
          /* ignore */
        }
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="h-11 flex-1 rounded-md border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" className="h-11">Subscribe</Button>
    </form>
  );
}
