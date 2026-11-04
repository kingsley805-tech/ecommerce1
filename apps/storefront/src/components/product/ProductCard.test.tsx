import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import type { ProductListItem } from '@/types';

const mockAddItem = vi.fn();

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({ addItem: mockAddItem, cart: { items: [], itemCount: 0 } }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const product: ProductListItem = {
  id: 'p1',
  slug: 'test-product',
  name: 'Test Product',
  type: 'SIMPLE',
  price: '99.00',
  compareAtPrice: '129.00',
  salePrice: null,
  ratingAvg: '4.5',
  ratingCount: 12,
  soldCount: 5,
  featured: false,
  image: 'https://example.com/img.jpg',
  brandName: 'Acme',
  categories: [],
  discountPercent: 23,
};

describe('ProductCard', () => {
  it('renders product name, brand and discounted price', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('₵99.00')).toBeInTheDocument();
    expect(screen.getByText(/₵129\.00/)).toBeInTheDocument();
    expect(screen.getByText('-23%')).toBeInTheDocument();
  });

  it('adds to cart on quick-add click', () => {
    mockAddItem.mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('Add to cart'));
    expect(mockAddItem).toHaveBeenCalledWith('p1', null, 1);
  });
});
