import { Router } from 'express';

import type { WarehousesService } from './warehouses.service.js';

export const createWarehousesRouter = (service: WarehousesService) => {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });
  return router;
};
