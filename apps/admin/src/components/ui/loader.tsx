import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
