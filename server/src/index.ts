import { formatAddress } from './address.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) throw error;
  console.info(`API listening on ${formatAddress(server.address())}`);
});
