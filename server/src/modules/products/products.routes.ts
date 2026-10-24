import { Router } from 'express';

import { parseProductFilter, parseProductInput } from './products.schemas.js';
import type { ProductsService } from './products.service.js';

export const createProductsRouter = (service: ProductsService) => {
  const router = Router();

  // Optional filter by product type name: GET /products?type=Monitors
  router.get('/', async (req, res) => {
    res.json(await service.list(parseProductFilter(req.query)));
  });

  router.post('/', async (req, res) => {
    const product = await service.create(parseProductInput(req.body));
    res.status(201).json(product);
  });

  return router;
};
