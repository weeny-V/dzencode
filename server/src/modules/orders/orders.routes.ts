import { Router } from 'express';

import { parseId } from '../../shared/validation.js';
import { parseOrderInput } from './orders.schemas.js';
import type { OrdersService } from './orders.service.js';

export const createOrdersRouter = (service: OrdersService) => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const order = await service.create(parseOrderInput(req.body));
    res.status(201).json(order);
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(204).end();
  });

  return router;
};
