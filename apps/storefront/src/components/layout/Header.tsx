import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X, ChevronDown, LogOut, Package, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function Header() {
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { data: categories } = useCategories();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<{ slug: string; name: string; image?: string | null }[]>([]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocus(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length >= 2) {
        void fetch(`/api/v1/search/suggest?q=${encodeURIComponent(query)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => setSuggestions(d?.data ?? []))
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchFocus(false);
  };

  const topLevel = (categories ?? []).filter((c) => !c.parentId);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    cn('text-sm font-medium transition-colors hover:text-foreground', isActive ? 'text-foreground' : 'text-muted-foreground');

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="ModernCommerce logo" className="h-12 w-auto rounded-xl" />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {topLevel.slice(0, 5).map((cat) => (
            <div key={cat.id} className="group relative">
              <NavLink to={`/products?category=${cat.slug}`} className={navLink}>
                <span className="inline-flex items-center gap-1">{cat.name}<ChevronDown className="h-3.5 w-3.5" /></span>
              </NavLink>
              {cat.children && cat.children.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 min-w-[200px] rounded-lg border bg-popover p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  {cat.children.map((child) => (
                    <Link key={child.id} to={`/products?category=${child.slug}`} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <div ref={searchRef} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch(e)}
              placeholder="Search products…"
              className="w-56 pl-9 lg:w-72"
              aria-label="Search products"
            />
            {searchFocus && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg border bg-popover shadow-lg">
                {suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => navigate(`/products/${s.slug}`)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {s.image && <img src={s.image} alt="" className="h-8 w-8 rounded object-cover" />}
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/search')} aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => navigate('/wishlist')} aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.fullName}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account/orders')}><Package className="mr-2" />Orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/account/profile')}><User className="mr-2" />Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/account/addresses')}><MapPin className="mr-2" />Addresses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/wishlist')}><Heart className="mr-2" />Wishlist</DropdownMenuItem>
                {user.role && user.role !== 'CUSTOMER' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => (window.location.href = '/admin')}><Settings className="mr-2" />Admin</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout().then(() => navigate('/'))}><LogOut className="mr-2" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="hidden gap-2 sm:inline-flex" onClick={() => navigate('/login')}>
              <User className="h-4 w-4" /> Sign in
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => navigate('/cart')} aria-label="Cart" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cart?.itemCount > 0 && (
              <Badge variant="default" className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]">
                {cart?.itemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-display text-lg font-semibold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="mt-4 flex flex-col gap-1">
              <NavLink to="/products" className="rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => setMobileOpen(false)}>
                Shop all
              </NavLink>
              {topLevel.map((cat) => (
                <div key={cat.id}>
                  <NavLink
                    to={`/products?category=${cat.slug}`}
                    className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat.name}
                  </NavLink>
                  {cat.children?.map((child) => (
                    <NavLink
                      key={child.id}
                      to={`/products?category=${child.slug}`}
                      className="block rounded-md py-1.5 pl-7 pr-3 text-sm text-muted-foreground hover:bg-accent"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.name}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="mt-6 border-t pt-4">
              {user ? (
                <div className="flex flex-col gap-1">
                  <span className="px-3 text-sm text-muted-foreground">{user.fullName}</span>
                  <Button variant="ghost" className="justify-start" onClick={() => { setMobileOpen(false); navigate('/account/orders'); }}>My orders</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => { setMobileOpen(false); navigate('/account/profile'); }}>Profile</Button>
                  <Button variant="ghost" className="justify-start" onClick={() => void logout().then(() => setMobileOpen(false))}>Sign out</Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => { setMobileOpen(false); navigate('/login'); }}>Sign in</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
