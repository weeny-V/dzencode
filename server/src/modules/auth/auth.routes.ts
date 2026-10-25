import { type RequestHandler, Router } from 'express';

import { parseLogin, parseRegistration } from './auth.schemas.js';
import type { AuthContext, AuthService } from './auth.service.js';
import { createAuthThrottle } from './auth.throttle.js';

/** REST uses explicit bearer credentials; cookie authentication is reserved for Socket.io. */
export const requireAuthentication =
  (service: AuthService): RequestHandler =>
  async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    res.locals.auth = await service.authenticate(match?.[1]);
    next();
  };

export const createAuthRouter = (service: AuthService) => {
  const router = Router();
  const throttle = createAuthThrottle();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/register', async (req, res) => {
    throttle.check('register', req.socket.remoteAddress ?? 'unknown');
    res.status(201).json(await service.register(parseRegistration(req.body)));
  });
  router.post('/login', async (req, res) => {
    throttle.check('login', req.socket.remoteAddress ?? 'unknown');
    res.json(await service.login(parseLogin(req.body)));
  });
  router.use(requireAuthentication(service));
  router.get('/me', (_req, res) => {
    const context = res.locals.auth as AuthContext;
    res.json({ user: context.user, sessionId: context.sessionId });
  });
  router.post('/logout', async (_req, res) => {
    await service.logout(res.locals.auth as AuthContext);
    res.status(204).end();
  });
  return router;
};
