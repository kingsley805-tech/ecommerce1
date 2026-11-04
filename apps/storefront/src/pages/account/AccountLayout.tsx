import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Heart, LogOut, MapPin, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const links = [
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
];

export default function AccountLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/account" replace />;

  return (
    <div className="container-shell py-10">
      <h1 className="font-display text-3xl font-semibold">My account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user.fullName}</p>
      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground')}
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </aside>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
