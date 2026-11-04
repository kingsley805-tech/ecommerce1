import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiClient } from '@/lib/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    apiClient.post('/auth/verify-email', { token })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthShell title="Email verification">
      {status === 'loading' && <p className="text-sm text-muted-foreground">Verifying…</p>}
      {status === 'ok' && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-3 text-sm text-muted-foreground">Your email has been verified.</p>
          <Button asChild className="mt-4"><Link to="/account">Go to my account</Link></Button>
        </div>
      )}
      {status === 'error' && (
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">This verification link is invalid or expired.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/login">Sign in</Link></Button>
        </div>
      )}
    </AuthShell>
  );
}
