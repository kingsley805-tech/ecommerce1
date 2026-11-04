import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api';
import type { CategoryFlat, HomepageSection, Paged, ProductDetail, ProductListItem, ShippingMethod } from '@/types';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  rating?: number;
  sortBy?: string;
  view?: string;
}

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'categories';
const HOME_KEY = 'homepage';

export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () =>
      apiClient.get<Paged<ProductListItem>>('/products', {
        query: {
          ...params,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          inStock: params.inStock ? 'true' : undefined,
          onSale: params.onSale ? 'true' : undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, slug],
    queryFn: () => apiClient.get<ProductDetail>(`/products/${slug}`),
    enabled: !!slug,
  });
}

export function useRelatedProducts(id: string) {
  return useQuery({
    queryKey: ['related', id],
    queryFn: () => apiClient.get<ProductListItem[]>(`/products/${id}/related`),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: () => apiClient.get<CategoryFlat[]>('/categories'),
  });
}

export function useHomepage() {
  return useQuery({
    queryKey: [HOME_KEY],
    queryFn: async () => {
      const data = await apiClient.get<{
        sections: HomepageSection[];
        bestSellers: ProductListItem[];
        newArrivals: ProductListItem[];
        categories: CategoryFlat[];
        testimonials: { id: string; author: string; role?: string | null; content: string; rating: number }[];
      }>('/content/homepage');
      return data;
    },
  });
}

export function useShippingMethods(country: string) {
  return useQuery({
    queryKey: ['shipping-methods', country],
    queryFn: () => apiClient.get<ShippingMethod[]>(`/shipping/methods?country=${country}`),
    enabled: !!country,
  });
}

export function useContentPage(slug: string) {
  return useQuery({
    queryKey: ['page', slug],
    queryFn: () => apiClient.get<{ id: string; slug: string; title: string; body: string }>(`/content/pages/${slug}`),
    enabled: !!slug,
  });
}
