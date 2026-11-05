import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { Loader } from './components/ui/loader';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import SuperOwnerLoginPage from './pages/SuperOwnerLoginPage';
import SuperOwnerDashboardPage from './pages/SuperOwnerDashboardPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductFormPage from './pages/products/ProductFormPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import CustomersPage from './pages/CustomersPage';
import PromotionsPage from './pages/PromotionsPage';
import ShippingPage from './pages/ShippingPage';
import PaymentsPage from './pages/PaymentsPage';
import ReturnsPage from './pages/ReturnsPage';
import ReviewsPage from './pages/ReviewsPage';
import ContentPage from './pages/ContentPage';
import SettingsPage from './pages/SettingsPage';

function RequireSuperOwner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user || user.role !== 'SUPER_ADMIN') return <Navigate to="/super-owner/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/super-owner/login" element={<SuperOwnerLoginPage />} />
        <Route
          path="/super-owner"
          element={
            <RequireSuperOwner>
              <SuperOwnerDashboardPage />
            </RequireSuperOwner>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="shipping" element={<ShippingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
