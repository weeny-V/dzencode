import cors from 'cors';
import express from 'express';

import type { Config } from './config.js';
import { createOrdersModule } from './modules/orders/index.js';
import { createProductTypesModule } from './modules/product-types/index.js';
import { createProductsModule } from './modules/products/index.js';
import type { Pool } from './shared/db/pool.js';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler.js';

interface AppDeps extends Pick<Config, 'clientOrigin'> {
  pool: Pool;
}

/** Composition root: the only place that knows how modules depend on each other. */
export const createApp = ({ clientOrigin, pool }: AppDeps) => {
  const productTypes = createProductTypesModule({ pool });
  const products = createProductsModule({ pool, productTypes: productTypes.service });
  const orders = createOrdersModule({ pool, products: products.service });

  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/orders', orders.router);
  app.use('/products', products.router);
  app.use('/product-types', productTypes.router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
