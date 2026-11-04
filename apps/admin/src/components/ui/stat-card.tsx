import { cn } from '@/lib/utils';
import { Card } from './card';

export function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon?: React.ElementType; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {sub && <p className={cn('mt-1 text-xs', trend === 'up' && 'text-success', trend === 'down' && 'text-destructive', !trend && 'text-muted-foreground')}>{sub}</p>}
        </div>
        {Icon && <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>}
      </div>
    </Card>
  );
}
