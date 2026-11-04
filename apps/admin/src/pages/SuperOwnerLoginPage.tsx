import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function SuperOwnerLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.role !== 'SUPER_ADMIN') {
        setError('This account is not authorized for the super-owner panel');
        await logout();
        return;
      }
      navigate('/super-owner');
    } catch {
      setError('Invalid credentials or insufficient permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground font-bold text-background">S</div>
          <h1 className="mt-4 text-xl font-semibold">Super-owner sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform owner access — Modern Commerce</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="so-email">Email</Label><Input id="so-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="so-password">Password</Label><Input id="so-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Store admin? <Link to="/admin/login" className="font-medium text-primary hover:underline">Sign in as admin</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
