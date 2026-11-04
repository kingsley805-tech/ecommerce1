import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-shell flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="ModernCommerce logo" className="h-14 w-auto" />
            </Link>
            <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
