import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import type { AddressInput } from '@/types';

const schema = z.object({
  recipientName: z.string().min(1),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2).max(2).toUpperCase(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

interface Address extends AddressInput {
  id: string;
}

export default function AddressesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<Address[]>('/me/addresses').catch(() => [] as Address[]),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'GH', isDefault: false },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await apiClient.post('/me/addresses', values, { csrf: true });
      setAdding(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: 'Address saved', variant: 'success' });
    } catch {
      toast({ title: 'Could not save address', variant: 'error' });
    }
  };

  const remove = async (id: string) => {
    await apiClient.delete(`/me/addresses/${id}`).catch(() => null);
    await queryClient.invalidateQueries({ queryKey: ['addresses'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved addresses</h3>
        <Button variant="outline" size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      {adding && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3 rounded-xl border p-5">
          <div><Label>Recipient name</Label><Input {...form.register('recipientName')} /></div>
          <div><Label>Phone</Label><Input {...form.register('phone')} /></div>
          <div><Label>Street address</Label><Input {...form.register('line1')} /></div>
          <div><Label>Apartment (optional)</Label><Input {...form.register('line2')} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>City</Label><Input {...form.register('city')} /></div>
            <div><Label>Region</Label><Input {...form.register('region')} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Postal code</Label><Input {...form.register('postalCode')} /></div>
            <div><Label>Country</Label><Input {...form.register('country')} maxLength={2} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isDefault')} className="h-4 w-4" /> Set as default
          </label>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(addresses ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <button onClick={() => void remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove address"><Trash2 className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 font-medium">{a.recipientName}</p>
            <p className="text-sm text-muted-foreground">{a.line1}, {a.city}, {a.country}</p>
            {a.isDefault && <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">Default</span>}
          </div>
        ))}
        {(addresses ?? []).length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
        )}
      </div>
    </div>
  );
}
