import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiClient } from '@/lib/api';

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError('');
    try {
      await apiClient.post('/auth/reset-password', { token, password: values.password }, { csrf: true });
      setDone(true);
    } catch {
      setError('This reset link is invalid or has expired.');
    }
  };

  return (
    <AuthShell title="Set a new password">
      {done ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Your password has been updated.</p>
          <Button asChild className="mt-4"><Link to="/login">Sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><Label htmlFor="password">New password</Label><Input id="password" type="password" {...register('password')} /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}
