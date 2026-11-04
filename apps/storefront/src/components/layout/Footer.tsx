import { Link } from 'react-router-dom';
import { Twitter, Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';

const shopLinks = [
  { label: 'All products', href: '/products' },
  { label: 'Electronics', href: '/products?category=electronics' },
  { label: 'Fashion', href: '/products?category=fashion' },
  { label: 'Home & Living', href: '/products?category=home-living' },
  { label: 'Outdoor', href: '/products?category=outdoor' },
];

const infoLinks = [
  { label: 'About us', href: '/about' },
  { label: 'Shipping policy', href: '/shipping-policy' },
  { label: 'Returns & refunds', href: '/returns-refunds' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="ModernCommerce logo" className="h-14 w-auto rounded-xl" />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A curated marketplace for premium products, thoughtfully sourced and delivered with care.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="#" aria-label="Twitter" className="rounded-full border p-2 text-muted-foreground hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="rounded-full border p-2 text-muted-foreground hover:text-foreground"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Facebook" className="rounded-full border p-2 text-muted-foreground hover:text-foreground"><Facebook className="h-4 w-4" /></a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Shop</h3>
          <ul className="mt-4 space-y-2">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Information</h3>
          <ul className="mt-4 space-y-2">
            {infoLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Accra, Ghana</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />+233 00 000 0000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" />support@example.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container-shell flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Modern Commerce. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms-conditions" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
