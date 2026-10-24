import { Router } from 'express';

import type { ProductTypesService } from './productTypes.service.js';

export const createProductTypesRouter = (service: ProductTypesService) => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });

  return router;
};
