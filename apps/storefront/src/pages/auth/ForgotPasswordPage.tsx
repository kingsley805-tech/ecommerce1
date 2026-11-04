import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email }, { csrf: true });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link">
      {sent ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/login">Back to sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
