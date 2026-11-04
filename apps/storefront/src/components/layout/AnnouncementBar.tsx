import { useEffect, useState } from 'react';
import { MoveRight } from 'lucide-react';
import { useHomepage } from '@/lib/queries';

export function AnnouncementBar() {
  const { data } = useHomepage();
  const [message, setMessage] = useState('Free delivery on orders over ₵500');
  const [href, setHref] = useState('/products');

  useEffect(() => {
    const promo = data?.sections?.find((s) => s.type === 'PROMOTIONAL');
    if (promo?.subtitle) setMessage(promo.subtitle);
    if (promo?.title) setMessage(promo.title);
    if (promo?.config && typeof promo.config === 'object') {
      const cfg = promo.config as { href?: string };
      if (cfg.href) setHref(cfg.href);
    }
  }, [data]);

  return (
    <div className="bg-foreground text-background">
      <a href={href} className="container-shell flex h-10 items-center justify-center gap-2 text-xs font-medium sm:text-sm">
        <span className="truncate">{message}</span>
        <MoveRight className="h-3.5 w-3.5 shrink-0" />
      </a>
    </div>
  );
}
