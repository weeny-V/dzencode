import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import type { Config } from './config.js';

export const createApp = ({ clientOrigin }: Pick<Config, 'clientOrigin'>) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(onError);

  return app;
};
