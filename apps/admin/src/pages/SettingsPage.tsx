import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [store, setStore] = useState({ name: 'Modern Commerce', currency: 'GHS', currencySymbol: '₵', timezone: 'Africa/Accra', email: 'support@example.com', phone: '+233 00 000 0000', address: 'Accra, Ghana' });

  const save = async () => {
    try {
      await apiClient.put('/admin/settings', { key: 'store', value: store });
      toast({ title: 'Settings saved', variant: 'success' });
    } catch {
      toast({ title: 'Could not save settings', variant: 'error' });
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Store configuration" />
      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Store details</h3>
        <div className="space-y-4">
          <div><Label>Store name</Label><Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Currency</Label><Input value={store.currency} onChange={(e) => setStore({ ...store, currency: e.target.value })} /></div>
            <div><Label>Currency symbol</Label><Input value={store.currencySymbol} onChange={(e) => setStore({ ...store, currencySymbol: e.target.value })} /></div>
          </div>
          <div><Label>Timezone</Label><Input value={store.timezone} onChange={(e) => setStore({ ...store, timezone: e.target.value })} /></div>
          <div><Label>Support email</Label><Input value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} /></div>
          <Button onClick={() => void save()}>Save settings</Button>
        </div>
      </Card>
    </div>
  );
}
