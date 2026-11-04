import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters').regex(/[a-z]/, 'Lowercase letter').regex(/[A-Z]/, 'Uppercase letter').regex(/[0-9]/, 'Number'),
  phone: z.string().optional(),
  newsletter: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError('');
    try {
      await registerUser(values);
      navigate('/account');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create account');
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join Modern Commerce for a faster checkout">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="firstName">First name</Label><Input id="firstName" {...register('firstName')} /></div>
          <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" {...register('lastName')} /></div>
        </div>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register('email')} /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" type="password" {...register('password')} /></div>
        <div><Label htmlFor="phone">Phone (optional)</Label><Input id="phone" {...register('phone')} /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('newsletter')} className="h-4 w-4" /> I'd like to receive offers and news
        </label>
        {Object.values(formState.errors).length > 0 && (
          <p className="text-xs text-destructive">{Object.values(formState.errors)[0]?.message}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
