import { Router } from 'express';

import type { UsersService } from './users.service.js';

export const createUsersRouter = (service: UsersService) => {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });
  return router;
};
