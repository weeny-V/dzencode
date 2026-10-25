import { Router } from 'express';

import { parseInventoryCurrency } from './statistics.schemas.js';
import type { StatisticsService } from './statistics.service.js';

export const createStatisticsRouter = (service: StatisticsService) => {
  const router = Router();
  router.get('/inventory', async (req, res) => {
    res.json(await service.inventory(parseInventoryCurrency(req.query.currency)));
  });
  return router;
};
