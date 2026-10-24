import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { formatAddress } from './shared/address.js';
import { createPool } from './shared/db/pool.js';

const config = loadConfig();
const app = createApp({ clientOrigin: config.clientOrigin, pool: createPool(config.db) });

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) throw error;
  console.info(`API listening on ${formatAddress(server.address())}`);
});
