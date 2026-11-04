import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async (values: z.infer<typeof profileSchema>) => {
    try {
      await apiClient.patch('/auth/me', values, { csrf: true });
      await refreshUser();
      toast({ title: 'Profile updated', variant: 'success' });
    } catch {
      toast({ title: 'Could not update profile', variant: 'error' });
    }
  };

  const changePassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await apiClient.post('/auth/change-password', values, { csrf: true });
      passwordForm.reset();
      toast({ title: 'Password changed', variant: 'success' });
    } catch {
      toast({ title: 'Could not change password', variant: 'error' });
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'profile' ? 'secondary' : 'ghost'} onClick={() => setTab('profile')}>Profile</Button>
        <Button variant={tab === 'password' ? 'secondary' : 'ghost'} onClick={() => setTab('password')}>Password</Button>
      </div>

      {tab === 'profile' && (
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4 rounded-xl border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>First name</Label><Input {...profileForm.register('firstName')} /></div>
            <div><Label>Last name</Label><Input {...profileForm.register('lastName')} /></div>
          </div>
          <div><Label>Email</Label><Input value={user?.email} disabled /></div>
          <div><Label>Phone</Label><Input {...profileForm.register('phone')} /></div>
          <Button type="submit">Save changes</Button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4 rounded-xl border p-5">
          <div><Label>Current password</Label><Input type="password" {...passwordForm.register('currentPassword')} /></div>
          <div><Label>New password</Label><Input type="password" {...passwordForm.register('newPassword')} /></div>
          {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
          <Button type="submit">Update password</Button>
        </form>
      )}
    </div>
  );
}
