import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="container-shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link to="/">Go home</Link></Button>
        <Button asChild variant="outline"><Link to="/products">Browse products</Link></Button>
      </div>
    </div>
  );
}
