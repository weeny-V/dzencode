import cors from 'cors';
import express from 'express';

import type { Config } from './config.js';
import { createAuthModule } from './modules/auth/index.js';
import { createOrdersModule } from './modules/orders/index.js';
import { createProductTypesModule } from './modules/product-types/index.js';
import { createProductsModule } from './modules/products/index.js';
import { createUsersModule } from './modules/users/index.js';
import type { Pool } from './shared/db/pool.js';
import { withTransaction } from './shared/db/transaction.js';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler.js';

interface AppDeps extends Pick<Config, 'clientOrigin' | 'jwtSecret'> {
  pool: Pool;
}

/** Composition root: the only place that knows how modules depend on each other. */
export const createApp = ({ clientOrigin, jwtSecret, pool }: AppDeps) => {
  const users = createUsersModule({ pool });
  const auth = createAuthModule({
    pool,
    users: users.service,
    jwtSecret,
    transaction: (work) => withTransaction(pool, work),
  });
  const productTypes = createProductTypesModule({ pool });
  const products = createProductsModule({ pool, productTypes: productTypes.service });
  const orders = createOrdersModule({ pool, products: products.service });

  const app = express();

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/auth', auth.router);
  app.use('/users', auth.requireAuthentication, users.router);
  app.use('/orders', auth.requireAuthentication, orders.router);
  app.use('/products', auth.requireAuthentication, products.router);
  app.use('/product-types', auth.requireAuthentication, productTypes.router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, auth: auth.service };
};
