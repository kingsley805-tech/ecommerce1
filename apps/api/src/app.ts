import { createRequire } from 'node:module';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
const require = createRequire(import.meta.url);

// Forward rejected promises from async route handlers to the error handler
// (Express 4 does not do this automatically). Mirrors express-async-errors.
const Layer = require('express/lib/router/layer') as { prototype: { handle_request: (...args: never[]) => unknown } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Layer.prototype.handle_request = function (this: any, req: unknown, res: unknown, next: NextFunction) {
  const fn = this.handle as (q: unknown, s: unknown, n: NextFunction) => unknown;
  if (fn.length > 3) return next();
  try {
    const returnValue = fn(req, res, next);
    if (returnValue && typeof (returnValue as Promise<unknown>).catch === 'function') {
      (returnValue as Promise<unknown>).catch(next);
    }
  } catch (err) {
    next(err as Error);
  }
};
process.stdout.write('[async-errors] Layer.handle_request patched\n');
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env, isProduction } from './config/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/requestContext';
import { globalLimiter } from './middleware/rateLimit';
import { optionalAuth } from './middleware/auth';
import { notFoundHandler, errorHandler } from './lib/errors';

import { authRouter } from './modules/auth/auth.routes';
import { productsRouter, adminProductsRouter } from './modules/products/products.routes';
import { brandsRouter, adminBrandsRouter } from './modules/brands/brands.routes';
import { categoriesRouter, adminCategoriesRouter } from './modules/categories/categories.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { checkoutRouter } from './modules/checkout/checkout.routes';
import { contentRouter, adminContentRouter } from './modules/content/content.routes';
import { adminInventoryRouter } from './modules/inventory/inventory.routes';
import { ordersRouter, adminOrdersRouter } from './modules/orders/orders.routes';
import { paymentsRouter, adminPaymentsRouter, webhooksRouter } from './modules/payments/payments.routes';
import { adminRefundsRouter } from './modules/refunds/refunds.routes';
import { returnsRouter, adminReturnsRouter } from './modules/returns/returns.routes';
import { reviewsRouter, adminReviewsRouter } from './modules/reviews/reviews.routes';
import { searchRouter } from './modules/search/search.routes';
import { wishlistRouter } from './modules/wishlist/wishlist.routes';
import { adminReportsRouter } from './modules/reports/reports.routes';
import { adminCustomersRouter } from './modules/customers/customers.routes';
import { shippingRouter, adminShippingRouter } from './modules/shipping/shipping.routes';
import { adminPromotionsRouter } from './modules/promotions/promotions.routes';
import { addressesRouter } from './modules/addresses/addresses.routes';
import { adminSettingsRouter } from './modules/settings/settings.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = [env.STOREFRONT_URL, env.ADMIN_URL, env.API_URL];
        if (!origin || allowed.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  );

  app.use(compression());
  app.use(cookieParser(env.JWT_COOKIE_SECRET));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (req.path.startsWith('/api/v1')) {
        logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: res.getHeader('x-response-time') }, 'http');
      }
    });
    next();
  });

  app.use('/uploads', express.static('uploads'));

  app.get('/healthz', (_req, res) => {
    return res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
  });

  // Public + auth routes
  app.use('/api/v1/auth', authRouter);
  app.use(optionalAuth);

  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/brands', brandsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/checkout', checkoutRouter);
  app.use('/api/v1/content', contentRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/returns', returnsRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/shipping', shippingRouter);
  app.use('/api/v1/me/addresses', addressesRouter);
  app.use('/api/v1/webhooks/payments', webhooksRouter);

  // Admin routes (requireAuth is applied per-router)
  app.use('/api/v1/admin/products', adminProductsRouter);
  app.use('/api/v1/admin/brands', adminBrandsRouter);
  app.use('/api/v1/admin/categories', adminCategoriesRouter);
  app.use('/api/v1/admin/content', adminContentRouter);
  app.use('/api/v1/admin/inventory', adminInventoryRouter);
  app.use('/api/v1/admin/orders', adminOrdersRouter);
  app.use('/api/v1/admin/payments', adminPaymentsRouter);
  app.use('/api/v1/admin/refunds', adminRefundsRouter);
  app.use('/api/v1/admin/returns', adminReturnsRouter);
  app.use('/api/v1/admin/reviews', adminReviewsRouter);
  app.use('/api/v1/admin/customers', adminCustomersRouter);
  app.use('/api/v1/admin/reports', adminReportsRouter);
  app.use('/api/v1/admin/shipping', adminShippingRouter);
  app.use('/api/v1/admin/promotions', adminPromotionsRouter);
  app.use('/api/v1/admin/settings', adminSettingsRouter);
  app.use('/api/v1/admin/uploads', uploadsRouter);

  app.use(globalLimiter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
