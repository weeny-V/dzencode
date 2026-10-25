import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { attachRealtime } from './realtime.js';
import { formatAddress } from './shared/address.js';
import { createPool } from './shared/db/pool.js';

const config = loadConfig();
const { app, auth } = createApp({ ...config, pool: createPool(config.db) });

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) throw error;
  console.info(`API listening on ${formatAddress(server.address())}`);
});
attachRealtime(server, { clientOrigin: config.clientOrigin, auth });
