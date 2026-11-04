import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Layout } from './components/layout/Layout';
import { CartDrawer } from './components/cart/CartDrawer';
import { Loader } from './components/ui/loader';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const MyOrdersPage = lazy(() => import('./pages/account/MyOrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const WishlistPage = lazy(() => import('./pages/account/WishlistPage'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function AOSInitializer() {
  const { pathname } = useLocation();
  useEffect(() => {
    AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic', offset: 80 });
    AOS.refreshHard();
  }, [pathname]);
  return null;
}

export function App() {
  const { user, refreshUser } = useAuth();
  const { mergeGuest } = useCart();

  useEffect(() => {
    if (user) {
      void mergeGuest();
      void refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <>
      <ScrollToTop />
      <AOSInitializer />
      <CartDrawer />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/order-tracking" element={<OrderTrackingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<MyOrdersPage />} />
              <Route path="orders" element={<MyOrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
            </Route>
            <Route path="/:slug" element={<ContentPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
