import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  meta,
  loading,
  onPageChange,
  emptyText = 'No records found',
}: {
  columns: Column<T>[];
  data: T[];
  meta?: PaginationMeta;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  emptyText?: string;
}) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-3 font-medium text-muted-foreground', c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3"><Skeleton className="h-4" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">{emptyText}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3', c.className)}>{c.cell(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPrev} onClick={() => onPageChange?.(meta.page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => onPageChange?.(meta.page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
