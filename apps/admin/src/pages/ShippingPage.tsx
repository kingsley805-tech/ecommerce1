import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/utils';

interface Method { id: string; name: string; type: string; price: string | null; estimatedMinDays?: number | null; estimatedMaxDays?: number | null; isActive: boolean; }
interface Zone { id: string; name: string; countries: string[]; regions: string[]; methods: Method[]; }

export default function ShippingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: zones } = useQuery({ queryKey: ['shipping'], queryFn: () => apiClient.get<Zone[]>('/admin/shipping/zones') });

  const [newMethod, setNewMethod] = useState<{ zoneId: string; name: string; price: string; daysMin: string; daysMax: string } | null>(null);
  const [newZoneName, setNewZoneName] = useState('');

  const addZone = async () => {
    if (!newZoneName) return;
    await apiClient.post('/admin/shipping/zones', { name: newZoneName, countries: ['GH'], regions: [] });
    setNewZoneName('');
    await queryClient.invalidateQueries({ queryKey: ['shipping'] });
    toast({ title: 'Zone created', variant: 'success' });
  };

  const addMethod = async () => {
    if (!newMethod) return;
    await apiClient.post('/admin/shipping/methods', {
      zoneId: newMethod.zoneId,
      name: newMethod.name,
      type: 'FLAT_RATE',
      price: Number(newMethod.price) || 0,
      estimatedMinDays: newMethod.daysMin ? Number(newMethod.daysMin) : undefined,
      estimatedMaxDays: newMethod.daysMax ? Number(newMethod.daysMax) : undefined,
    });
    setNewMethod(null);
    await queryClient.invalidateQueries({ queryKey: ['shipping'] });
    toast({ title: 'Method added', variant: 'success' });
  };

  const removeMethod = async (id: string) => {
    await apiClient.delete(`/admin/shipping/methods/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['shipping'] });
  };

  return (
    <div>
      <PageHeader title="Shipping" description="Shipping zones and delivery methods" />
      <div className="mb-6 flex max-w-md gap-2">
        <Input placeholder="New zone name (e.g. Ghana)" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} />
        <Button onClick={() => void addZone()} disabled={!newZoneName}><Plus className="h-4 w-4" /> Add zone</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(zones ?? []).map((zone) => (
          <Card key={zone.id} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{zone.name}</h3>
              <Badge variant="secondary">{zone.countries.join(', ')}</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {zone.methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type.toLowerCase().replaceAll('_', ' ')}{m.estimatedMinDays ? ` · ${m.estimatedMinDays}–${m.estimatedMaxDays} days` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatPrice(Number(m.price))}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => void removeMethod(m.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {zone.methods.length === 0 && <p className="text-sm text-muted-foreground">No methods yet.</p>}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setNewMethod({ zoneId: zone.id, name: '', price: '', daysMin: '', daysMax: '' })}>
              <Plus className="h-3.5 w-3.5" /> Add method
            </Button>
            {newMethod?.zoneId === zone.id && (
              <div className="mt-3 space-y-2 rounded-lg border p-3">
                <Input placeholder="Method name (e.g. Standard)" value={newMethod.name} onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Price (₵)" type="number" value={newMethod.price} onChange={(e) => setNewMethod({ ...newMethod, price: e.target.value })} />
                  <Input placeholder="Min days" type="number" value={newMethod.daysMin} onChange={(e) => setNewMethod({ ...newMethod, daysMin: e.target.value })} />
                  <Input placeholder="Max days" type="number" value={newMethod.daysMax} onChange={(e) => setNewMethod({ ...newMethod, daysMax: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void addMethod()} disabled={!newMethod.name}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewMethod(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {(!zones || zones.length === 0) && <p className="text-muted-foreground">No shipping zones configured.</p>}
      </div>
    </div>
  );
}
