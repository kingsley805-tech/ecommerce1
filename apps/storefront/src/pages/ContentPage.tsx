import { useParams } from 'react-router-dom';
import { useContentPage } from '@/lib/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ContentPage() {
  const { slug = '' } = useParams();
  const { data, isLoading } = useContentPage(slug);

  if (isLoading) {
    return <div className="container-shell max-w-3xl py-12"><Skeleton className="h-10 w-1/2" /><Skeleton className="mt-6 h-64 w-full" /></div>;
  }

  if (!data) {
    return (
      <div className="container-shell py-20 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Button asChild className="mt-4"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-shell max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold">{data.title}</h1>
      <div className="prose prose-neutral mt-6 text-muted-foreground" dangerouslySetInnerHTML={{ __html: data.body }} />
    </div>
  );
}
