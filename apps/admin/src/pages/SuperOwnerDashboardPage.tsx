import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/hooks/useAuth';

export default function SuperOwnerDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => void logout().then(() => navigate('/super-owner/login'));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Super-owner panel"
        description="Platform owner access"
        actions={<Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" />Logout</Button>}
      />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-base font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-base font-semibold">{user?.fullName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">SUPER_ADMIN</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold"><LayoutDashboard className="h-4 w-4" /> Overview</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Full platform access confirmed. You are signed in as the platform owner.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4" /> Store management</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the store catalog, orders, customers, and settings from the store admin panel.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/admin/dashboard">Go to store admin <LayoutDashboard className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
