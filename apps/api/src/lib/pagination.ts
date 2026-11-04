import type { PaginationMeta } from '@commerce/shared-types';

export interface Paged<T> {
  items: T[];
  meta: PaginationMeta;
}

export function pageParams(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize, take: safeSize };
}

export function meta(total: number, page: number, pageSize: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function pageResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paged<T> {
  return { items, meta: meta(total, page, pageSize) };
}
